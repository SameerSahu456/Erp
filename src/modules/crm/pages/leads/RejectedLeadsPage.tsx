import { DateRangePicker } from "@/components/common/pickers/DateRangePicker"
import { ListPageShell } from "@/components/page-shells"

import { useRejectedLeads } from "../../hooks/leads/useRejectedLeads"
import { RejectedLeadsFilterAside } from "../../components/leads/RejectedLeadsFilterAside"
import { RejectedLeadsTable } from "../../components/leads/RejectedLeadsTable"
import { AsyncUserMultiSelect } from "../../components/shared/AsyncUserMultiSelect"
import { CrmListToolbar } from "../../components/shared/CrmListToolbar"
import { LEADS_STRINGS as S } from "../../components/leads/leads.strings"

function RejectedLeadsPage() {
  const board = useRejectedLeads()

  const content = (() => {
    if (board.isLoading) {
      return (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {S.rejected.loading}
        </div>
      )
    }

    if (board.isError) {
      return (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
          {board.error instanceof Error ? board.error.message : S.rejected.loadError}
        </div>
      )
    }

    return (
      <RejectedLeadsTable
        leads={board.rejectedLeads}
        page={board.page}
        pageSize={board.pageSize}
        total={board.totalRejected}
        isFetching={board.isFetching}
        onPageChange={board.setPage}
        onPageSizeChange={board.setPageSize}
        onOpen={board.openLead}
      />
    )
  })()

  return (
    <ListPageShell
      title={S.rejected.title}
      subtitle={S.rejected.subtitle}
      breadcrumbs={[
        { label: S.rejected.breadcrumbCrm },
        { label: S.rejected.breadcrumbLeads, href: "/crm/leads" },
        { label: S.rejected.breadcrumbRejected },
      ]}
      className="animate-fade-in-up"
      toolbar={
        <CrmListToolbar
          search={board.search}
          onSearchChange={board.setSearch}
          filtersOpen={board.filtersOpen}
          onToggleFilters={() => board.setFiltersOpen((v) => !v)}
          activeFilterCount={board.activeFilterCount}
          searchPlaceholder={S.rejected.searchPlaceholder}
          onClearAll={board.clearFilters}
          filters={
            // Rejected On + Assigned To sit right beside the Filters button
            // (same chips as Leads). Assigned To is disabled while "unassigned
            // only" is ticked in the aside.
            <>
              <div className="w-[190px]">
                <DateRangePicker
                  value={board.dateRange}
                  onChange={board.handleDateRangeChange}
                  placeholder={S.rejected.filters.rejectedDate}
                  className="h-9"
                />
              </div>
              <div className="w-[150px]">
                <AsyncUserMultiSelect
                  value={board.selectedOwners}
                  onValueChange={board.setSelectedOwners}
                  label={S.filters.assignedTo}
                  placeholder={S.filters.assignedTo}
                  className="h-9"
                  disabled={board.onlyUnassigned}
                />
              </div>
              <div className="w-[150px]">
                <AsyncUserMultiSelect
                  value={board.selectedRejectors}
                  onValueChange={board.setSelectedRejectors}
                  label={S.rejected.filters.rejectedBy}
                  placeholder={S.rejected.filters.rejectedBy}
                  className="h-9"
                />
              </div>
            </>
          }
        />
      }
    >
      <div className="flex">
        <RejectedLeadsFilterAside
          open={board.filtersOpen}
          onlyUnassigned={board.onlyUnassigned}
          onOnlyUnassignedChange={board.handleOnlyUnassignedChange}
          selectedCategories={board.selectedCategories}
          onCategoriesChange={board.setSelectedCategories}
          selectedOems={board.selectedOems}
          onOemsChange={board.setSelectedOems}
          selectedReasons={board.selectedReasons}
          onReasonsChange={board.setSelectedReasons}
          activeFilterCount={board.activeFilterCount}
          onClose={() => board.setFiltersOpen(false)}
          onClearAll={board.clearFilters}
        />
        <div className="flex-1 min-w-0 space-y-3">
          {board.isFetching && !board.isLoading && (
            <div className="text-xs text-muted-foreground">
              {S.rejected.refreshing}
            </div>
          )}
          {content}
        </div>
      </div>
    </ListPageShell>
  )
}

export default RejectedLeadsPage
