import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/common/display/StatusBadge"

import { dealStageVariant, fmt } from "../../utils/dashboard/dashboard-format"
import type { CrmDashboardController } from "../../hooks/dashboard/useCrmDashboard"
import { DASHBOARD_STRINGS } from "./dashboard.strings"

export function DashboardClosingTable({ dash }: { dash: CrmDashboardController }) {
  const { closingThisMonth } = dash

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {DASHBOARD_STRINGS.closing.title(closingThisMonth.length)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {closingThisMonth.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {DASHBOARD_STRINGS.closing.empty}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">{DASHBOARD_STRINGS.closing.columns.deal}</th>
                  <th className="pb-2 font-medium">{DASHBOARD_STRINGS.closing.columns.account}</th>
                  <th className="pb-2 font-medium text-right">{DASHBOARD_STRINGS.closing.columns.value}</th>
                  <th className="pb-2 font-medium">{DASHBOARD_STRINGS.closing.columns.stage}</th>
                  <th className="pb-2 font-medium text-right">
                    {DASHBOARD_STRINGS.closing.columns.probability}
                  </th>
                  <th className="pb-2 font-medium">{DASHBOARD_STRINGS.closing.columns.closeDate}</th>
                  <th className="pb-2 font-medium">{DASHBOARD_STRINGS.closing.columns.owner}</th>
                </tr>
              </thead>
              <tbody>
                {closingThisMonth.map((d) => (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="py-2.5 font-medium">{d.name}</td>
                    <td className="py-2.5">{d.accountName}</td>
                    <td className="py-2.5 text-right">{fmt(d.value)}</td>
                    <td className="py-2.5">
                      <StatusBadge
                        variant={
                          dealStageVariant[d.stage] ?? "neutral"
                        }
                      >
                        {d.stage}
                      </StatusBadge>
                    </td>
                    <td className="py-2.5 text-right">{DASHBOARD_STRINGS.closing.probabilityValue(d.probability)}</td>
                    <td className="py-2.5">{d.closeDate}</td>
                    <td className="py-2.5">{d.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
