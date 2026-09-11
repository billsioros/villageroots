"use client";

import { useEffect, useState, type FormEvent } from "react";
import { validateEmail } from "@/lib/auth/validation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function InviteForm() {
  const [visible, setVisible] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "contributor">("contributor");
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
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!surname.trim()) {
      setError("Surname is required.");
      return;
    }
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
        body: JSON.stringify({ email, name: name.trim(), surname: surname.trim(), role }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; password?: string };
      if (res.ok) {
        setName("");
        setSurname("");
        setEmail("");
        setRole("contributor");
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
    <div className="flex flex-col gap-3">
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-4 rounded-xl border border-border-soft bg-card p-4"
      >
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-semibold text-foreground">Invite a contributor</h4>
          <p className="text-xs text-muted-foreground">
            All fields are required — the invite is created only once the form is complete.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="invite-name">First name</Label>
            <Input
              id="invite-name"
              type="text"
              autoComplete="given-name"
              placeholder="Eleni"
              value={name}
              disabled={isLoading}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="invite-surname">Surname</Label>
            <Input
              id="invite-surname"
              type="text"
              autoComplete="family-name"
              placeholder="Katsari"
              value={surname}
              disabled={isLoading}
              onChange={(e) => setSurname(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="invite-email">Email</Label>
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

        <div className="grid gap-1.5">
          <Label>Role</Label>
          <RadioGroup
            value={role}
            onValueChange={(v) => setRole(v as "admin" | "contributor")}
            disabled={isLoading}
            className="grid grid-cols-2 gap-2"
          >
            <RadioGroupItem value="contributor" id="invite-role-contributor" className="sr-only" />
            <Label
              htmlFor="invite-role-contributor"
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                role === "contributor"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border-soft text-muted-foreground",
              )}
            >
              Contributor
            </Label>
            <RadioGroupItem value="admin" id="invite-role-admin" className="sr-only" />
            <Label
              htmlFor="invite-role-admin"
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                role === "admin"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border-soft text-muted-foreground",
              )}
            >
              <ShieldCheck size={14} />
              Administrator
            </Label>
          </RadioGroup>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Sending…" : "Invite"}
        </Button>
      </form>
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
    </div>
  );
}
