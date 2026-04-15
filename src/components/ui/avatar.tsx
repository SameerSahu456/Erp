import * as React from "react"
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"

import { cn } from "@/lib/utils"

const avatarSizeClasses = {
  "24": "size-6",
  "28": "size-7",
  "34": "size-[34px]",
  "40": "size-10",
  "60": "size-[60px]",
  "80": "size-20",
  "100": "size-[100px]",
  // backward-compatible aliases
  sm: "size-6",
  default: "size-10",
  lg: "size-[60px]",
} as const

type AvatarSize = keyof typeof avatarSizeClasses

function Avatar({
  className,
  size = "default",
  shape = "circle",
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: AvatarSize
  shape?: "circle" | "rounded"
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar relative flex shrink-0 select-none after:absolute after:inset-0 after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten",
        avatarSizeClasses[size],
        shape === "circle" ? "rounded-full after:rounded-full" : "rounded-lg after:rounded-lg",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        "aspect-square size-full object-cover group-data-[size=sm]/avatar:rounded-full group-data-[size=default]/avatar:rounded-full group-data-[size=lg]/avatar:rounded-full",
        "rounded-[inherit]",
        className
      )}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-[inherit] bg-[#eef5ff] text-sm font-semibold text-[#1379f0]",
        "group-data-[size='24']/avatar:text-[10px]",
        "group-data-[size=sm]/avatar:text-xs",
        "group-data-[size='28']/avatar:text-xs",
        "group-data-[size='80']/avatar:text-xl",
        "group-data-[size='100']/avatar:text-2xl",
        className
      )}
      {...props}
    />
  )
}

function AvatarBadge({ className, status, ...props }: React.ComponentProps<"span"> & {
  status?: "online" | "offline" | "busy" | "away"
}) {
  const statusColors = {
    online: "bg-[#50cd89]",
    offline: "bg-[#a1a5b7]",
    busy: "bg-[#f1416c]",
    away: "bg-[#f6c000]",
  }

  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full ring-2 ring-background select-none",
        "group-data-[size=sm]/avatar:size-2",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        status ? statusColors[status] : "bg-primary text-primary-foreground bg-blend-color",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
}
