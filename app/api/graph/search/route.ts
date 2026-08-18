import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
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

  const tsquery = sql`plainto_tsquery('simple', ${q})`;
  const searchCol = sql.raw('"search_vector"');
  const policy = graphPolicy(uid, { status: nodes.status, createdBy: nodes.createdBy });

  const rows = await db
    .select({
      id: nodes.id,
      label: nodes.label,
      subtitle: nodes.subtitle,
      type: nodes.type,
      privacy: nodes.privacy,
      properties: nodes.properties,
      createdBy: nodes.createdBy,
      rank: sql<number>`ts_rank(${searchCol}, ${tsquery})`,
    })
    .from(nodes)
    .where(sql`${searchCol} @@ ${tsquery} AND ${policy}`)
    .orderBy(sql`ts_rank(${searchCol}, ${tsquery}) DESC`)
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
}
