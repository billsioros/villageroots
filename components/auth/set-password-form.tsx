"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/auth/validation";
import { Lock } from "lucide-react";
import { IconInput } from "@/components/auth/icon-input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { PasswordStrength } from "@/components/auth/password-strength";

export function SetPasswordForm() {
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setSessionReady(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) =>
      setSessionReady(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (sessionReady === null) {
    return <p className="text-sm text-muted-foreground">Checking your invitation…</p>;
  }

  if (sessionReady === false) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Invitation not found</h1>
          <p className="text-sm text-muted-foreground">
            This invitation link is invalid or has expired. Ask an administrator to send a
            new one.
          </p>
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
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setFormError("We couldn't set your password — please try again.");
        return;
      }
    } finally {
      setIsLoading(false);
    }
    router.push("/protected");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to the village</h1>
        <p className="text-sm text-muted-foreground">
          Set a strong password to finish joining VillageRoots.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <IconInput
            id="password"
            type="password"
            autoComplete="new-password"
            icon={<Lock className="h-4 w-4" />}
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
          <IconInput
            id="confirm"
            type="password"
            autoComplete="new-password"
            icon={<Lock className="h-4 w-4" />}
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
          {isLoading ? "Creating…" : "Create password"}
        </SubmitButton>
      </form>
    </div>
  );
}
