import { getUserDisplayName, useUser } from "@modules/users"

interface AssigneeCardProps {
  userId: string | null
  fallbackName: string | null
  role: string
}

export function AssigneeCard({ userId, fallbackName, role }: AssigneeCardProps) {
  const userQuery = useUser(userId ?? "")
  const user = userQuery.data
  const displayName = user ? getUserDisplayName(user) : (fallbackName ?? "—")
  const email = user?.email?.trim() || null
  const phone = user?.phone?.trim() || null
  // Show the user's actual system role(s) in place of the position label.
  // Falls back to `role` (the lead position: "Assigned To" / "BDE" /
  // "Pre-Sales Manager") until the user record — and its roles — resolve.
  const roles = user?.roles ?? []
  const roleText = roles.length > 0 ? roles.join(", ") : role
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/40 p-2 transition-colors hover:bg-muted/60">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary ring-1 ring-primary/20">
        {initials}
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-xs font-medium">{displayName}</p>
        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" title={roleText}>
          {roleText}
        </p>
        {email && (
          <p className="truncate text-[10px] text-muted-foreground">{email}</p>
        )}
        {phone && (
          <p className="truncate text-[10px] text-muted-foreground">{phone}</p>
        )}
      </div>
    </div>
  )
}
