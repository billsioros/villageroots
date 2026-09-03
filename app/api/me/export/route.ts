import { NextResponse } from "next/server";
import { alias } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import ExcelJS from "exceljs";
import { db } from "@/lib/graph/db";
import { nodes, edges } from "@/drizzle/schema";
import { sessionUid } from "@/lib/graph/session";

export async function GET() {
  const uid = await sessionUid();
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userNodes = await db
      .select({
        slug: nodes.slug,
        type: nodes.type,
        label: nodes.label,
        subtitle: nodes.subtitle,
        status: nodes.status,
        privacy: nodes.privacy,
        createdAt: nodes.createdAt,
        updatedAt: nodes.updatedAt,
      })
      .from(nodes)
      .where(eq(nodes.createdBy, uid));

    const sourceNodes = alias(nodes, "source_nodes");
    const targetNodes = alias(nodes, "target_nodes");

    const userEdges = await db
      .select({
        slug: edges.slug,
        sourceSlug: sourceNodes.slug,
        targetSlug: targetNodes.slug,
        type: edges.type,
        status: edges.status,
        createdAt: edges.createdAt,
        updatedAt: edges.updatedAt,
      })
      .from(edges)
      .innerJoin(sourceNodes, eq(sourceNodes.id, edges.sourceId))
      .innerJoin(targetNodes, eq(targetNodes.id, edges.targetId))
      .where(eq(edges.createdBy, uid));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "VillageRoots";
    workbook.created = new Date();

    const nodesSheet = workbook.addWorksheet("Nodes");
    nodesSheet.columns = [
      { header: "Slug", key: "slug", width: 20 },
      { header: "Type", key: "type", width: 12 },
      { header: "Label", key: "label", width: 30 },
      { header: "Subtitle", key: "subtitle", width: 30 },
      { header: "Status", key: "status", width: 12 },
      { header: "Privacy", key: "privacy", width: 12 },
      { header: "Created At", key: "createdAt", width: 22 },
      { header: "Updated At", key: "updatedAt", width: 22 },
    ];
    for (const node of userNodes) {
      nodesSheet.addRow({
        slug: node.slug,
        type: node.type,
        label: node.label,
        subtitle: node.subtitle ?? "",
        status: node.status,
        privacy: node.privacy,
        createdAt: node.createdAt?.toISOString() ?? "",
        updatedAt: node.updatedAt?.toISOString() ?? "",
      });
    }

    const edgesSheet = workbook.addWorksheet("Edges");
    edgesSheet.columns = [
      { header: "Slug", key: "slug", width: 20 },
      { header: "Source Slug", key: "sourceSlug", width: 20 },
      { header: "Target Slug", key: "targetSlug", width: 20 },
      { header: "Type", key: "type", width: 18 },
      { header: "Status", key: "status", width: 12 },
      { header: "Created At", key: "createdAt", width: 22 },
      { header: "Updated At", key: "updatedAt", width: 22 },
    ];
    for (const edge of userEdges) {
      edgesSheet.addRow({
        slug: edge.slug,
        sourceSlug: edge.sourceSlug,
        targetSlug: edge.targetSlug,
        type: edge.type,
        status: edge.status,
        createdAt: edge.createdAt?.toISOString() ?? "",
        updatedAt: edge.updatedAt?.toISOString() ?? "",
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const filename = `village-roots-${dateStr}.xlsx`;

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
