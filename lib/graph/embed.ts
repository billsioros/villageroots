import { unfurl } from "unfurl.js";

export type EmbedKind = "wikipedia" | "map" | "generic";

export type EmbedData = {
  kind: EmbedKind;
  url: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  embedHtml?: string;
  width?: number;
  height?: number;
};

export type ParseResult =
  | { ok: true; data: EmbedData }
  | { ok: false; error: string };

export const EMBED_TIMEOUT_MS = 6000;
export const MAX_CONTENT = 64 * 1024;

const WIKI_HOSTS = /(^|\.)wikipedia\.org$/;
const MAPS_PATTERNS = [
  /^https:\/\/(www\.|)google\.com\/maps/i,
  /^https:\/\/maps\.app\.goo\.gl\//i,
  /^https:\/\/goo\.gl\/maps\//i,
];

function abortAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const err = new Error("Timed out");
      err.name = "AbortError";
      reject(err);
    }, ms);
  });
}

function isAbortError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const name = (e as { name?: unknown }).name;
  return name === "AbortError" || name === "TimeoutError";
}

export function validateEmbedUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".corp")
  ) {
    return false;
  }

  // Check for IP addresses
  const ipv4Match = hostname.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,
  );
  if (ipv4Match) {
    const octets = ipv4Match.slice(1).map(Number);
    // Reject non-canonical dotted-decimal (e.g. 0177.0.0.1)
    if (octets.some((o) => o > 255)) return false;
    // Rebuild canonical form to catch representations like 0177.0.0.1
    const canonical = octets.join(".");
    if (canonical !== hostname) return false;

    const [a, b] = octets;
    // Private/loopback: 10.x, 127.x, 169.254.x, 192.168.x
    if (a === 10 || a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 192 && b === 168) return false;
    // RFC1918 private: 172.16.0.0/12 (172.16.0.0 – 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return false;
    // CGNAT: 100.64.0.0/10 (100.64.0.0 – 100.127.255.255)
    if (a === 100 && b >= 64 && b <= 127) return false;
    // Reserved/documentation ranges
    if (a === 192 && (b === 0 || b === 2)) return false;
    if (a === 198 && b === 51) return false;
    if (a === 203 && b === 0) return false;
    // 0.0.0.0
    if (octets.every((o) => o === 0)) return false;
    // Multicast/reserved: >= 224.0.0.0
    if (a >= 224) return false;
    return true;
  }

  // IPv6
  if (hostname.startsWith("[") || hostname.includes(":")) {
    // Extract bare address from [...]
    const addr = hostname.replace(/^\[/, "").replace(/\]$/, "");
    if (addr === "::1") return false;
    // Unique local: fc00::/8 or fd00::/8
    if (addr.startsWith("fc") || addr.startsWith("fd")) return false;
    // Link-local: fe80::/10
    if (addr.startsWith("fe80")) return false;
  }

  return true;
}

export async function parseWikipedia(
  urlStr: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs?: number,
): Promise<EmbedData> {
  const url = new URL(urlStr);
  const segments = url.pathname.split("/");
  // Wikipedia URL: /wiki/Some_Title — segments[1] is "wiki", segments[2] is the title
  const rawTitle = segments[2] ?? "";
  // Handle subpages: take only the first path component after /wiki/
  const title = decodeURIComponent(rawTitle.split("/")[0]);

  const summaryUrl = `${url.protocol}//${url.host}/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetchImpl(summaryUrl, {
    signal: AbortSignal.timeout(timeoutMs ?? EMBED_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Wikipedia fetch failed: ${res.status}`);
  }
  const data = await res.json();

  const descriptionRaw = (data.extract ?? "").slice(0, MAX_CONTENT);
  return {
    kind: "wikipedia",
    url: urlStr,
    title: data.title ?? undefined,
    description: descriptionRaw || undefined,
    thumbnail: data.thumbnail?.source ?? undefined,
  };
}

export async function parseGoogleMaps(urlStr: string): Promise<EmbedData> {
  const url = new URL(urlStr);
  const q = url.searchParams.get("q") ?? urlStr;
  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
  return {
    kind: "map",
    url: urlStr,
    embedHtml: `<iframe src="${embedUrl}" width="100%" height="100%" style="border:0" loading="lazy" allowfullscreen></iframe>`,
    width: 480,
    height: 320,
  };
}

export async function parseWithUnfurl(
  urlStr: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs?: number,
): Promise<EmbedData> {
  const meta = await Promise.race([
    unfurl(urlStr, { fetch: fetchImpl as (url: string) => Promise<unknown> }),
    abortAfter(timeoutMs ?? EMBED_TIMEOUT_MS),
  ]);
  const title =
    meta.title ?? meta.open_graph?.title ?? meta.twitter_card?.title;
  const description =
    meta.description ?? meta.open_graph?.description ?? meta.twitter_card?.description;
  const thumbnail =
    meta.oEmbed?.thumbnails?.[0]?.url ??
    meta.open_graph?.images?.[0]?.url ??
    meta.twitter_card?.images?.[0]?.url;

  const result: EmbedData = {
    kind: "generic",
    url: urlStr,
  };
  if (title) result.title = title;
  if (description) result.description = description;
  if (thumbnail) result.thumbnail = thumbnail;
  return result;
}

export async function parseEmbed(
  urlStr: string,
  opts?: { fetchImpl?: typeof fetch; timeoutMs?: number },
): Promise<ParseResult> {
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const timeoutMs = opts?.timeoutMs;

  if (!validateEmbedUrl(urlStr)) {
    return { ok: false, error: "Invalid or unsafe URL" };
  }

  const isMap = MAPS_PATTERNS.some((p) => p.test(urlStr));
  if (isMap) {
    try {
      const data = await parseGoogleMaps(urlStr);
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  let hostname: string;
  try {
    hostname = new URL(urlStr).hostname;
  } catch {
    return { ok: false, error: "Invalid URL" };
  }

  if (WIKI_HOSTS.test(hostname)) {
    try {
      const data = await parseWikipedia(urlStr, fetchImpl, timeoutMs);
      return { ok: true, data };
    } catch (e) {
      if (isAbortError(e)) {
        return { ok: false, error: "Timed out" };
      }
      return { ok: false, error: (e as Error).message };
    }
  }

  // Generic unfurl
  try {
    const data = await parseWithUnfurl(urlStr, fetchImpl, timeoutMs);
    return { ok: true, data };
  } catch (e) {
    if (isAbortError(e)) {
      return { ok: false, error: "Timed out" };
    }
    return { ok: false, error: (e as Error).message };
  }
}
