"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/auth/validation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { PasswordStrength } from "@/components/auth/password-strength";

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const passError = validatePassword(password);
    const matchError = confirm !== password ? "Passwords do not match." : null;
    setFieldError(passError);
    setConfirmError(matchError);
    if (passError || matchError) return;

    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setIsLoading(false);
      setFormError("We couldn't update your password — please try again.");
      return;
    }
    await supabase.auth.signOut();
    setIsLoading(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Password updated</h1>
          <p className="text-sm text-muted-foreground">
            Your new password is active. Sign in to continue.
          </p>
        </div>
        <Link
          href="/auth/login"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-accent-hover"
        >
          Return to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">
          Use at least 8 characters with upper &amp; lower case, a number and a symbol.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <div className="grid gap-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            disabled={isLoading}
            aria-invalid={fieldError != null}
            aria-describedby={fieldError ? "password-error" : undefined}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordStrength password={password} />
          <div className="min-h-[1.25rem]">
            {fieldError && (
              <p id="password-error" className="text-[13px] text-destructive">
                {fieldError}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            disabled={isLoading}
            aria-invalid={confirmError != null}
            aria-describedby={confirmError ? "confirm-error" : undefined}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <div className="min-h-[1.25rem]">
            {confirmError && (
              <p id="confirm-error" className="text-[13px] text-destructive">
                {confirmError}
              </p>
            )}
          </div>
        </div>

        {formError && (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[13px] text-destructive"
          >
            {formError}
          </div>
        )}

        <SubmitButton isLoading={isLoading}>
          {isLoading ? "Updating…" : "Update password"}
        </SubmitButton>
      </form>
    </div>
  );
}
