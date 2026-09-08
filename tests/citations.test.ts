import { describe, it, expect } from "vitest";
import { parseCitations } from "@/lib/graph/citations";
import type { Citation } from "@/lib/graph/types";

const retrieved: Citation[] = [
  {
    label: "The Katsaris Lineage",
    nodeId: "l-katsaris",
    nodeType: "family",
    slug: "l-katsaris",
    similarity: 0.8,
    origin: "retrieved",
  },
  {
    label: "Nikolas Katsaris",
    nodeId: "n-nikolas",
    nodeType: "person",
    slug: "n-nikolas",
    similarity: 0.7,
    origin: "retrieved",
  },
  {
    label: "Yiannis Katsaris",
    nodeId: "n-yiannis",
    nodeType: "person",
    slug: "n-yiannis",
    similarity: 0.6,
    origin: "retrieved",
  },
];

const neighbors: Citation[] = [
  {
    label: "Marika",
    nodeId: "n-marika",
    nodeType: "person",
    slug: "n-marika",
    similarity: 0,
    origin: "neighbor",
  },
];

describe("parseCitations", () => {
  it("extracts citations from [Label](nodeId) links in first-use order", () => {
    const { text, citations } = parseCitations(
      "A family [The Katsaris Lineage](l-katsaris) and [Marika](n-marika).",
      { retrieved, neighbors },
    );
    expect(citations.map((c) => c.nodeId)).toEqual(["l-katsaris", "n-marika"]);
    expect(text).toBe("A family [1] and [2].");
  });

  it("reindexes <CITE:N> markers against the numbered retrieved list", () => {
    const { text, citations } = parseCitations(
      "The lineage gathered <CITE:1>. Nikolas <CITE:1> <CITE:2>.",
      { retrieved, neighbors },
    );
    expect(citations.map((c) => c.nodeId)).toEqual(["l-katsaris", "n-nikolas"]);
    expect(text).toBe("The lineage gathered [1]. Nikolas [1] [2].");
  });

  it("reindexes [N] markers against the numbered retrieved list", () => {
    const { text, citations } = parseCitations("Yiannis farmed lands [3].", {
      retrieved,
      neighbors,
    });
    expect(citations.map((c) => c.nodeId)).toEqual(["n-yiannis"]);
    expect(text).toBe("Yiannis farmed lands [1].");
  });

  it("keeps out-of-range CITE markers as plain numbers", () => {
    const { text, citations } = parseCitations("See <CITE:8>.", { retrieved, neighbors });
    expect(citations).toEqual([]);
    expect(text).toBe("See [8].");
  });

  it("leaves out-of-range bracket markers untouched", () => {
    const { text, citations } = parseCitations("See [9].", { retrieved, neighbors });
    expect(citations).toEqual([]);
    expect(text).toBe("See [9].");
  });

  it("keeps links to unknown ids as-is", () => {
    const { text, citations } = parseCitations("Talked to [Who?](made-up-id).", {
      retrieved,
      neighbors,
    });
    expect(citations).toEqual([]);
    expect(text).toBe("Talked to [Who?](made-up-id).");
  });

  it("unescapes HTML-escaped CITE markers before reindexing", () => {
    const { text, citations } = parseCitations(
      "&lt;CITE:1&gt; and &#x3C;CITE:2&#x3E; also &amp; not a marker.",
      { retrieved, neighbors },
    );
    expect(citations.map((c) => c.nodeId)).toEqual(["l-katsaris", "n-nikolas"]);
    expect(text).toBe("[1] and [2] also &amp; not a marker.");
  });

  it("converts every CITE marker in a full paragraph answer", () => {
    const five: Citation[] = Array.from({ length: 5 }, (_, i) => ({
      label: `Node ${i + 1}`,
      nodeId: `n-${i + 1}`,
      nodeType: "person",
      slug: `n-${i + 1}`,
      similarity: 0.5,
      origin: "retrieved" as const,
    }));
    const answer =
      "The Katsaris family is one of the founding lineages of Kalyvia <CITE:1>. Notable members include Stavros Katsaris <CITE:2>; Maria Katsari, who was the household head of Kalyvia and married to Nikolas Katsaris <CITE:3>; Nikolas Katsaris, who ran the village mill for half a century and ground wheat for every household in the hollow, turning nobody away even during hungry years <CITE:4>; and Yiannis Katsaris, a second-generation miller who was interviewed in 1989 <CITE:5>.";
    const { text, citations } = parseCitations(answer, { retrieved: five, neighbors: [] });
    expect(text).not.toContain("CITE");
    expect(citations).toHaveLength(5);
    expect(text).toContain("[1]");
  });
});