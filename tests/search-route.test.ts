import { describe, it, expect, vi, beforeEach } from "vitest";
import { type NextRequest } from "next/server";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

const pgDialect = new PgDialect();
const toSql = (sql: SQL) => pgDialect.sqlToQuery(sql).sql;

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  isAdminUid: vi.fn(),
  select: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  rows: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/admin", () => ({ isAdminUid: mocks.isAdminUid }));
vi.mock("@/lib/graph/db", () => ({ db: { select: mocks.select } }));

import { GET } from "@/app/api/graph/search/route";

const mreq = (q: string | null, limit?: string): NextRequest => {
  const url = new URL("http://localhost/api/graph/search");
  if (q !== null) url.searchParams.set("q", q);
  if (limit !== undefined) url.searchParams.set("limit", limit);
  return { url: url.toString() } as unknown as NextRequest;
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.rows = [];
  mocks.limit.mockResolvedValue(mocks.rows);
  mocks.orderBy.mockReturnValue({ limit: mocks.limit });
  mocks.where.mockReturnValue({ orderBy: mocks.orderBy });
  mocks.select.mockReturnValue({ from: () => ({ where: mocks.where }) });
  mocks.sessionUid.mockResolvedValue("user-1");
  mocks.isAdminUid.mockResolvedValue(false);
});

describe("GET /api/graph/search — validation & limits", () => {
  it("returns 400 for a query shorter than 2 characters", async () => {
    const res = await GET(mreq("a"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Query must be at least 2 characters" });
  });

  it("returns 400 for an empty/whitespace-only query", async () => {
    const res = await GET(mreq("   "));
    expect(res.status).toBe(400);
  });

  it("clamps the limit to 1..20 with a default of 8", async () => {
    await GET(mreq("mill"));
    expect(mocks.limit).toHaveBeenLastCalledWith(8);

    await GET(mreq("mill", "999"));
    expect(mocks.limit).toHaveBeenLastCalledWith(20);

    await GET(mreq("mill", "0"));
    expect(mocks.limit).toHaveBeenLastCalledWith(1);
  });

  it("does not call the db when the query is too short", async () => {
    await GET(mreq("a"));
    expect(mocks.select).not.toHaveBeenCalled();
  });
});

const row = (over: Partial<Record<string, unknown>> = {}) => ({
  id: "n1",
  label: "The Old Mill",
  subtitle: null,
  type: "landmark",
  privacy: "public",
  properties: { x: 1, y: 2 },
  createdBy: "user-1",
  rank: 0,
  ...over,
});

const seedRows = (...rowsList: Array<Record<string, unknown>>) => {
  mocks.rows = rowsList;
  mocks.limit.mockResolvedValue(rowsList);
};

describe("GET /api/graph/search — matching & ranking", () => {
  it("filters with one case-insensitive ILIKE substring predicate per query word", async () => {
    seedRows(row());
    const res = await GET(mreq("old mill"));
    expect(res.status).toBe(200);

    const whereSql = toSql(mocks.where.mock.calls[0][0] as SQL);
    expect(whereSql.toUpperCase()).toContain("ILIKE $1");
    expect(whereSql.toUpperCase()).toContain("ILIKE $2");
  });

  it("orders by the exact->prefix->substring rank ladder", async () => {
    seedRows(row());
    await GET(mreq("Mill"));
    const orderSql = toSql(mocks.orderBy.mock.calls[0][0] as SQL);
    expect(orderSql).toContain("CASE");
    expect(orderSql).toContain("THEN 0");
    expect(orderSql).toContain("lower(");
    expect((orderSql.match(/THEN \d|ELSE \d/g) ?? []).map((m) => m.replace(/(THEN|ELSE) /, "")))
      .toEqual(["0", "1", "2", "3", "4", "5"]);
  });

  it("returns rows mapped to the response shape, preserving the db order", async () => {
    seedRows(
      row({ id: "n2", label: "The Old Mill", rank: 1 }),
      row({ id: "n3", label: "Mill", rank: 0 }),
    );
    const res = await GET(mreq("mill"));
    const body = await res.json();
    expect(body.results).toEqual([
      { id: "n2", label: "The Old Mill", subtitle: null, type: "landmark", rank: 1 },
      { id: "n3", label: "Mill", subtitle: null, type: "landmark", rank: 0 },
    ]);
  });

  it("returns a single result for a node matching a substring fragment", async () => {
    seedRows(row({ id: "n1", label: "St George's church" }));
    const res = await GET(mreq("urch"));
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0].id).toBe("n1");
  });

  it("returns 500 with a fixed error message when the db query rejects", async () => {
    mocks.limit.mockRejectedValue(new Error("db exploded"));
    const res = await GET(mreq("mill"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Search failed" });
  });
});

describe("GET /api/graph/search — policy & masking", () => {
  it("includes the visibility policy in the where clause", async () => {
    seedRows(row());
    await GET(mreq("mill"));
    const whereSql = toSql(mocks.where.mock.calls[0][0] as SQL);
    expect(whereSql.toUpperCase()).toContain("STATUS");
    expect(whereSql.toUpperCase()).toContain("CREATED_BY");
  });

  it("masks a private living person's label and subtitle for non-owners", async () => {
    seedRows(row({
      id: "p1",
      type: "person",
      label: "Maria Papadopoulou",
      subtitle: "Village elder",
      privacy: "private",
      properties: { x: 0, y: 0, deceased: false },
      createdBy: "someone-else",
      rank: 0,
    }));
    const res = await GET(mreq("papadopoulou"));
    const body = await res.json();
    expect(body.results[0]).toEqual({
      id: "p1",
      label: "Living Person",
      subtitle: "",
      type: "person",
      rank: 0,
    });
  });

  it("does NOT mask a deceased private person", async () => {
    seedRows(row({
      id: "p2",
      type: "person",
      label: "Giorgos Zografos",
      subtitle: null,
      privacy: "private",
      properties: { x: 0, y: 0, deceased: true },
      createdBy: "someone-else",
      rank: 0,
    }));
    const res = await GET(mreq("zografos"));
    const body = await res.json();
    expect(body.results[0].label).toBe("Giorgos Zografos");
  });

it("does NOT mask a private living person for the owner", async () => {
    seedRows(row({
      id: "p3",
      type: "person",
      label: "Nikos Karalis",
      subtitle: null,
      privacy: "private",
      properties: { x: 0, y: 0, deceased: false },
      createdBy: "user-1",
      rank: 0,
    }));
    const body = await (await GET(mreq("karalis"))).json();
    expect(body.results[0].label).toBe("Nikos Karalis");
  });

  it("does NOT mask a private living person for an admin", async () => {
    mocks.sessionUid.mockResolvedValue("admin");
    mocks.isAdminUid.mockResolvedValue(true);
    seedRows(row({
      id: "p4",
      type: "person",
      label: "Eleni Douka",
      subtitle: null,
      privacy: "private",
      properties: { x: 0, y: 0, deceased: false },
      createdBy: "someone-else",
      rank: 0,
    }));
    const body = await (await GET(mreq("douka"))).json();
    expect(body.results[0].label).toBe("Eleni Douka");
  });
});
