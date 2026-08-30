import { AuthBackground } from "@/components/auth/auth-background";

export function AuthShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh w-full flex-col overflow-hidden bg-surface-warm">
      <AuthBackground />
      <div className="relative z-10 mx-auto my-auto w-full max-w-md px-6 py-12">
        <div className="rounded-lg border border-border-soft border-t-2 border-t-primary bg-card p-8 shadow-elev-raised">
          {children}
        </div>
        {footer && <p className="mt-8 text-center text-xs text-muted-foreground">{footer}</p>}
      </div>
    </div>
  );
}