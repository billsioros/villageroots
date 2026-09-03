import { db } from "./db";
import { sessionUid } from "./session";
import { auditLogs } from "@/drizzle/schema";

type AuditAction = "create" | "update" | "status_change";
type AuditEntityType = "node" | "edge";

type AuditTransaction = Parameters<typeof db.transaction>[0] extends (
  tx: infer T,
) => Promise<unknown>
  ? T
  : never;

interface AuditMetadata extends Record<string, unknown> {
  statusBefore?: string;
  statusAfter?: string;
}

export async function logAudit(
  action: AuditAction,
  entityType: AuditEntityType,
  entitySlug: string,
  metadata: AuditMetadata,
  tx?: AuditTransaction,
): Promise<void> {
  try {
    const uid = await sessionUid();
    const executor = tx ?? db;
    await executor.insert(auditLogs).values({
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
