import { NextRequest, NextResponse } from "next/server";
import { sessionUid } from "@/lib/graph/session";
import { isAdminUid } from "@/lib/graph/admin";
import {
  fetchEdgeReview,
  fetchMediaReview,
  fetchNodeReview,
} from "@/lib/admin/review";

type QueueType = "nodes" | "edges" | "scan_uploads";

export async function GET(request: NextRequest) {
  const type = (request.nextUrl.searchParams.get("type") ?? "nodes") as QueueType;
  const uid = await sessionUid();
  if (!uid || !(await isAdminUid(uid))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const payload =
    type === "edges"
      ? await fetchEdgeReview()
      : type === "scan_uploads"
        ? await fetchMediaReview()
        : await fetchNodeReview();
  return NextResponse.json(payload);
}
