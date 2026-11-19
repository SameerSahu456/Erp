import {
  Phone,
  Mail,
  Calendar,
  FileText,
  ArrowRight,
  XCircle,
  RotateCcw,
  Building2,
  Handshake,
  ShoppingCart,
  UserPlus,
  ThumbsDown,
  ListTodo,
  MessageCircle,
  Clock,
  PencilLine,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Activity as ActivityIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import type { ActivityLogEntityType } from "@modules/crm"

import { USER_ACTIVITY_STRINGS as S } from "./user-activity.strings"
import {
  type EntityKind,
  type FilterKey,
  type UserActivityType,
} from "./user-activity.types"

// Each activity type → its leading icon. All timeline dots use the brand
// foreground (near-black) for a single, on-brand look — status is conveyed by
// the row's icon and the from→to badges, not by the dot colour.
export const typeConfig: Record<UserActivityType, { icon: LucideIcon }> = {
  call: { icon: Phone },
  email: { icon: Mail },
  whatsapp: { icon: MessageCircle },
  follow_up: { icon: Clock },
  meeting: { icon: Calendar },
  task: { icon: ListTodo },
  note: { icon: FileText },
  activity: { icon: ActivityIcon },
  stage_change: { icon: ArrowRight },
  field_change: { icon: PencilLine },
  created: { icon: PlusCircle },
  deleted: { icon: Trash2 },
  rejection: { icon: XCircle },
  reinstatement: { icon: RotateCcw },
  closed_lost: { icon: ThumbsDown },
  account_created: { icon: Building2 },
  deal_created: { icon: Handshake },
  so_created: { icon: ShoppingCart },
  owner_change: { icon: UserPlus },
  // A sign-in ("Last login") reads as a moment in time → clock.
  login: { icon: Clock },
  // Any approval decision (account approve, SO line approve, PM approve …) →
  // a check, not the generic edit pencil.
  approval: { icon: CheckCircle2 },
}

export const FILTER_CONFIG: Record<FilterKey, { label: string }> = {
  all: { label: S.filters.all },
  stage_changes: { label: S.filters.stage },
  tasks: { label: S.filters.tasks },
}

// ── Wire → view-model mapping ──

export const ICON_TO_TYPE: Record<string, UserActivityType> = {
  call: "call",
  email: "email",
  whatsapp: "whatsapp",
  follow_up: "follow_up",
  meeting: "meeting",
  activity: "activity",
  stage_change: "stage_change",
  update: "field_change",
  created: "created",
  deleted: "deleted",
  task: "task",
  // The backend surfaces the "Last login" summary row with icon_type "login".
  login: "login",
}

export const ENTITY_KIND_LABEL: Record<ActivityLogEntityType, EntityKind> = {
  lead: "Lead",
  deal: "Deal",
  account: "Account",
  contact: "Contact",
  quote: "Quote",
  sales_order: "Sales Order",
  material_inquiry: "Material Inquiry",
  demo_request: "Demo Request",
  user: "User",
  role: "Role",
}

// Audit bookkeeping keys that are never user edits — filtered out of the
// displayed diff. `actor_was_superuser` is a forensic marker AuditService
// stamps onto every user-driven change; the user never edits it, so it must
// not read as a changed field. Kept in sync with the backend's `_SNAPSHOT_NOISE`
// (activity_log_service.py) — this is the FE safety net for any backend that
// still sends it.
export const NON_EDIT_FIELDS: ReadonlySet<string> = new Set([
  "actor_was_superuser",
  "created_at",
  "updated_at",
  "deleted_at",
  // Derived delta helpers the backend embeds in the role-permissions audit
  // snapshot (role_service.py: after={..., "added": [...], "removed": [...]}).
  // They duplicate the real `permission_codes` change (which we already reduce
  // to a minimal added/removed delta) and, because they carry no `from`,
  // render with a swapped "Added/Removed" label — drop them so only the
  // `permission_codes` diff shows.
  "added",
  "removed",
])

// Status/state-like field names — a change to one of these reads as a "status
// update", not a generic edit. Generic across resources: exact `status` /
// `stage` / `state`, plus any `*_status` (e.g. `line_status`, `pm_status`,
// `line_decision_status`).
export const STATUS_FIELDS: ReadonlySet<string> = new Set(["status", "stage", "state"])
