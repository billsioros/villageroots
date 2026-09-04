import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";

export default function NotFound() {
  return (
    <AuthShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-6xl font-bold text-muted-foreground/40">404</p>
          <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
          <p className="text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
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
