import type { ReactNode } from "react"

import { EntityRef } from "@/components/common/display/EntityRef"
import { TruncatedText } from "@/components/common/display/TruncatedText"
import { cn } from "@/lib/utils"

/**
 * A record reference (document number, account name) that links to that
 * record's own page. Used in the PM-approvals queue tables and on the approval
 * pages. Built on EntityRef: the click never bubbles to the row, and without
 * access to the target it shows a no-permission toast instead of navigating.
 * Renders plain text when there is nowhere to link to.
 */
export function RecordLink({
  to,
  children,
  className,
}: {
  to: string | null | undefined
  children: ReactNode
  className?: string
}) {
  // Plain text trims to one line and reveals the full value in the app's
  // styled tooltip — never the native browser `title` box (PAGE-UI §0.14).
  const content =
    typeof children === "string" ? (
      <TruncatedText value={children} className="block max-w-full" />
    ) : (
      children
    )
  if (!to) return <>{content}</>
  return (
    <EntityRef
      href={to}
      value={typeof children === "string" ? children : undefined}
      // inline-block: trims inside a table cell yet still flows inline in a
      // sentence ("· Account name" in the approval panel headers).
      className={cn("inline-block min-w-0 max-w-full align-bottom", className)}
    >
      {content}
    </EntityRef>
  )
}

/** Account name → `/crm/accounts/:id`. */
export function AccountLink({
  accountId,
  children,
  className,
}: {
  accountId: string | null | undefined
  children: ReactNode
  className?: string
}) {
  return (
    <RecordLink to={accountId ? `/crm/accounts/${accountId}` : null} className={className}>
      {children}
    </RecordLink>
  )
}
