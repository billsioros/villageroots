export const PASSWORD_MIN_LENGTH = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_CLASSES = [
  { re: /[a-z]/, label: "a lowercase letter" },
  { re: /[A-Z]/, label: "an uppercase letter" },
  { re: /\d/, label: "a digit" },
  { re: /[^A-Za-z0-9]/, label: "a symbol" },
] as const;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  return EMAIL_RE.test(email.trim()) ? null : "Enter a valid email address.";
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  const missing = PASSWORD_CLASSES.filter((c) => !c.re.test(password)).map((c) => c.label);
  if (missing.length > 0) return `Include at least ${missing.join(" and ")}.`;
  return null;
}

export function scorePassword(password: string): number {
  if (!password) return 0;
  const score = password.length >= PASSWORD_MIN_LENGTH ? 1 : 0;
  const met = PASSWORD_CLASSES.reduce((n, c) => n + (c.re.test(password) ? 1 : 0), 0);
  return Math.min(4, score + Math.min(4, met));
}
