"use client";

import { scorePassword } from "@/lib/auth/validation";
import { cn } from "@/lib/utils";

const LABELS = ["", "Weak", "Fair", "Good", "Strong"] as const;
const BAR_COLORS = ["", "bg-destructive", "bg-warn", "bg-success/70", "bg-success"];

export function PasswordStrength({ password }: { password: string }) {
  const score = scorePassword(password);
  if (score === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={score}
        aria-label="Password strength"
        className="flex gap-1.5"
      >
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-150",
              i <= score ? BAR_COLORS[score] : "bg-border",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Strength: <span className="font-medium text-foreground">{LABELS[score]}</span>
      </p>
    </div>
  );
}
