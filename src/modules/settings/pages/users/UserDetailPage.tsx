import { useParams, Navigate } from "react-router-dom"
import { Mail, Building2, Shield, Clock } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Typography } from "@/components/ui/typography"
import { PageHeader } from "@/components/page-shells"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { formatIST_date } from "@shared/lib/date"
import { AccessGuard } from "@shared/rbac"
import { useUser, getUserDisplayName } from "@modules/users"

import { usersListHref } from "../../hooks/users/usersListHref"
import { UserActivityTimeline } from "../../components/users/UserActivityTimeline"
import { UserDetailActions } from "../../components/users/UserDetailActions"
import { USER_ACTIVITY_STRINGS as S } from "../../components/users/user-activity.strings"
import { USER_ACTIVITY_LOG_ACCESS } from "../../components/users/user-activity-access"

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: user, isLoading, isError } = useUser(id ?? "")

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Typography variant="body" tone="muted">
          {S.detail.activityHistory}…
        </Typography>
      </div>
    )
  }

  if (isError || !user) {
    return <Navigate to="/settings/users" replace />
  }

  const name = getUserDisplayName(user)
  const role = user.roles.join(", ") || "—"
  const status: "Active" | "Inactive" = user.is_active ? "Active" : "Inactive"
  const lastLogin = user.last_login_at ? formatIST_date(user.last_login_at) : "—"

  const details = [
    { icon: Mail, label: S.detail.fields.email, value: user.email },
    { icon: Shield, label: S.detail.fields.role, value: role },
    { icon: Building2, label: S.detail.fields.department, value: user.department || "—" },
    { icon: Clock, label: S.detail.fields.lastLogin, value: lastLogin },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={name}
        subtitle={S.detail.subtitle}
        backHref={usersListHref()}
        actions={<UserDetailActions user={user} />}
      />

      {/* Profile card */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarFallback>
                <Typography variant="body-lg" className="font-medium">
                  {initials(name)}
                </Typography>
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Typography variant="subsection-title">{name}</Typography>
                <StatusBadge variant={status === "Active" ? "success" : "neutral"}>
                  {status}
                </StatusBadge>
              </div>
              <Typography variant="body" tone="muted" className="block truncate">
                {user.email}
              </Typography>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-4">
          {details.map((d) => {
            const Icon = d.icon
            return (
              <div key={d.label} className="space-y-1">
                <Typography
                  variant="helper"
                  tone="muted"
                  className="flex items-center gap-1.5 uppercase tracking-wide"
                >
                  <Icon className="size-3.5" />
                  {d.label}
                </Typography>
                <Typography variant="body-strong" className="block truncate">
                  {d.value}
                </Typography>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Activity history — visible only to superuser / admin roles / holders
          of crm:user_log_read (see USER_ACTIVITY_LOG_ACCESS). */}
      <AccessGuard rule={USER_ACTIVITY_LOG_ACCESS}>
        <Card className="p-5">
          <Typography
            variant="body-strong"
            tone="muted"
            className="mb-4 block uppercase tracking-wide"
          >
            {S.detail.activityHistory}
          </Typography>
          <UserActivityTimeline userId={user.id} mode="pager" urlKey="act" />
        </Card>
      </AccessGuard>
    </div>
  )
}
