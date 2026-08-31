import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/graph/nodes/[id]/route";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  isAdminUid: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/admin", () => ({ isAdminUid: mocks.isAdminUid }));
vi.mock("@/lib/graph/db", () => ({ db: { select: mocks.select, update: mocks.update } }));

function mockSelectReturn(row: unknown) {
  mocks.select.mockReturnValue({
    from: () => ({
      where: () => ({ limit: () => row ? [row] : [] }),
    }),
  });
}
let lastSetArgs: unknown;
function mockUpdateReturn(rows: unknown[]) {
  mocks.update.mockReturnValue({
    set: (setArgs: unknown) => {
      lastSetArgs = setArgs;
      return { where: () => ({ returning: () => rows }) };
    },
  });
}

function patchReq(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

const doc = { type: "doc", content: [] };
const nodeRow = {
  id: "row-1",
  slug: "person-1",
  type: "person",
  label: "Anna",
  subtitle: "Weaver",
  description: "d",
  properties: {},
  status: "approved",
  privacy: "public",
  createdBy: "owner-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  documentContent: null,
};

describe("PATCH /api/graph/nodes/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    lastSetArgs = undefined;
  });

  it("returns 401 when not logged in", async () => {
    mocks.sessionUid.mockResolvedValue(null);
    const res = await PATCH(patchReq({ document_content: doc }), { params: Promise.resolve({ id: "person-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when node not found", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mockSelectReturn(null);
    const res = await PATCH(patchReq({ document_content: doc }), { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("returns 403 when caller is neither owner nor admin", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mockSelectReturn(nodeRow);
    mocks.isAdminUid.mockResolvedValue(false);
    const res = await PATCH(patchReq({ document_content: doc }), { params: Promise.resolve({ id: "person-1" }) });
    expect(res.status).toBe(403);
  });

  it("updates document_content when caller is the owner", async () => {
    mocks.sessionUid.mockResolvedValue("owner-1");
    mockSelectReturn(nodeRow);
    mocks.isAdminUid.mockResolvedValue(false);
    mockUpdateReturn([{ ...nodeRow, documentContent: doc }]);
    const res = await PATCH(patchReq({ document_content: doc }), { params: Promise.resolve({ id: "person-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.documentContent).toEqual(doc);
    expect(lastSetArgs).toEqual({ documentContent: doc, updatedAt: expect.any(Date) });
  });

  it("updates document_content when caller is an admin", async () => {
    mocks.sessionUid.mockResolvedValue("admin-1");
    mockSelectReturn(nodeRow);
    mocks.isAdminUid.mockResolvedValue(true);
    mockUpdateReturn([{ ...nodeRow, documentContent: doc }]);
    const res = await PATCH(patchReq({ document_content: doc }), { params: Promise.resolve({ id: "person-1" }) });
    expect(res.status).toBe(200);
  });

  it("returns 400 for an oversized document", async () => {
    mocks.sessionUid.mockResolvedValue("owner-1");
    const huge = { type: "doc", content: [{ type: "paragraph", text: "x".repeat(2_000_000) }] };
    const res = await PATCH(patchReq({ document_content: huge }), { params: Promise.resolve({ id: "person-1" }) });
    expect(res.status).toBe(400);
  });
});
