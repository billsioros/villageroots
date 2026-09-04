import { AuthShell } from "@/components/auth/auth-shell";
import { Suspense } from "react";
import Link from "next/link";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;

  return (
    <p className="text-sm text-muted-foreground">
      {params?.error
        ? `Code error: ${params.error}`
        : "An unspecified error occurred."}
    </p>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  return (
    <AuthShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <Suspense>
            <ErrorContent searchParams={searchParams} />
          </Suspense>
        </div>
        <Link
          href="/auth/login"
          className="text-center text-[13px] font-medium text-primary transition-colors hover:text-accent-hover"
        >
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
