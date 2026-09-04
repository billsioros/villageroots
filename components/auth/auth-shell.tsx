import { AuthBackground } from "@/components/auth/auth-background";
import { BrandMark } from "@/components/auth/brand-mark";

export function AuthShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh w-full flex-col overflow-hidden bg-[#F5F6FA]">
      <AuthBackground />

      {/* Ambient glow orbs */}
      <div
        className="glow-orb pointer-events-none absolute z-0"
        style={{
          width: 520,
          height: 520,
          left: "-10%",
          top: "30%",
          background: "radial-gradient(circle, rgba(241,60,87,0.16) 0%, transparent 70%)",
          animation: "glow-drift-a 12s ease-in-out infinite",
        }}
      />
      <div
        className="glow-orb pointer-events-none absolute z-0"
        style={{
          width: 380,
          height: 380,
          right: "-5%",
          bottom: "10%",
          background: "radial-gradient(circle, rgba(216,40,63,0.10) 0%, transparent 70%)",
          animation: "glow-drift-b 14s ease-in-out infinite",
        }}
      />

      <div className="relative z-10 mx-auto my-auto flex w-full max-w-md flex-col items-center px-6 py-12">
        <div className="mb-6 auth-rise" style={{ animation: "rise 0.5s ease-out 0.1s both" }}>
          <BrandMark className="h-8 w-auto" />
        </div>
        <div
          className="auth-rise w-full rounded-[18px] p-8"
          style={{
            background: "rgba(255,255,255,0.86)",
            backdropFilter: "blur(18px) saturate(140%)",
            border: "1px solid rgba(255,255,255,0.6)",
            boxShadow:
              "0 2px 4px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.1), 0 0 40px rgba(241,60,87,0.08), inset 0 1px 0 rgba(255,255,255,0.5)",
            animation: "rise 0.5s ease-out both",
          }}
        >
          {/* Gradient accent line */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] rounded-t-[18px]"
            style={{
              background: "linear-gradient(90deg, transparent, #f13c57, transparent)",
            }}
          />
          {children}
        </div>
        {footer && (
          <p className="mt-8 text-center text-xs text-muted-foreground">{footer}</p>
        )}
      </div>
    </div>
  );
}
