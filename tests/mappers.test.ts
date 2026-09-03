import { describe, it, expect } from "vitest";
import { nodeRowToGraph, edgeRowToGraph, toNodeRow, toEdgeRow } from "@/lib/graph/mappers";
import type { NodeRow, EdgeRow } from "@/drizzle/schema";

const nodeRow: NodeRow = {
  id: "uuid-1",
  slug: "p-nikolas",
  type: "person",
  label: "Nikolas Katsaris",
  subtitle: "1898-1978 · miller",
  description: "desc",
  documentContent: null,
  properties: { x: 10, y: 20 },
  status: "approved",
  privacy: "public",
  createdBy: "u1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const edgeRow: EdgeRow = {
  id: "uuid-2",
  slug: "e-nik-maria",
  sourceId: "uuid-a",
  targetId: "uuid-b",
  sourceSlug: "p-nikolas",
  targetSlug: "p-maria",
  type: "married_to",
  properties: {},
  status: "approved",
  createdBy: "u1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("nodeRowToGraph", () => {
  it("maps slug, type meta and properties", () => {
    const g = nodeRowToGraph(nodeRow);
    expect(g.id).toBe("p-nikolas");
    expect(g.type).toBe("person");
    expect(g.label).toBe("Nikolas Katsaris");
    expect(g.subtitle).toBe("1898-1978 · miller");
    expect(g.color).toBe("#e15a72");
    expect(g.mark).toBe("P");
    expect(g.x).toBe(10);
    expect(g.y).toBe(20);
    expect(g.status).toBe(nodeRow.status);
  });

  it("defaults x/y to 0 when properties lack them", () => {
    const g = nodeRowToGraph({ ...nodeRow, properties: {} });
    expect(g.x).toBe(0);
    expect(g.y).toBe(0);
  });
});

describe("edgeRowToGraph", () => {
  it("resolves endpoints from slugs and kind from verb", () => {
    const g = edgeRowToGraph(edgeRow);
    expect(g.id).toBe("e-nik-maria");
    expect(g.source).toBe("p-nikolas");
    expect(g.target).toBe("p-maria");
    expect(g.verb).toBe("married_to");
    expect(g.kind).toBe("social");
  });

  it("carries status from the row", () => {
    const g = edgeRowToGraph({ ...edgeRow, status: "pending" });
    expect(g.status).toBe("pending");
  });

  it("defaults status to approved when not overridden", () => {
    const g = edgeRowToGraph(edgeRow);
    expect(g.status).toBe("approved");
  });
});

describe("back-mappers", () => {
  it("toNodeRow round-trips a graph node", () => {
    const row = toNodeRow({
      id: "p-nikolas", type: "person", label: "Nikolas Katsaris",
      subtitle: "", description: "", color: "#e15a72", mark: "P", x: 10, y: 20,
    });
    expect(row.slug).toBe("p-nikolas");
    expect(row.properties).toEqual({ x: 10, y: 20 });
    expect(row.status).toBe("pending");
  });

  it("toEdgeRow keeps source/target slugs", () => {
    const row = toEdgeRow({
      id: "e-nik-maria", source: "p-nikolas", target: "p-maria",
      verb: "married_to", kind: "social",
    });
    expect(row.sourceSlug).toBe("p-nikolas");
    expect(row.targetSlug).toBe("p-maria");
    expect(row.type).toBe("married_to");
  });
});
