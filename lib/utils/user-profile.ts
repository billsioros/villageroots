export function getInitials(name: string, surname: string): string {
  const n = name.trim();
  const s = surname.trim();
  if (!n && !s) return "";
  if (!n) return s.charAt(0).toUpperCase();
  if (!s) return n.charAt(0).toUpperCase();
  return (n.charAt(0) + s.charAt(0)).toUpperCase();
}

export function getDisplayName(name: string, surname: string): string {
  return [name.trim(), surname.trim()].filter(Boolean).join(" ");
}
