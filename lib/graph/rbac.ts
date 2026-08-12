export type Role = "admin" | "contributor";

export function isRoleAdmin(role: Role | undefined | null): boolean {
  return role === "admin";
}