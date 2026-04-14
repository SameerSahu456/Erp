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
  lead: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  deal: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  order: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-display font-semibold">
            Notification Center
          </h2>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
          <CheckCheck className="mr-1 size-4" />
          Mark All as Read
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 rounded-lg border p-1 w-fit">
        {FILTER_TABS.map((tab) => (
          <Button
            key={tab}
            variant={activeFilter === tab ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilter(tab)}
          >
            {tab}
          </Button>
        ))}
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
              className={`w-full text-left rounded-lg border p-4 transition-colors hover:bg-muted/50 cursor-pointer ${
                !notification.read
                  ? "bg-primary/5 border-primary/20"
                  : "bg-background"
              }`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="flex items-start gap-3">
                {/* Unread dot */}
                <div className="mt-1.5 shrink-0">
                  {!notification.read ? (
                    <span className="block size-2.5 rounded-full bg-primary" />
                  ) : (
                    <span className="block size-2.5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`font-medium text-sm ${
                        !notification.read ? "" : "text-muted-foreground"
                      }`}
                    >
                      {notification.title}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        typeBadgeVariant[notification.type]
                      }`}
                    >
                      {typeLabel[notification.type]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {notification.description}
                  </p>
                </div>

                {/* Timestamp */}
                <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
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
