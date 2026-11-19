import { Inbox, SearchX } from "lucide-react"

import { Typography } from "@/components/ui/typography"

import { CRM_SHARED_STRINGS } from "../crm-shared.strings"
import type { EmptyStateConfig } from "./types"

/** Empty-state row content: a "no results" variant (with a Clear-filters
 *  action) when filters are active, or a "no data yet" variant otherwise. */
export function BmtEmptyState({
  filtered,
  onClearFilters,
  config,
}: {
  filtered: boolean
  onClearFilters: () => void
  config?: EmptyStateConfig
}) {
  const Icon = filtered ? SearchX : Inbox
  const title = filtered
    ? CRM_SHARED_STRINGS.dataTableEmpty.filteredTitle
    : (config?.title ?? CRM_SHARED_STRINGS.dataTableEmpty.defaultTitle)
  const description = filtered
    ? CRM_SHARED_STRINGS.dataTableEmpty.filteredDescription
    : config?.description

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-2 flex justify-center text-gray-300 dark:text-zinc-700">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>
      <Typography variant="body" className="font-semibold" asChild>
        <div>{title}</div>
      </Typography>
      {description && (
        <Typography variant="body" tone="muted" className="max-w-sm" asChild>
          <p>{description}</p>
        </Typography>
      )}
      {filtered ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-2 inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          {CRM_SHARED_STRINGS.dataTableEmpty.clearFilters}
        </button>
      ) : (
        config?.action && (
          <button
            type="button"
            onClick={config.action.onClick}
            className="mt-2 inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            {config.action.label}
          </button>
        )
      )}
    </div>
  )
}
