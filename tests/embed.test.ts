import { describe, it, expect, vi } from "vitest";
import {
  validateEmbedUrl,
  parseWikipedia,
  parseGoogleMaps,
  parseEmbed,
} from "@/lib/graph/embed";
import type { ParseResult } from "@/lib/graph/embed";

const hangingFetch = (
  _input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> =>
  new Promise<Response>((_, reject) => {
    const signal = init?.signal;
    if (!signal) {
      throw new Error("hangingFetch requires an abort signal");
    }
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    signal.addEventListener("abort", () => reject(signal.reason), {
      once: true,
    });
  });

describe("validateEmbedUrl", () => {
  it("accepts public http/https URLs", () => {
    expect(validateEmbedUrl("https://example.com/article")).toBe(true);
    expect(validateEmbedUrl("http://en.wikipedia.org/wiki/Test")).toBe(true);
  });

  it("rejects non-http schemes", () => {
    expect(validateEmbedUrl("javascript:alert(1)")).toBe(false);
    expect(validateEmbedUrl("file:///etc/passwd")).toBe(false);
    expect(validateEmbedUrl("data:text/plain;base64,xx")).toBe(false);
  });

  it("rejects localhost and private hostnames", () => {
    expect(validateEmbedUrl("http://localhost:3000/x")).toBe(false);
    expect(validateEmbedUrl("http://foo.localhost/x")).toBe(false);
    expect(validateEmbedUrl("http://internal.corp/x")).toBe(false);
    expect(validateEmbedUrl("http://foo.local/x")).toBe(false);
  });

  it("rejects private/link-local IPs", () => {
    expect(validateEmbedUrl("http://10.0.0.1/x")).toBe(false);
    expect(validateEmbedUrl("http://127.0.0.1/x")).toBe(false);
    expect(validateEmbedUrl("http://169.254.169.254/latest/meta-data")).toBe(false);
    expect(validateEmbedUrl("http://192.168.1.1/x")).toBe(false);
    expect(validateEmbedUrl("http://[::1]/x")).toBe(false);
    expect(validateEmbedUrl("http://[fd00::1]/x")).toBe(false);
  });

  it("rejects RFC1918 private, CGNAT and reserved ranges", () => {
    expect(validateEmbedUrl("http://172.16.0.1/x")).toBe(false);
    expect(validateEmbedUrl("http://172.31.255.255/x")).toBe(false);
    expect(validateEmbedUrl("http://100.64.0.1/x")).toBe(false);
    expect(validateEmbedUrl("http://198.51.100.1/x")).toBe(false);
    expect(validateEmbedUrl("http://foo.internal/x")).toBe(false);
  });
});

describe("parseWikipedia", () => {
  it("maps REST summary to EmbedData", async () => {
    const mockRes = {
      ok: true,
      json: async () => ({
        title: "Potidaneia",
        extract: "A long extract about the village...",
        thumbnail: { source: "https://upload.wikimedia.org/thumb.jpg" },
      }),
    } as Response;
    const fetchImpl = vi.fn(async () => mockRes);
    const data = await parseWikipedia(
      "https://en.wikipedia.org/wiki/Potidaneia",
      fetchImpl as unknown as typeof fetch,
    );
    expect(data.kind).toBe("wikipedia");
    expect(data.title).toBe("Potidaneia");
    expect(data.thumbnail).toBe("https://upload.wikimedia.org/thumb.jpg");
    const called = (
      fetchImpl as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0][0] as string;
    expect(called).toContain("/api/rest_v1/page/summary/");
  });

  it("throws when the summary is not found", async () => {
    const mockRes = { ok: false, status: 404 } as Response;
    const fetchImpl = vi.fn(async () => mockRes);
    await expect(
      parseWikipedia(
        "https://en.wikipedia.org/wiki/Missing",
        fetchImpl as unknown as typeof fetch,
      ),
    ).rejects.toThrow();
  });
});

describe("parseGoogleMaps", () => {
  it("builds an embed iframe from q= param", async () => {
    const data = await parseGoogleMaps(
      "https://www.google.com/maps?q=Athens",
    );
    expect(data.kind).toBe("map");
    expect(data.embedHtml).toContain("output=embed");
    expect(data.embedHtml).toContain("<iframe");
  });
});

describe("parseEmbed", () => {
  it("rejects unsafe urls", async () => {
    const r = await parseEmbed("file:///etc/passwd");
    expect(r.ok).toBe(false);
  });

  it("routes google maps urls to map kind", async () => {
    const r = await parseEmbed("https://maps.app.goo.gl/abc123");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.kind).toBe("map");
  });

  it("returns Timed out when a wikipedia fetch hangs", async () => {
    const r = (await parseEmbed(
      "https://en.wikipedia.org/wiki/Some_Title",
      { fetchImpl: hangingFetch, timeoutMs: 50 },
    )) as Extract<ParseResult, { ok: false }>;
    expect(r.ok).toBe(false);
    expect(r.error).toBe("Timed out");
  });
});
