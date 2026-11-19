import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { groupSupportByRole, OWNER_ROLES } from "../shared/assigneeGroups"
import { AssigneeCard } from "./AssigneeCard"
import { SupportMemberRow } from "./SupportMemberRow"
import { DEALS_STRINGS } from "./deals.strings"

interface DealAssigneesCardProps {
  assignees: { userId: string | null; fallbackName: string | null; role: string }[]
}

// Right-column "Account Owners" card — owner(s) as cards on top (AssigneeCard
// relabels "Assigned To" → "Account Owner"), then a divided section with
// Pre-Sales Manager / BDE as compact name-only rows.
export function DealAssigneesCard({ assignees }: DealAssigneesCardProps) {
  const owners = assignees.filter((a) => OWNER_ROLES.has(a.role))
  const supportGroups = groupSupportByRole(assignees)

  return (
    <Card size="sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{DEALS_STRINGS.detail.assignees.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {assignees.length === 0 ? (
          <p className="text-xs italic text-muted-foreground/60">{DEALS_STRINGS.detail.assignees.empty}</p>
        ) : (
          <>
            {owners.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {owners.map((a) => (
                  <AssigneeCard
                    key={`${a.role}:${a.userId ?? a.fallbackName}`}
                    userId={a.userId}
                    fallbackName={a.fallbackName}
                    role={a.role}
                  />
                ))}
              </div>
            )}
            {supportGroups.length > 0 && (
              <div className="mt-3 border-t border-border/50 pt-3">
                <div className="grid grid-cols-2 gap-2">
                  {supportGroups.map(({ role, members }) => (
                    <div key={role}>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {role}
                      </p>
                      <div className="space-y-2">
                        {members.map((a) => (
                          <SupportMemberRow
                            key={`${a.role}:${a.userId ?? a.fallbackName}`}
                            userId={a.userId}
                            fallbackName={a.fallbackName}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
