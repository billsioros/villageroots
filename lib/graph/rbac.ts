import { eq } from "drizzle-orm";
import { db } from "@/lib/graph/db";
import { userRoles } from "@/drizzle/schema";

export type Role = "admin" | "contributor";

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
