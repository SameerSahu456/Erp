import { cn } from "@/lib/utils"

import { notificationHref } from "@/shared/notifications/routing"
import {
  entityLabel,
  formatNotificationTime,
  stripMentionMarkup,
  styleForType,
} from "@/shared/notifications/format"
import type { NotificationWire } from "@/shared/notifications/api"

export function NotificationRow({
  notification,
  onClick,
}: {
  notification: NotificationWire
  onClick: (n: NotificationWire) => void
}) {
  const href = notificationHref(notification)
  const clickable = href !== null
  const style = styleForType(notification.notification_type)
  const Icon = style.icon

  // Description carries raw `@[Name](uuid)` markup; strip it and hide the line
  // when only bare @mentions remain.
  const cleanedDescription = notification.description
    ? stripMentionMarkup(notification.description)
    : ""
  const hasMeaningfulDescription =
    cleanedDescription.length > 0 &&
    cleanedDescription.replace(/@\S+/g, "").trim().length > 0

  const label = entityLabel(notification.entity_type)

  return (
    <button
      type="button"
      onClick={() => clickable && onClick(notification)}
      disabled={!clickable}
      className={cn(
        "group w-full rounded-2xl border p-4 text-left transition-all",
        clickable &&
          "cursor-pointer hover:-translate-y-px hover:border-primary/20 hover:shadow-[0_4px_12px_-4px_rgb(var(--shadow-rgb)/0.06),0_2px_4px_-2px_rgb(var(--shadow-rgb)/0.04)]",
        !notification.is_read
          ? "border-primary/25 bg-primary/[0.04] shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.04)]"
          : "border-border bg-card shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.03)]",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Type-tinted avatar */}
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            style.tintClass,
          )}
        >
          <Icon className={cn("size-4", style.iconClass)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "text-[13px]",
                !notification.is_read
                  ? "font-semibold text-foreground"
                  : "font-normal text-foreground/80",
              )}
            >
              {notification.title}
            </span>
            {label && (
              <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {label}
              </span>
            )}
          </div>
          {hasMeaningfulDescription && (
            <p className="text-[12.5px] leading-snug text-muted-foreground">
              {cleanedDescription}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {formatNotificationTime(notification.created_at)}
          </span>
          {!notification.is_read && (
            <span
              aria-hidden
              className="size-2 rounded-full bg-primary shadow-[0_0_0_3px_rgb(var(--shadow-rgb)/0.12)]"
            />
          )}
        </div>
      </div>
    </button>
  )
}
