import {
  Activity as ActivityIcon,
  ArrowRight,
  Building2,
  Calendar,
  CheckSquare,
  FileText,
  Handshake,
  Mail,
  MessageSquare,
  Package,
  Phone,
  RotateCcw,
  ShoppingCart,
  UserCog,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { formatIST_date } from '@shared/lib/date'
import type { ActivityLogType } from '../../api'

export type FeedVariant = 'default' | 'success' | 'error' | 'warning'

// Per-type icon / label / color. Tier-2 (user-loggable) types come first;
// Tier-1 (system) codes follow. `configFor` falls back for unknown future
// activity_types so the backend can ship new events without a FE deploy.
const activityTypeConfig: Record<string, { icon: LucideIcon; label: string; variant: FeedVariant }> = {
  call: { icon: Phone, label: 'Call', variant: 'default' },
  email: { icon: Mail, label: 'Email', variant: 'default' },
  whatsapp: { icon: MessageSquare, label: 'WhatsApp', variant: 'default' },
  follow_up: { icon: ArrowRight, label: 'Follow-up', variant: 'warning' },
  meeting: { icon: Calendar, label: 'Meeting', variant: 'success' },
  stage_change: { icon: ArrowRight, label: 'Stage Change', variant: 'success' },
  rejection: { icon: XCircle, label: 'Rejected', variant: 'error' },
  reinstatement: { icon: RotateCcw, label: 'Reinstated', variant: 'success' },
  closed_lost: { icon: XCircle, label: 'Closed Lost', variant: 'error' },
  account_created: { icon: Building2, label: 'Account Created', variant: 'default' },
  deal_created: { icon: Handshake, label: 'Deal Created', variant: 'default' },
  so_created: { icon: ShoppingCart, label: 'SO Created', variant: 'default' },
  owner_change: { icon: UserCog, label: 'Owner Changed', variant: 'default' },
  note_created: { icon: FileText, label: 'Note Added', variant: 'default' },
  comment_added: { icon: MessageSquare, label: 'Comment', variant: 'default' },
  task_created: { icon: CheckSquare, label: 'Task Created', variant: 'default' },
  task_completed: { icon: CheckSquare, label: 'Task Completed', variant: 'success' },
  mi_submitted: { icon: Package, label: 'MI Submitted', variant: 'default' },
  mi_response_added: { icon: Package, label: 'MI Response', variant: 'default' },
  mi_pm_approved: { icon: CheckSquare, label: 'MI PM Approved', variant: 'success' },
}

export function configFor(type: string) {
  return (
    activityTypeConfig[type] ?? {
      icon: ActivityIcon,
      label: type.replace(/_/g, ' '),
      variant: 'default' as const,
    }
  )
}

// Mirror Timeline.tsx's color palette so the feed reads as the same component.
export const variantCircleStyles: Record<FeedVariant, string> = {
  default: 'bg-muted-foreground/80',
  success: 'bg-status-success-text',
  error: 'bg-status-error-text',
  warning: 'bg-status-warning-text',
}

// Only call/email/whatsapp/meeting accept inbound/outbound. Follow-ups don't.
export const DIRECTION_TYPES = new Set<ActivityLogType>([
  'call',
  'email',
  'whatsapp',
  'meeting',
])

export const TYPE_LABEL: Record<ActivityLogType, string> = {
  call: 'Call',
  email: 'Email',
  whatsapp: 'WhatsApp',
  follow_up: 'Follow-up',
  meeting: 'Meeting',
}

export function humanize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
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
