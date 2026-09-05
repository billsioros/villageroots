import { NextRequest, NextResponse } from "next/server";
import { and, sql } from "drizzle-orm";
import { db } from "@/lib/graph/db";
import { nodes } from "@/drizzle/schema";
import { graphPolicy, shouldMaskLivingOnRead } from "@/lib/graph/policy";
import { sessionUid } from "@/lib/graph/session";
import { isAdminUid } from "@/lib/graph/admin";

const MAX_SEARCH_LIMIT = 20;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters" },
      { status: 400 },
    );
  }

  const limit = Math.min(
    Math.max(Number(searchParams.get("limit") ?? 8), 1),
    MAX_SEARCH_LIMIT,
  );

  const uid = await sessionUid();
  const isAdmin = uid ? await isAdminUid(uid) : false;

  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const query = q.toLowerCase();
  // Must match the 0012 migration index expression byte-for-byte.
  const searchable = sql`(coalesce(${nodes.label}, '') || ' ' || coalesce(${nodes.subtitle}, '') || ' ' || coalesce(${nodes.description}, ''))`;
  const policy = graphPolicy(uid, { status: nodes.status, createdBy: nodes.createdBy });
  const whereClause = and(
    ...words.map((word) => sql`${searchable} ILIKE ${`%${word}%`}`),
    policy,
  );
  const rankExpr = sql<number>`
    CASE
      WHEN lower(${nodes.label}) = ${query} THEN 0
      WHEN lower(${nodes.label}) LIKE ${query + '%'} THEN 1
      WHEN lower(${nodes.subtitle}) = ${query} THEN 2
      WHEN lower(${nodes.subtitle}) LIKE ${query + '%'} THEN 3
      WHEN strpos(lower(${nodes.label}), ${query}) > 0 THEN 4
      ELSE 5
    END
  `;

  try {
    const rows = await db
      .select({
        // The client keys its graph by slug (see lib/graph/mappers.ts), and
        // selectNode/flashNodes expect slug ids — a uuid here would silently
        // fail to resolve the node when a search result is clicked.
        id: nodes.slug,
        label: nodes.label,
        subtitle: nodes.subtitle,
        type: nodes.type,
        privacy: nodes.privacy,
        properties: nodes.properties,
        createdBy: nodes.createdBy,
        rank: rankExpr,
      })
      .from(nodes)
      .where(whereClause)
      .orderBy(sql`${rankExpr} ASC, lower(${nodes.label}) ASC`)
      .limit(limit);

    const output = rows.map((row) => {
      const masked = shouldMaskLivingOnRead(row, { uid, isAdmin })
        ? { ...row, label: "Living Person", subtitle: "" }
        : row;
      return {
        id: masked.id,
        label: masked.label,
        subtitle: masked.subtitle,
        type: masked.type,
        rank: masked.rank,
      };
    });

    return NextResponse.json({ results: output });
  } catch {
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 },
    );
  }
}
