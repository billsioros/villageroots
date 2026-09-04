"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { validateEmail } from "@/lib/auth/validation";
import { Mail } from "lucide-react";
import { IconInput } from "@/components/auth/icon-input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const em = validateEmail(email);
    if (em) {
      setError(em);
      return;
    }
    setIsLoading(true);
    const supabase = createClient();
    const trimmed = email.trim();
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    setIsLoading(false);
    if (sendError) {
      setError("Something went wrong — please try again.");
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            If an account exists for{" "}
            <span className="font-medium text-foreground">{email}</span>, a password reset
            link is on its way.
          </p>
        </div>
        <div className="rounded-md border border-success/30 bg-success/5 px-3 py-2.5 text-[13px] text-foreground">
          Keep this page open while you check your inbox — the link works for a limited time.
        </div>
        <Link
          href="/auth/login"
          className="text-center text-[13px] font-medium text-primary transition-colors hover:text-accent-hover"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
<p className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a link to reset it.
          </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <IconInput
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            icon={<Mail className="h-4 w-4" />}
            value={email}
            disabled={isLoading}
            aria-invalid={error != null}
            aria-describedby={error ? "email-error" : undefined}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="min-h-[1.25rem]">
            {error && (
              <p id="email-error" className="text-[13px] text-destructive">
                {error}
              </p>
            )}
          </div>
        </div>

        <SubmitButton isLoading={isLoading}>
          {isLoading ? "Sending…" : "Send reset link"}
        </SubmitButton>
      </form>

      <p className="text-center text-[13px] text-muted-foreground">
        Remembered it?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-primary transition-colors hover:text-accent-hover"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
