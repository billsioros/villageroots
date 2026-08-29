import { AuthBackground } from "@/components/auth/auth-background";
import { BrandMark } from "@/components/graph/brand-mark";

export function AuthShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh w-full">
      <div className="relative hidden w-[45%] overflow-hidden bg-foreground lg:block">
        <AuthBackground />
        <div className="relative z-10 flex h-full flex-col justify-between p-10">
          <div className="flex items-center gap-3">
            <BrandMark size={28} />
            <span className="text-lg font-semibold tracking-tight text-background">
              VillageRoots
            </span>
          </div>
          <div>
            <h1 className="max-w-sm text-3xl font-semibold leading-tight tracking-tight text-background">
              The living record of Potidaneia.
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-background/70">
              People, places and stories of a Greek village, woven into one infinite
              knowledge graph of heritage.
            </p>
          </div>
          <p className="text-xs text-background/50">Invitation only · Potidaneia, Fokida</p>
        </div>
      </div>

      <div className="flex min-h-svh flex-1 flex-col items-center justify-center bg-surface-warm px-6 py-12">
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <BrandMark size={24} />
          <span className="text-[15px] font-semibold tracking-tight">VillageRoots</span>
        </div>
        <div className="w-full max-w-md rounded-lg border border-border-soft bg-card p-8 shadow-elev-raised">
          {children}
        </div>
        {footer && <p className="mt-8 text-xs text-muted-foreground">{footer}</p>}
      </div>
    </div>
  );
}
