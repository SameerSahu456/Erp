import { useState, useMemo } from "react"
import { Bell, CheckCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/common/EmptyState"

import { notifications as initialNotifications } from "@/modules/crm/data/notifications"
import type { CrmNotification } from "@/modules/crm/types"

const FILTER_TABS = ["All", "Leads", "Deals", "Orders", "System"] as const
type FilterTab = (typeof FILTER_TABS)[number]

const filterMap: Record<FilterTab, CrmNotification["type"][] | null> = {
  All: null,
  Leads: ["lead"],
  Deals: ["deal"],
  Orders: ["order"],
  System: ["system"],
}

const typeBadgeVariant: Record<CrmNotification["type"], string> = {
  lead: "bg-[#eef5ff] text-[#0d4b94] dark:bg-[#0d4b94]/20 dark:text-[#3e96ff]",
  deal: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  order: "bg-[#fff8dd] text-[#b88800] dark:bg-[#b88800]/20 dark:text-[#f6c000]",
  system: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
}

const typeLabel: Record<CrmNotification["type"], string> = {
  lead: "Lead",
  deal: "Deal",
  order: "Order",
  system: "System",
}

function NotificationCenter() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("All")
  const [items, setItems] = useState<CrmNotification[]>(() =>
    initialNotifications.map((n) => ({ ...n }))
  )

  const filteredItems = useMemo(() => {
    const types = filterMap[activeFilter]
    if (!types) return items
    return items.filter((n) => types.includes(n.type))
  }, [items, activeFilter])

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read).length,
    [items]
  )

  const markAsRead = (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const markAllAsRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-[650] leading-tight tracking-[-0.02em] text-foreground">
            Notification Center
          </h1>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-[11px] font-semibold">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0} className="h-9">
          <CheckCheck className="mr-1.5 size-3.5" />
          Mark All as Read
        </Button>
      </div>

      {/* Filter Tabs */}
      <div
        className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-secondary/60 p-0.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
        role="tablist"
      >
        {FILTER_TABS.map((tab) => {
          const active = activeFilter === tab
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveFilter(tab)}
              aria-pressed={active}
              className={`inline-flex h-7 items-center rounded-md px-3 text-[12px] font-medium transition-all ${
                active
                  ? 'bg-card text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.06)]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          )
        })}
      </div>

      {/* Notification List */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description={
            activeFilter === "All"
              ? "You're all caught up! No notifications to show."
              : `No ${activeFilter.toLowerCase()} notifications to show.`
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredItems.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className={`group w-full cursor-pointer rounded-2xl border p-4 text-left transition-all hover:-translate-y-px hover:border-primary/20 hover:shadow-[0_4px_12px_-4px_rgba(16,24,40,0.06),0_2px_4px_-2px_rgba(16,24,40,0.04)] ${
                !notification.read
                  ? "border-primary/25 bg-primary/[0.04] shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                  : "border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.03)]"
              }`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="flex items-start gap-3">
                {/* Unread dot */}
                <div className="mt-1.5 shrink-0">
                  {!notification.read ? (
                    <span className="block size-2 rounded-full bg-primary shadow-[0_0_0_3px_rgba(15,27,45,0.12)]" />
                  ) : (
                    <span className="block size-2" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[13px] font-semibold ${
                        !notification.read ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {notification.title}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        typeBadgeVariant[notification.type]
                      }`}
                    >
                      {typeLabel[notification.type]}
                    </span>
                  </div>
                  <p className="truncate text-[12.5px] text-muted-foreground">
                    {notification.description}
                  </p>
                </div>

                {/* Timestamp */}
                <span className="mt-0.5 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {notification.timestamp}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default NotificationCenter
