import { db } from "./db";
import { sessionUid } from "./session";
import { auditLogs } from "@/drizzle/schema";

type AuditAction = "create" | "update" | "status_change";
type AuditEntityType = "node" | "edge";
type StatusValue = "pending" | "approved" | "rejected";

interface AuditMetadata extends Record<string, unknown> {
  statusBefore?: StatusValue;
  statusAfter?: StatusValue;
}

export async function logAudit(
  action: AuditAction,
  entityType: AuditEntityType,
  entitySlug: string,
  metadata: AuditMetadata,
): Promise<void> {
  try {
    const uid = await sessionUid();
    if (!uid) return;
    await db.insert(auditLogs).values({
      actorId: uid,
      entityType,
      entityId: entitySlug,
      entitySlug,
      action,
      statusBefore: metadata.statusBefore,
      statusAfter: metadata.statusAfter,
      metadata,
    });
  } catch {
    // Non-fatal: audit logging must never break primary mutations
  }
}
