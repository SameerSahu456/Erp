import { OverflowPillList } from "@/components/common/display/OverflowPillList"

import { CRM_SHARED_STRINGS } from "./crm-shared.strings"

const S = CRM_SHARED_STRINGS.userRoles

/**
 * A user's system roles on one line: the first role as plain text, then a "+N"
 * chip when there are more. Hovering shows the full list (SR No / Role) in the
 * same hover card the Accounts Categories column uses. Renders nothing for a
 * user with no roles. Shared by the account owner card and the access-request
 * queue.
 */
export function UserRoles({ roles }: { roles: readonly string[] | null | undefined }) {
  const list = roles ?? []
  if (list.length === 0) return null

  return (
    <OverflowPillList
      items={list}
      getItemLabel={(role) => role}
      getItemKey={(role, i) => `${role}-${i}`}
      columns={[
        {
          key: "index",
          header: S.srNo,
          render: (_role, index) => index + 1,
          className: "w-14 whitespace-nowrap text-muted-foreground",
        },
        { key: "role", header: S.columnHeader, render: (role) => role },
      ]}
      renderSummary={({ visibleItems, hiddenCount }) => (
        <div className="flex cursor-pointer items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="min-w-0 truncate">{visibleItems[0]}</span>
          {hiddenCount > 0 && (
            <span className="shrink-0 rounded bg-muted px-1 text-foreground/80 ring-1 ring-border/60">
              +{hiddenCount}
            </span>
          )}
        </div>
      )}
    />
  )
}
