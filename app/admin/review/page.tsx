import { Suspense } from "react";
import { redirect } from "next/navigation";
import { sessionUid } from "@/lib/graph/session";
import { isAdminUid } from "@/lib/graph/admin";
import { Providers } from "@/components/providers";
import { AdminReviewQueue } from "@/components/admin/review-queue";

export const metadata = { title: "Review queue" };

export default function AdminReviewPage() {
  return (
    <main className="flex h-full flex-col p-6 gap-4">
      <Suspense fallback={null}>
        <ReviewGate />
      </Suspense>
    </main>
  );
}

async function ReviewGate() {
  const uid = await sessionUid();
  if (!uid || !(await isAdminUid(uid))) redirect("/");
  return (
    <Providers>
      <AdminReviewQueue />
    </Providers>
  );
}