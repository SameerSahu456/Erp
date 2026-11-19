import {
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  FileText,
  ArrowRight,
  XCircle,
  RotateCcw,
  Building2,
  Handshake,
  ShoppingCart,
  UserPlus,
  ThumbsDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { Activity } from '../../types'
import { formatIST, formatIST_date } from '@shared/lib/date'
import { stripHtml } from '@/lib/utils'

export type FilterKey =
  | 'all'
  | 'stage_changes'
  | 'assignments'
  | 'documents'
  | 'activities'

export const FILTER_CONFIG: Record<FilterKey, { label: string; types: Activity['type'][] }> = {
  all: { label: 'All', types: [] },
  stage_changes: {
    label: 'Stage Changes',
    types: ['stage_change', 'rejection', 'reinstatement', 'closed_lost'],
  },
  assignments: { label: 'Assignments', types: ['owner_change'] },
  documents: {
    label: 'Documents',
    types: ['account_created', 'deal_created', 'so_created'],
  },
  activities: { label: 'Activities', types: ['call', 'email', 'meeting', 'task', 'note'] },
}

export const activityTypeConfig: Record<
  Activity['type'],
  { icon: LucideIcon; dotColor: string; label: string }
> = {
  call: { icon: Phone, dotColor: 'bg-muted-foreground', label: 'Call' },
  email: { icon: Mail, dotColor: 'bg-violet', label: 'Email' },
  meeting: { icon: Calendar, dotColor: 'bg-violet', label: 'Meeting' },
  task: { icon: CheckCircle, dotColor: 'bg-muted-foreground', label: 'Task' },
  note: { icon: FileText, dotColor: 'bg-muted-foreground', label: 'Note' },
  stage_change: { icon: ArrowRight, dotColor: 'bg-info', label: 'Stage Change' },
  rejection: { icon: XCircle, dotColor: 'bg-destructive', label: 'Rejection' },
  reinstatement: { icon: RotateCcw, dotColor: 'bg-success', label: 'Reinstatement' },
  closed_lost: { icon: ThumbsDown, dotColor: 'bg-destructive', label: 'Closed Lost' },
  account_created: { icon: Building2, dotColor: 'bg-success', label: 'Account Created' },
  deal_created: { icon: Handshake, dotColor: 'bg-success', label: 'Deal Created' },
  so_created: { icon: ShoppingCart, dotColor: 'bg-success', label: 'SO Created' },
  owner_change: { icon: UserPlus, dotColor: 'bg-violet', label: 'Owner Change' },
}

export function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatIST_date(date.toISOString())
}

// Pipeline-stage color map. Match is case-insensitive AND tolerant of
// snake_case vs spaced forms. Defaults to neutral grey for unknown labels.
export type BadgeVariant = 'success' | 'destructive' | 'warning' | 'info' | 'default'

const STAGE_VARIANT: Record<string, BadgeVariant> = {
  new: 'default',
  contacted: 'info',
  cold: 'default',
  qualified: 'info',
  proposal: 'warning',
  negotiation: 'warning',
  procurement: 'info',
  closed_won: 'success',
  closed_lost: 'destructive',
  rejected: 'destructive',
  open: 'info',
  pending: 'warning',
  approved: 'success',
  denied: 'destructive',
}

function normaliseStageKey(stage: string): string {
  return stage.trim().toLowerCase().replace(/\s+/g, '_')
}

export function stageBadgeVariant(stage: string): BadgeVariant {
  return STAGE_VARIANT[normaliseStageKey(stage)] ?? 'default'
}

// Lowercase `qualified` → "Qualified". snake_case `closed_won` → "Closed Won".
export function humaniseStage(stage: string): string {
  return stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Audit-row diff helpers ────────────────────────────────────────────────
const HIDDEN_DIFF_KEYS = new Set([
  'id',
  'created_at',
  'updated_at',
  'deleted_at',
  'actor_was_superuser',
])

export type DiffKind = 'added' | 'removed' | 'changed'
export interface DiffRow {
  key: string
  kind: DiffKind
  before?: unknown
  after?: unknown
}

export function computeDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): DiffRow[] {
  const b = before ?? {}
  const a = after ?? {}
  const keys = new Set([...Object.keys(b), ...Object.keys(a)])
  const rows: DiffRow[] = []
  for (const key of keys) {
    if (HIDDEN_DIFF_KEYS.has(key)) continue
    const bv = (b as Record<string, unknown>)[key]
    const av = (a as Record<string, unknown>)[key]
    const inB = key in b
    const inA = key in a
    if (inA && !inB) rows.push({ key, kind: 'added', after: av })
    else if (inB && !inA) rows.push({ key, kind: 'removed', before: bv })
    else if (!Object.is(bv, av) && JSON.stringify(bv) !== JSON.stringify(av))
      rows.push({ key, kind: 'changed', before: bv, after: av })
  }
  return rows.sort((x, y) => x.key.localeCompare(y.key))
}

// Detect backend timestamps so a raw `2026-07-07T19:10:58.323209+00:00` renders
// as a readable IST time instead of an ISO blob. Date-only strings (valid_until)
// stay date-only.
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function formatDiffValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'string') {
    if (ISO_DATETIME_RE.test(v)) return formatIST(v)
    if (ISO_DATE_RE.test(v)) return formatIST_date(v)
    // Rich-text fields (e.g. description) arrive as HTML — render readable text,
    // never raw tags. stripHtml is a no-op for plain strings.
    return stripHtml(v)
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

export function humaniseKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Foreign-key resolution ────────────────────────────────────────────────
export type EntityKind =
  | 'user'
  | 'account'
  | 'contact'
  | 'lead'
  | 'deal'
  | 'category'
  | 'oem'

export const FK_KEY_TO_ENTITY: Record<string, EntityKind> = {
  assigned_to: 'user',
  assigned_to_id: 'user',
  presales_manager_id: 'user',
  created_by: 'user',
  updated_by: 'user',
  owner_id: 'user',
  user_id: 'user',
  actor_id: 'user',
  pm_user_id: 'user',
  bde_user_id: 'user',
  reviewed_by: 'user',
  approved_by: 'user',
  rejected_by: 'user',
  bde_user_ids: 'user',
  pm_user_ids: 'user',
  account_id: 'account',
  contact_id: 'contact',
  lead_id: 'lead',
  deal_id: 'deal',
  category_id: 'category',
  category_ids: 'category',
  oem_id: 'oem',
  oem_ids: 'oem',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

export function isUuidArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.length > 0 && v.every(isUuid)
}

export function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined || v === '') return true
  if (Array.isArray(v) && v.length === 0) return true
  if (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    Object.keys(v).length === 0
  )
    return true
  return false
}

// A raw UUID (or UUID array) under a key with no name-resolver → it can only
// render as "reference hidden", which is noise. Callers use this to DROP such
// rows from the audit diff entirely rather than show "<field>: reference hidden".
export function isUnresolvableReference(field: string, v: unknown): boolean {
  return (isUuid(v) || isUuidArray(v)) && !FK_KEY_TO_ENTITY[field]
}
