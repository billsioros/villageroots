import { NextRequest, NextResponse } from "next/server";
import { sessionUid } from "@/lib/graph/session";
import { embedText } from "@/lib/graph/embeddings";
import { matchNodesByVector, fetchOneHopNeighbors } from "@/lib/graph/combined-search";
import { synthesizeChat } from "@/lib/graph/chat-synthesis";
import { parseCitations, buildSubgraphFromPath } from "@/lib/graph/citations";
import type { Citation } from "@/lib/graph/types";

export async function POST(request: NextRequest) {
  const uid = await sessionUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let question: string;
  try {
    const body = (await request.json()) as { question?: unknown };
    if (typeof body.question !== "string" || body.question.trim().length === 0) {
      throw new Error("bad question");
    }
    question = body.question.trim();
  } catch {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  try {
    const queryEmbedding = await embedText(question);
    const matches = await matchNodesByVector(queryEmbedding, { matchCount: 5, threshold: 0.3 });

    if (matches.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find relevant content in the graph for that question.",
        citations: [],
      });
    }

    const nodeIds = matches.map((m) => m.nodeId);
    const hops = await fetchOneHopNeighbors(nodeIds);

    const retrieved: Citation[] = matches.map((m) => ({
      label: m.label,
      nodeId: m.nodeId,
      nodeType: m.nodeType,
      slug: m.nodeId,
      similarity: m.similarity,
      origin: "retrieved",
    }));

    const neighbors: Citation[] = [];
    for (const h of hops) {
      const isSource = nodeIds.includes(h.sourceId);
      const nid = isSource ? h.targetId : h.sourceId;
      if (nodeIds.includes(nid)) {
        continue;
      }
      neighbors.push({
        label: h.neighborLabel,
        nodeId: nid,
        nodeType: h.neighborType,
        slug: nid,
        similarity: 0,
        origin: "neighbor",
      });
    }

    const answer = await synthesizeChat({ question, matches, hops });
    const { text, citations } = parseCitations(answer, { retrieved, neighbors });
    const subgraph = buildSubgraphFromPath(citations, hops);

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode(text));
        controller.enqueue(encoder.encode("\n---SOURCES---\n"));
        controller.enqueue(encoder.encode(JSON.stringify({ citations, subgraph })));
        controller.close();
      },
    });
    return new NextResponse(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("[chat] failed", err);
    return NextResponse.json({ error: "Chat failed — try again" }, { status: 502 });
  }
}
