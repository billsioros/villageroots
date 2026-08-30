"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validateEmail } from "@/lib/auth/validation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";

export function SignInForm({
  heading = "Welcome back",
  description = "Sign in to continue to the village.",
}: {
  heading?: string;
  description?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const em = validateEmail(email);
    const pw = password.trim() ? null : "Password is required.";
    setEmailError(em);
    setPasswordError(pw);
    if (em || pw) return;

    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    if (error) {
      setFormError("The email or password you entered is incorrect.");
      return;
    }
    router.push("/protected");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            disabled={isLoading}
            aria-invalid={emailError != null}
            aria-describedby={emailError ? "email-error" : undefined}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="min-h-[1.25rem]">
            {emailError && (
              <p id="email-error" className="text-[13px] text-destructive">
                {emailError}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/auth/forgot-password"
              className="text-[13px] font-medium text-primary transition-colors hover:text-accent-hover"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            disabled={isLoading}
            aria-invalid={passwordError != null}
            aria-describedby={passwordError ? "password-error" : undefined}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="min-h-[1.25rem]">
            {passwordError && (
              <p id="password-error" className="text-[13px] text-destructive">
                {passwordError}
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
          {isLoading ? "Signing in…" : "Sign in"}
        </SubmitButton>
      </form>
    </div>
  );
}
