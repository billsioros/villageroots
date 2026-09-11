import { eq, count } from "drizzle-orm";
import { db } from "@/lib/graph/db";
import { userRoles } from "@/drizzle/schema";

export type Role = "admin" | "contributor";

export function isRole(value: unknown): value is Role {
  return value === "admin" || value === "contributor";
}

export function isRoleAdmin(role: Role | undefined | null): boolean {
  return role === "admin";
}

export async function getRoleForUser(uid: string): Promise<Role | null> {
  const rows = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, uid))
    .limit(1);
  return rows[0]?.role ?? null;
}

export async function countAdmins(): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(userRoles)
    .where(eq(userRoles.role, "admin"));
  return rows[0]?.value ?? 0;
}

export async function setRoleForUser(uid: string, role: Role): Promise<void> {
  await db
    .insert(userRoles)
    .values({ userId: uid, role })
    .onConflictDoUpdate({ target: userRoles.userId, set: { role } });
}