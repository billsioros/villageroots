"use client";

import { useEffect, useState, type FormEvent } from "react";
import { validateEmail } from "@/lib/auth/validation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function InviteForm() {
  const [visible, setVisible] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/me/role")
      .then((res) => res.json())
      .then((body) => {
        if (active) setVisible(body?.role === "admin");
      })
      .catch(() => {
        if (active) setVisible(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (visible !== true) return null;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; password?: string };
      if (res.ok) {
        setEmail("");
        setMessage(`Invitation sent to ${email}.`);
        setPassword(body.password ?? null);
      } else {
        setError(body.error ?? "Invite failed — please try again.");
      }
    } catch {
      setError("Invite failed — please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="invite-email">Invite a contributor</Label>
          <Input
            id="invite-email"
            type="email"
            autoComplete="email"
            placeholder="contributor@example.com"
            value={email}
            disabled={isLoading}
            aria-invalid={error != null}
            aria-describedby={error ? "invite-error" : undefined}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={isLoading} className="shrink-0">
          {isLoading ? "Sending…" : "Invite"}
        </Button>
      </div>
      <div className="min-h-[1.25rem]">
        {error && (
          <p id="invite-error" className="text-[13px] text-destructive">
            {error}
          </p>
        )}
        {message && <p className="text-[13px] text-foreground">{message}</p>}
        {password && (
          <div className="rounded-md border border-border-soft bg-muted px-3 py-2.5">
            <p className="text-[13px] font-medium text-foreground">Initial password</p>
            <p className="mt-1 font-mono text-sm text-foreground">{password}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Share this password with the user so they can sign in.
            </p>
          </div>
        )}
      </div>
    </form>
  );
}
