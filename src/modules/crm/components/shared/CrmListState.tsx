import type { ReactNode } from "react"

import { CRM_SHARED_STRINGS } from "./crm-shared.strings"

interface CrmListStateProps {
  isLoading: boolean
  error: unknown
  /** Plural noun for the messages, e.g. "leads" / "deals". */
  noun: string
  children: ReactNode
}

// Shared loading / error card wrapper for CRM list pages. Renders the standard
// card while the query is loading or errored, otherwise renders the content.
// Replaces the loading/error blocks that were copy-pasted across list pages.
export function CrmListState({ isLoading, error, noun, children }: CrmListStateProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        {CRM_SHARED_STRINGS.listState.loading(noun)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
        {error instanceof Error
          ? error.message
          : CRM_SHARED_STRINGS.listState.loadError(noun)}
      </div>
    )
  }

  return <>{children}</>
}
