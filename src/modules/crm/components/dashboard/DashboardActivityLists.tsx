import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { fmt } from "../../utils/dashboard/dashboard-format"
import type { CrmDashboardController } from "../../hooks/dashboard/useCrmDashboard"
import { DASHBOARD_STRINGS } from "./dashboard.strings"

export function DashboardActivityLists({ dash }: { dash: CrmDashboardController }) {
  const { recentSales, scheduledMeetings } = dash

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <CardTitle>{DASHBOARD_STRINGS.activity.recentWonTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSales.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {DASHBOARD_STRINGS.activity.recentWonEmpty}
            </p>
          ) : (
            <div className="space-y-3">
              {recentSales.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.accountName} &middot; {DASHBOARD_STRINGS.activity.closedPrefix(d.closeDate)}
                    </p>
                  </div>
                  <p className="font-semibold text-sm text-emerald-600 whitespace-nowrap ml-3">
                    {fmt(d.value)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Meetings */}
      <Card>
        <CardHeader>
          <CardTitle>{DASHBOARD_STRINGS.activity.upcomingMeetingsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {scheduledMeetings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {DASHBOARD_STRINGS.activity.upcomingMeetingsEmpty}
            </p>
          ) : (
            <div className="space-y-3">
              {scheduledMeetings.slice(0, 5).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.date} &middot; {m.startTime}–{m.endTime}
                      {m.location && ` &middot; ${m.location}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-3 whitespace-nowrap">
                    {m.type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
