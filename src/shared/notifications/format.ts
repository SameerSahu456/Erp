import {
  AlertTriangle,
  ArrowRight,
  AtSign,
  Bell,
  CheckCircle2,
  Clock,
  Download,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import { formatIST_date } from "@shared/lib/date"
import type { NotificationType } from "./api"

// Shared visual + display helpers for notification rows. Lifted out of
// NotificationPopover so the popover and the full-page NotificationCenter
// stay perfectly aligned: type tints, entity chip labels, mention markup
// stripping and time formatting are all derived from the same source.
// Adding a new NotificationType only requires touching one file here.

export interface NotificationTypeStyle {
  icon: React.ComponentType<{ className?: string }>
  iconClass: string
  tintClass: string
}

const TYPE_STYLES: Record<NotificationType, NotificationTypeStyle> = {
  mention: {
    icon: AtSign,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    tintClass: "bg-emerald-100 dark:bg-emerald-950/50",
  },
  task_assigned: {
    icon: ArrowRight,
    iconClass: "text-blue-600 dark:text-blue-400",
    tintClass: "bg-blue-100 dark:bg-blue-950/50",
  },
  lead_assigned: {
    icon: ArrowRight,
    iconClass: "text-blue-600 dark:text-blue-400",
    tintClass: "bg-blue-100 dark:bg-blue-950/50",
  },
  deal_assigned: {
    icon: ArrowRight,
    iconClass: "text-blue-600 dark:text-blue-400",
    tintClass: "bg-blue-100 dark:bg-blue-950/50",
  },
  task_completed: {
    icon: CheckCircle2,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    tintClass: "bg-emerald-100 dark:bg-emerald-950/50",
  },
  task_overdue: {
    icon: AlertTriangle,
    iconClass: "text-rose-600 dark:text-rose-400",
    tintClass: "bg-rose-100 dark:bg-rose-950/50",
  },
  task_reminder: {
    icon: Clock,
    iconClass: "text-amber-600 dark:text-amber-400",
    tintClass: "bg-amber-100 dark:bg-amber-950/50",
  },
  lead_stage_changed: {
    icon: Clock,
    iconClass: "text-violet-600 dark:text-violet-400",
    tintClass: "bg-violet-100 dark:bg-violet-950/50",
  },
  deal_stage_changed: {
    icon: Clock,
    iconClass: "text-violet-600 dark:text-violet-400",
    tintClass: "bg-violet-100 dark:bg-violet-950/50",
  },
  purchase_request_approval: {
    icon: Bell,
    iconClass: "text-amber-600 dark:text-amber-400",
    tintClass: "bg-amber-100 dark:bg-amber-950/50",
  },
  purchase_request_decided: {
    icon: Bell,
    iconClass: "text-amber-600 dark:text-amber-400",
    tintClass: "bg-amber-100 dark:bg-amber-950/50",
  },
  demo_request_approval: {
    icon: Bell,
    iconClass: "text-amber-600 dark:text-amber-400",
    tintClass: "bg-amber-100 dark:bg-amber-950/50",
  },
  demo_request_decided: {
    icon: Bell,
    iconClass: "text-amber-600 dark:text-amber-400",
    tintClass: "bg-amber-100 dark:bg-amber-950/50",
  },
  ims_export_ready: {
    icon: Download,
    iconClass: "text-success",
    tintClass: "bg-success/15",
  },
  ims_export_failed: {
    icon: AlertTriangle,
    iconClass: "text-destructive",
    tintClass: "bg-destructive-soft",
  },
}

const DEFAULT_TYPE_STYLE: NotificationTypeStyle = {
  icon: Bell,
  iconClass: "text-muted-foreground",
  tintClass: "bg-muted",
}

export function styleForType(type: NotificationType): NotificationTypeStyle {
  return TYPE_STYLES[type] ?? DEFAULT_TYPE_STYLE
}

// Mention markup arrives as `@[Display Name](uuid)` from the backend's
// rich-text mention picker (see app/modules/crm/utils/mentions.py). The
// raw UUID is meaningless to humans — strip it so the notification reads
// as plain `@Display Name`.
//
// The closing paren is optional because the backend description column
// occasionally truncates mid-token (NotificationCreate caps at 500 chars
// and the trailing `(uuid)` is the first thing chopped). We still want
// to render the cleaned-up `@Display Name` rather than leak the partial
// `@[Name](019df` into the UI.
const MENTION_MARKUP_RE = /@\[([^\]]+)\]\([^)\s]*\)?/g

export function stripMentionMarkup(text: string): string {
  return text.replace(MENTION_MARKUP_RE, "@$1").replace(/\s+/g, " ").trim()
}

// entity_type → human label for contextual chips. Mirrors the slug map
// in shared/notifications/routing.ts but in display form. Falls back to
// a Title-Cased version of the raw type so a future entity_type still
// renders something readable.
const ENTITY_LABELS: Record<string, string> = {
  lead: "Lead",
  deal: "Deal",
  account: "Account",
  contact: "Contact",
  quote: "Quote",
  material_inquiry: "Material Inquiry",
  purchase_request: "Purchase Request",
  demo_request: "Demo Request",
  task: "Task",
  ims_export_job: "Export",
}

export function entityLabel(entityType: string | null): string | null {
  if (!entityType) return null
  if (ENTITY_LABELS[entityType]) return ENTITY_LABELS[entityType]
  return entityType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

// Relative time for fresh notifications, absolute for older ones. Most
// notification UIs ship "2m ago" / "1h ago" — easier to scan at a glance
// than "07 May 2026". Falls back to the absolute IST format past 24h.
export function formatNotificationTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  const ageMs = Date.now() - date.getTime()
  if (ageMs < 24 * 60 * 60 * 1000) {
    return formatDistanceToNow(date, { addSuffix: true })
  }
  return formatIST_date(iso)
}
