import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/me/export/route";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  dbSelect: vi.fn(),
}));

vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/db", () => ({
  db: { select: mocks.dbSelect },
}));
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return { ...actual, eq: vi.fn(() => "mock-eq") };
});
vi.mock("drizzle-orm/pg-core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm/pg-core")>();
  return { ...actual, alias: vi.fn((_table: unknown, name: string) => ({ name })) };
});
vi.mock("exceljs", () => {
  const worksheet = {
    columns: [] as unknown[],
    addRow: vi.fn(),
  };
  const workbook = {
    creator: "",
    created: null as Date | null,
    addWorksheet: vi.fn(() => worksheet),
    xlsx: { writeBuffer: vi.fn(async () => Buffer.from("mock-xlsx")) },
  };
  class MockWorkbook {
    constructor() {
      Object.assign(this, workbook);
    }
  }
  return {
    default: { Workbook: MockWorkbook },
    workbook,
    worksheet,
  };
});

beforeEach(() => {
  vi.resetAllMocks();
});

function nodesChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue(result),
    }),
  };
}

function edgesChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(result),
        }),
      }),
    }),
  };
}

describe("GET /api/me/export", () => {
  it("returns 401 when not logged in", async () => {
    mocks.sessionUid.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns an xlsx file with Nodes and Edges sheets", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.dbSelect
      .mockReturnValueOnce(nodesChain([{ slug: "a", type: "person", label: "Alice", subtitle: "", status: "approved", privacy: "public", createdAt: new Date(), updatedAt: new Date() }]))
      .mockReturnValueOnce(edgesChain([{ slug: "e1", sourceSlug: "src1", targetSlug: "tgt1", type: "married_to", status: "approved", createdAt: new Date(), updatedAt: new Date() }]));

    const res = await GET();
    expect(res.status).toBe(200);

    const contentType = res.headers.get("Content-Type");
    expect(contentType).toContain("spreadsheetml.sheet");

    const disposition = res.headers.get("Content-Disposition");
    expect(disposition).toContain("village-roots-");
    expect(disposition).toContain(".xlsx");
  });

  it("returns 500 on database errors", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.dbSelect.mockImplementation(() => {
      throw new Error("db failure");
    });

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to export data");
  });
});
