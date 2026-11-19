// Pure data transformer: backend AuditEntry → UI Activity.
// No JSX, no styling. The render layer (src/modules/crm/components/shared/AuditTrail.tsx
// and its activityTypeConfig map) decides icons/colors based on the chosen
// Activity['type']. This file only picks that type and shapes the metadata.

import type { Activity } from "@/modules/crm/types";

import type { AuditEntry } from "../types";

export type AuditEntityKind = "lead" | "deal" | "rental_device" | "sales_order";

// Open set on the backend side — extend this map as new audit verbs ship.
// Anything not in here falls back to the neutral "note" treatment.
const ACTION_TO_ACTIVITY_TYPE: Record<string, Activity["type"]> = {
  // Generic CRUD verbs.
  insert: "account_created",
  created: "account_created",
  update: "stage_change",
  soft_delete: "rejection",

  // CRM-specific.
  convert_to_order: "deal_created",
};

const STAGE_KEYS = ["status", "stage"] as const;

export function auditEntryToActivity(
  entry: AuditEntry,
  entity: AuditEntityKind,
  entityId: string,
): Activity {
  const before = (entry.before ?? {}) as Record<string, unknown>;
  const after = (entry.after ?? {}) as Record<string, unknown>;
  const baseType = ACTION_TO_ACTIVITY_TYPE[entry.action] ?? "note";
  // Backend now computes a human-friendly one-liner for each entry (e.g.
  // "Quote QT-2026-07-09-00006 created", "Material Inquiry … submitted") on
  // AuditEntryResponse.message. Prefer it verbatim — it knows the resource
  // number and verb better than the FE can guess from action + before/after.
  const backendMessage = entry.message?.trim() || undefined;

  const stageMeta = extractStageChange(before, after);
  if (stageMeta) {
    return makeActivity(
      entry,
      "stage_change",
      backendMessage ?? `Stage changed: ${stageMeta.from} → ${stageMeta.to}`,
      entity,
      entityId,
      stageMeta,
    );
  }

  return makeActivity(
    entry,
    baseType,
    backendMessage ?? humaniseAction(entry.action),
    entity,
    entityId,
    undefined,
  );
}

function makeActivity(
  entry: AuditEntry,
  type: Activity["type"],
  title: string,
  entity: AuditEntityKind,
  entityId: string,
  metadata: Record<string, string> | undefined,
): Activity {
  return {
    id: entry.id,
    type,
    title,
    user: entry.actor_name ?? "System",
    timestamp: entry.created_at,
    entityType: entity,
    entityId,
    ...(metadata ? { metadata } : {}),
    // Pass the raw redacted snapshots straight through so the UI can render
    // an expandable field-level diff on demand. Backend already strips
    // sensitive keys (hashed_password, etc.) before they hit the wire.
    before: entry.before ?? null,
    after: entry.after ?? null,
  };
}

function extractStageChange(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): { from: string; to: string } | undefined {
  for (const key of STAGE_KEYS) {
    const b = before[key];
    const a = after[key];
    if (typeof b === "string" && typeof a === "string" && b !== a) {
      return { from: b, to: a };
    }
  }
  return undefined;
}

function humaniseAction(action: string): string {
  const spaced = action.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
