import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AlertTriangle, Bell, BellOff, CheckCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Typography } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useRefreshUnreadCountOnNavigation,
  useUnreadNotificationCount,
} from "@/shared/notifications/hooks/useNotifications"
import { notificationHref } from "@/shared/notifications/routing"
import {
  entityLabel,
  formatNotificationTime,
  stripMentionMarkup,
  styleForType,
} from "@/shared/notifications/format"
import type { NotificationWire } from "@/shared/notifications/api"

export function NotificationPopover() {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const navigate = useNavigate()

  // Re-fetch the unread count on every route change. The bell sits in
  // the persistent header so it never unmounts; without this hook the
  // badge would only update on full page reload or when the popover
  // was opened.
  useRefreshUnreadCountOnNavigation()

  const { data: unreadCount = 0 } = useUnreadNotificationCount()

  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useNotifications(filter === "unread", { enabled: open })

  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const items = useMemo<NotificationWire[]>(
    () => (data?.pages ?? []).flatMap((p) => p.items),
    [data?.pages],
  )

  // IntersectionObserver sentinel — load next page when the user scrolls
  // near the bottom of the popover scroll area.
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!open || !sentinelRef.current || !scrollerRef.current || !hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !isFetchingNextPage && hasNextPage) {
            fetchNextPage()
          }
        }
      },
      { root: scrollerRef.current, rootMargin: "0px 0px 100px 0px", threshold: 0.01 },
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [open, hasNextPage, isFetchingNextPage, fetchNextPage])

  function handleRowClick(n: NotificationWire) {
    if (!n.is_read) markRead.mutate(n.id)
    const href = notificationHref(n)
    if (href) {
      setOpen(false)
      navigate(href)
    }
  }

  // Visual cap so the badge stays inside the bell glyph at any count.
  const badgeText = unreadCount > 9 ? "9+" : String(unreadCount)
  const hasUnread = unreadCount > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon" className="h-9 w-9 relative" />}
      >
        <Bell className="h-4 w-4" />
        {hasUnread && (
          <>
            {/* Soft ping behind the badge — animates ONCE per mount so
                the user gets a "something arrived" cue without it
                strobing forever. */}
            <span
              aria-hidden
              className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-rose-500/40 animate-ping"
            />
            {/* Solid badge sits on top of the ping. The `ring` cuts it
                cleanly against the bell behind it — the previous
                bare-edge `bg-destructive` looked harsh because the red
                bled into the icon. */}
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 inline-flex items-center justify-center",
                "h-4 min-w-4 px-1 rounded-full text-[10px] font-semibold leading-none",
                "bg-rose-500 text-white ring-2 ring-background",
              )}
            >
              {badgeText}
            </span>
          </>
        )}
        <span className="sr-only">Notifications</span>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[400px] p-0 overflow-hidden">
        {/* Header — title left, filter pills right. Mark-all-read is a
            full-width strip below to keep the title row uncluttered. */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Notifications</h4>
            {hasUnread && (
              <span className="inline-flex items-center justify-center rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "h-6 px-2.5 text-[11px] font-medium rounded transition-colors",
                filter === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={cn(
                "h-6 px-2.5 text-[11px] font-medium rounded transition-colors",
                filter === "unread"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Unread
            </button>
          </div>
        </div>

        {hasUnread && (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 px-4 py-1.5",
              "text-[11px] font-medium text-primary",
              "bg-muted/30 hover:bg-muted/50 transition-colors border-b border-border",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            <CheckCheck className="size-3" />
            {markAllRead.isPending ? "Marking all as read…" : "Mark all as read"}
          </button>
        )}

        <ScrollArea className="h-[420px]" ref={scrollerRef}>
          {isLoading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Bell className="size-6 opacity-30" />
              <Typography variant="helper" tone="inherit" asChild><p>Loading notifications…</p></Typography>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-destructive">
              <AlertTriangle className="size-6" />
              <Typography variant="helper" tone="inherit" asChild><p>Failed to load notifications.</p></Typography>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <BellOff className="size-6 opacity-40" />
              <p className="text-sm font-medium text-foreground/70">
                {filter === "unread" ? "You're all caught up" : "No notifications yet"}
              </p>
              <Typography variant="caption" tone="inherit" asChild><p>
                {filter === "unread"
                  ? "New unread notifications will appear here."
                  : "Mentions, task assignments, and stage changes will land here."}
              </p></Typography>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {items.map((n) => {
                const href = notificationHref(n)
                const clickable = href !== null
                const style = styleForType(n.notification_type)
                const Icon = style.icon
                // Description is comment/note text with mention markup
                // baked in. After stripping, a comment that contained
                // *only* mentions (e.g. `@Admin Demo`) collapses to a
                // bare `@name` line that adds no signal — hide it so the
                // row stays clean. Same when description is genuinely
                // empty.
                const cleanedDescription = n.description
                  ? stripMentionMarkup(n.description)
                  : ""
                const hasMeaningfulDescription =
                  cleanedDescription.length > 0 &&
                  // After stripping, if the whole thing is just `@name`
                  // mentions and nothing else, treat as empty so we
                  // surface entity context instead of a useless line.
                  cleanedDescription.replace(/@\S+/g, "").trim().length > 0
                const label = entityLabel(n.entity_type)
                return (
                  <div
                    key={n.id}
                    role={clickable ? "button" : undefined}
                    tabIndex={clickable ? 0 : -1}
                    onClick={() => clickable && handleRowClick(n)}
                    onKeyDown={(e) => {
                      if (clickable && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault()
                        handleRowClick(n)
                      }
                    }}
                    className={cn(
                      "group relative flex gap-3 px-4 py-3 transition-colors",
                      clickable && "cursor-pointer hover:bg-muted/40",
                      // Unread: thin colored bar on the left edge — much
                      // cleaner than a full background tint.
                      !n.is_read &&
                        "before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-r-full before:bg-rose-500",
                      n.is_read && "opacity-80",
                    )}
                  >
                    {/* Avatar-style type icon */}
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        style.tintClass,
                      )}
                    >
                      <Icon className={cn("size-4", style.iconClass)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-[13px] leading-snug line-clamp-2",
                            n.is_read ? "font-normal text-foreground/80" : "font-semibold",
                          )}
                        >
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span
                            aria-hidden
                            className="mt-1 size-1.5 shrink-0 rounded-full bg-rose-500"
                          />
                        )}
                      </div>
                      {hasMeaningfulDescription && (
                        <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground line-clamp-2">
                          {cleanedDescription}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground/80">
                        <span>{formatNotificationTime(n.created_at)}</span>
                        {label && (
                          <>
                            <span aria-hidden className="text-muted-foreground/40">
                              •
                            </span>
                            <span className="inline-flex items-center rounded border border-border/60 bg-muted/40 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              {label}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {hasNextPage && (
                <Typography variant="caption" align="center" asChild>
                  <div
                    ref={sentinelRef}
                    className="py-3"
                  >
                    {isFetchingNextPage ? "Loading more…" : "Scroll for more"}
                  </div>
                </Typography>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
