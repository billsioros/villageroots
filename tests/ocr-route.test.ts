import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  downloadScanObject: vi.fn(),
  deleteScanObject: vi.fn(),
}));
vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/ocr/storage", () => ({
  SCAN_BUCKET: "archive-scans",
  downloadScanObject: mocks.downloadScanObject,
  deleteScanObject: mocks.deleteScanObject,
}));

import { POST } from "@/app/api/ocr/route";

const OWN_PATH = "u-1/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg";
const EXTRACTION = {
  entities: [
    { name: "Nikos", type: "person", deceased: true },
    { name: "Kato Potamia", type: "toponym" },
  ],
  relationships: [{ source: "Nikos", target: "Kato Potamia", verb: "lived_at" }],
};

const mreq = (body: unknown) => ({ json: async () => body }) as Request;
const completion = (content: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubEnv("OPENROUTER_API_KEY", "test-key");
  vi.stubEnv("OPENROUTER_MODEL", "");
  mocks.sessionUid.mockReset().mockResolvedValue("u-1");
  mocks.downloadScanObject.mockReset().mockResolvedValue({
    data: new Blob(["fake-image-bytes"]),
    error: null,
  });
  mocks.deleteScanObject.mockReset().mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/ocr", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.sessionUid.mockResolvedValue(null);
    const res = await POST(mreq({ path: OWN_PATH }));
    expect(res.status).toBe(401);
    expect(mocks.downloadScanObject).not.toHaveBeenCalled();
    expect(mocks.deleteScanObject).not.toHaveBeenCalled();
  });

  it("returns 400 for paths outside the caller's folder", async () => {
    const res = await POST(mreq({ path: "someone-else/scan.jpg" }));
    expect(res.status).toBe(400);
    expect(mocks.downloadScanObject).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed bodies and bad extensions", async () => {
    expect((await POST(mreq({}))).status).toBe(400);
    expect((await POST(mreq({ path: "u-1/scan.pdf" }))).status).toBe(400);
  });

  it("rejects traversal-style paths outside the caller's folder", async () => {
    const res = await POST(mreq({ path: "u-1/../u-2/x.jpg" }));
    expect(res.status).toBe(400);
    expect(mocks.downloadScanObject).not.toHaveBeenCalled();
    expect(mocks.deleteScanObject).not.toHaveBeenCalled();
  });

  it("returns 404 when the object is missing", async () => {
    mocks.downloadScanObject.mockResolvedValue({ data: null, error: "not found" });
    const res = await POST(mreq({ path: OWN_PATH }));
    expect(res.status).toBe(404);
    expect(mocks.deleteScanObject).toHaveBeenCalledWith(OWN_PATH);
  });

  it("extracts drafts and always deletes the scan on success", async () => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(completion(JSON.stringify(EXTRACTION)));
    const res = await POST(mreq({ path: OWN_PATH }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nodes).toHaveLength(2);
    expect(body.edges).toEqual([
      expect.objectContaining({ verb: "lived_at", kind: "geo", source: body.nodes[0].id, target: body.nodes[1].id }),
    ]);
    expect(fetchSpy.mock.calls[0][0]).toBe("https://openrouter.ai/api/v1/chat/completions");
    const requestBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(requestBody.model).toBe("openrouter/free");
    expect(requestBody.response_format.json_schema.strict).toBe(true);
    expect(requestBody.provider).toEqual({ require_parameters: true });
    expect(mocks.deleteScanObject).toHaveBeenCalledWith(OWN_PATH);
  });

  it("tolerates fenced model output", async () => {
    fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(completion("```json\n" + JSON.stringify(EXTRACTION) + "\n```"));
    const res = await POST(mreq({ path: OWN_PATH }));
    expect(res.status).toBe(200);
    expect((await res.json()).nodes).toHaveLength(2);
  });

  it("returns 502 and still deletes when OpenRouter fails", async () => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("boom", { status: 500 }));
    const res = await POST(mreq({ path: OWN_PATH }));
    expect(res.status).toBe(502);
    expect(mocks.deleteScanObject).toHaveBeenCalledWith(OWN_PATH);
  });

  it("returns 502 and still deletes when content is unparseable", async () => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(completion("I could not read this"));
    const res = await POST(mreq({ path: OWN_PATH }));
    expect(res.status).toBe(502);
    expect(mocks.deleteScanObject).toHaveBeenCalledWith(OWN_PATH);
  });

  it("returns 503 when OPENROUTER_API_KEY is unset", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await POST(mreq({ path: OWN_PATH }));
    expect(res.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mocks.deleteScanObject).toHaveBeenCalledWith(OWN_PATH);
  });

  it("returns 502 and still deletes when OpenRouter returns non-JSON with 200", async () => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>oops</html>", { status: 200 }));
    const res = await POST(mreq({ path: OWN_PATH }));
    expect(res.status).toBe(502);
    expect(mocks.deleteScanObject).toHaveBeenCalledWith(OWN_PATH);
  });

  it("uses OPENROUTER_MODEL when configured", async () => {
    vi.stubEnv("OPENROUTER_MODEL", "google/gemini-2.0-flash-exp:free");
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(completion(JSON.stringify(EXTRACTION)));
    const res = await POST(mreq({ path: OWN_PATH }));
    expect(res.status).toBe(200);
    const requestBody = JSON.parse((fetchSpy.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(requestBody.model).toBe("google/gemini-2.0-flash-exp:free");
  });
});
