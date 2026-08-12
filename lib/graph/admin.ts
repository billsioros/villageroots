import { getRoleForUser } from "@/lib/graph/rbac";

export async function isAdminUid(uid: string): Promise<boolean> {
  return (await getRoleForUser(uid)) === "admin";
}
