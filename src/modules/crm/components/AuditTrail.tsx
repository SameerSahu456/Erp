import { useState } from 'react'
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
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { mockActivities } from '../data/activities'
import type { Activity } from '../types'

interface AuditTrailProps {
  entityType: 'lead' | 'deal'
  entityId: string
}

type FilterKey = 'all' | 'stage_changes' | 'assignments' | 'documents' | 'activities'

const FILTER_CONFIG: Record<FilterKey, { label: string; types: Activity['type'][] }> = {
  all: { label: 'All', types: [] },
  stage_changes: {
    label: 'Stage Changes',
    types: ['stage_change', 'rejection', 'reinstatement'],
  },
  assignments: {
    label: 'Assignments',
    types: ['owner_change'],
  },
  documents: {
    label: 'Documents',
    types: ['account_created', 'deal_created', 'so_created'],
  },
  activities: {
    label: 'Activities',
    types: ['call', 'email', 'meeting', 'task', 'note'],
  },
}

const activityTypeConfig: Record<
  Activity['type'],
  { icon: LucideIcon; dotColor: string; label: string }
> = {
  call: { icon: Phone, dotColor: 'bg-muted-foreground', label: 'Call' },
  email: { icon: Mail, dotColor: 'bg-[#7239ea]', label: 'Email' },
  meeting: { icon: Calendar, dotColor: 'bg-[#7239ea]', label: 'Meeting' },
  task: { icon: CheckCircle, dotColor: 'bg-muted-foreground', label: 'Task' },
  note: { icon: FileText, dotColor: 'bg-muted-foreground', label: 'Note' },
  stage_change: { icon: ArrowRight, dotColor: 'bg-[#1379f0]', label: 'Stage Change' },
  rejection: { icon: XCircle, dotColor: 'bg-[#f1416c]', label: 'Rejection' },
  reinstatement: { icon: RotateCcw, dotColor: 'bg-[#50cd89]', label: 'Reinstatement' },
  account_created: { icon: Building2, dotColor: 'bg-[#50cd89]', label: 'Account Created' },
  deal_created: { icon: Handshake, dotColor: 'bg-[#50cd89]', label: 'Deal Created' },
  so_created: { icon: ShoppingCart, dotColor: 'bg-[#50cd89]', label: 'SO Created' },
  owner_change: { icon: UserPlus, dotColor: 'bg-[#7239ea]', label: 'Owner Change' },
}

function formatRelativeTime(timestamp: string): string {
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
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function stageBadgeVariant(stage: string): 'success' | 'destructive' | 'warning' | 'default' | 'info' {
  if (stage === 'Closed Won') return 'success'
  if (stage === 'Closed Lost' || stage === 'Rejected') return 'destructive'
  if (stage === 'Negotiation' || stage === 'Proposal') return 'warning'
  if (stage === 'Qualified' || stage === 'Procurement') return 'info'
  return 'default'
}

function AuditTrail({ entityType, entityId }: AuditTrailProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')

  const allEntries = mockActivities
    .filter((a) => a.entityType === entityType && a.entityId === entityId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const filtered =
    activeFilter === 'all'
      ? allEntries
      : allEntries.filter((a) => FILTER_CONFIG[activeFilter].types.includes(a.type))

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-ui font-medium text-muted-foreground uppercase tracking-wide">
        Audit Trail
      </h3>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FILTER_CONFIG) as FilterKey[]).map((key) => (
          <Button
            key={key}
            variant={activeFilter === key ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setActiveFilter(key)}
          >
            {FILTER_CONFIG[key].label}
          </Button>
        ))}
      </div>

      {/* Timeline */}
      {filtered.length > 0 ? (
        <div className="relative space-y-4 pl-6">
          {/* Vertical line */}
          <div className="absolute top-0 bottom-0 left-[5px] w-0.5 bg-border" />

          {filtered.map((activity) => {
            const config = activityTypeConfig[activity.type]
            const Icon = config.icon
            const isSuccess = ['account_created', 'deal_created', 'so_created', 'reinstatement'].includes(activity.type)
            const isRejection = activity.type === 'rejection'
            const isStageChange = activity.type === 'stage_change'

            return (
              <div key={activity.id} className="relative flex gap-3">
                {/* Dot */}
                <div
                  className={cn(
                    'absolute -left-6 top-1.5 flex size-3 items-center justify-center rounded-full',
                    config.dotColor
                  )}
                />

                {/* Content Card */}
                <div
                  className={cn(
                    'min-w-0 flex-1 rounded-lg border p-3',
                    isSuccess && 'border-[#50cd89]/30 bg-[#e8fff3]/50',
                    isRejection && 'border-[#f1416c]/30 bg-[#fff5f8]/50',
                    !isSuccess && !isRejection && 'bg-muted/30'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={cn('mt-0.5 size-4 shrink-0', isRejection ? 'text-[#f1416c]' : isSuccess ? 'text-[#50cd89]' : 'text-muted-foreground')} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{activity.title}</p>

                      {/* Stage change: from -> to badges */}
                      {isStageChange && activity.metadata?.from && activity.metadata?.to && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <Badge variant={stageBadgeVariant(activity.metadata.from)} size="sm">
                            {activity.metadata.from}
                          </Badge>
                          <ArrowRight className="size-3 text-muted-foreground" />
                          <Badge variant={stageBadgeVariant(activity.metadata.to)} size="sm">
                            {activity.metadata.to}
                          </Badge>
                        </div>
                      )}

                      {/* Rejection: reason warning box */}
                      {isRejection && activity.metadata?.reason && (
                        <div className="mt-1.5 rounded-md border border-[#f6c000]/40 bg-[#fff8dd] px-3 py-2 text-xs text-[#b88800]">
                          {activity.metadata.reason}
                        </div>
                      )}

                      {/* Description */}
                      {activity.description && !isRejection && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {activity.description}
                        </p>
                      )}

                      {/* User + timestamp */}
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{activity.user}</span>
                        <span>·</span>
                        <span>{formatRelativeTime(activity.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No audit entries found</p>
        </div>
      )}
    </div>
  )
}

export { AuditTrail, type AuditTrailProps }
