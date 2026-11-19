import { CheckCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import { NotificationList } from "../../components/notifications/NotificationList"
import { NOTIFICATIONS_STRINGS } from "../../components/notifications/notifications.strings"
import {
  FILTER_LABEL,
  useNotificationCenter,
  type FilterTab,
} from "../../hooks/notifications/useNotificationCenter"

function NotificationCenter() {
  const center = useNotificationCenter()

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-[650] leading-tight tracking-[-0.02em] text-foreground">
            {NOTIFICATIONS_STRINGS.header.title}
          </h1>
          {center.unreadCount > 0 && (
            <Badge variant="destructive" className="text-[11px] font-semibold">
              {NOTIFICATIONS_STRINGS.header.unreadBadge(center.unreadCount)}
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => center.markAllRead.mutate()}
          disabled={center.unreadCount === 0 || center.markAllRead.isPending}
          className="h-9"
        >
          <CheckCheck className="mr-1.5 size-3.5" />
          {center.markAllRead.isPending
            ? NOTIFICATIONS_STRINGS.header.markingAll
            : NOTIFICATIONS_STRINGS.header.markAllRead}
        </Button>
      </div>

      {/* Filter Tabs — All / Unread. */}
      <div
        className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-secondary/60 p-0.5 shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.04)]"
        role="tablist"
      >
        {(Object.keys(FILTER_LABEL) as FilterTab[]).map((tab) => {
          const active = center.filter === tab
          return (
            <button
              key={tab}
              type="button"
              onClick={() => center.setFilter(tab)}
              aria-pressed={active}
              className={cn(
                "inline-flex h-7 items-center rounded-md px-3 text-[12px] font-medium transition-all",
                active
                  ? "bg-card text-foreground shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.06)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {FILTER_LABEL[tab]}
            </button>
          )
        })}
      </div>

      {/* Notification list */}
      <NotificationList center={center} />
    </div>
  )
}

export default NotificationCenter
