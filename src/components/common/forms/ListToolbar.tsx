import { Filter, LayoutGrid, List, Search, X } from "lucide-react"
import { UI } from "@/shared/constants"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { LIST_TOOLBAR_STRINGS as S } from './list-toolbar.strings'

export interface ListToolbarProps {
  search: string
  onSearchChange: (next: string) => void
  filtersOpen: boolean
  onToggleFilters: () => void
  activeFilterCount: number
  placeholder?: string
  view?: "kanban" | "list"
  onViewChange?: (next: "kanban" | "list") => void
  trailingAction?: ReactNode
  className?: string
}

export function ListToolbar({
  search,
  onSearchChange,
  filtersOpen,
  onToggleFilters,
  activeFilterCount,
  placeholder = "Search...",
  view,
  onViewChange,
  trailingAction,
  className,
}: ListToolbarProps) {
  const showViewToggle = !!view && !!onViewChange
  const filterLabel = activeFilterCount > 0 ? S.filterWithCount(activeFilterCount) : S.filter
  const listViewButton = showViewToggle ? (
    <button
      type="button"
      onClick={() => onViewChange("list")}
      aria-label={S.listView.ariaLabel}
      aria-pressed={view === "list"}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
        view === "list"
          ? "border border-border bg-primary text-primary-foreground shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white"
          : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground dark:hover:bg-white/5",
      )}
    >
      <List className="h-3.5 w-3.5" />
      {S.listView.label}
    </button>
  ) : null
  const kanbanViewButton = showViewToggle ? (
    <button
      type="button"
      onClick={() => onViewChange("kanban")}
      aria-label={S.kanbanView.ariaLabel}
      aria-pressed={view === "kanban"}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
        view === "kanban"
          ? "border border-border bg-primary text-primary-foreground shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white"
          : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground dark:hover:bg-white/5",
      )}
    >
      <LayoutGrid className="h-3.5 w-3.5" />
      {S.kanbanView.label}
    </button>
  ) : null
  const searchField = (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
      <Input
        placeholder={placeholder}
        maxLength={UI.FILTER_SEARCH_MAX_LENGTH}
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        className="h-9 pl-9 pr-8 text-[13px]"
      />
      {search && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          onClick={() => onSearchChange("")}
          aria-label={S.clearSearch}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )

  const viewSwitcher = showViewToggle ? (
    <div className="flex items-center rounded-xl border border-border bg-secondary/60 p-0.5 dark:bg-white/5">
      {listViewButton}
      {kanbanViewButton}
    </div>
  ) : null

  return (
    <Card className={cn("rounded-2xl p-3 sm:p-4 !overflow-visible relative z-10", className)}>
      <div className="hidden sm:flex items-center gap-3">
        {viewSwitcher}
        <Button
          variant={filtersOpen ? "default" : "outline"}
          size="sm"
          onClick={onToggleFilters}
          className="shrink-0"
        >
          <Filter className="h-3.5 w-3.5" />
          {filterLabel}
        </Button>
        <div className="relative min-w-[120px] flex-1">{searchField}</div>
        {trailingAction ? <div className="shrink-0">{trailingAction}</div> : null}
      </div>

      <div className="space-y-2 sm:hidden">
        {viewSwitcher && (
          <div className="flex items-center rounded-xl border border-border bg-secondary/60 p-0.5 dark:bg-white/5 [&>button]:flex-1 [&>button]:justify-center" role="tablist" aria-label={S.viewMode}>
            {listViewButton}
            {kanbanViewButton}
          </div>
        )}
        {searchField}
        <div className="flex items-center gap-2">
          <Button
            variant={filtersOpen ? "default" : "outline"}
            size="sm"
            onClick={onToggleFilters}
            className="flex-1"
          >
            <Filter className="h-3.5 w-3.5" />
            {filterLabel}
          </Button>
        </div>
        {trailingAction ? <div className="[&>*]:w-full">{trailingAction}</div> : null}
      </div>
    </Card>
  )
}
