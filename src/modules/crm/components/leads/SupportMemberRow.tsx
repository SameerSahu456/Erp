import { getUserDisplayName, useUser } from "@modules/users"

import { Typography } from "@/components/ui/typography"

interface SupportMemberRowProps {
  userId: string | null
  fallbackName: string | null
}

// Compact "Pre-Sales / BDE" row — muted avatar + name only (no email/phone),
// mirroring the support presentation on the demo CRM detail pages.
export function SupportMemberRow({ userId, fallbackName }: SupportMemberRowProps) {
  const userQuery = useUser(userId ?? "")
  const user = userQuery.data
  const displayName = user ? getUserDisplayName(user) : (fallbackName ?? "—")
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex items-center gap-2">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
        {initials}
      </div>
      <Typography variant="body" tone="muted" truncate className="min-w-0 flex-1">
        {displayName}
      </Typography>
    </div>
  )
}
