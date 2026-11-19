import { StatsRow } from "@/components/common/display/StatsRow"
import { ListPageShell } from "@/components/page-shells"

import { useLeadsBoard } from "../../hooks/leads/useLeadsBoard"
import { LeadsFilterAside } from "../../components/leads/LeadsFilterAside"
import { LeadsHeaderActions } from "../../components/leads/LeadsHeaderActions"
import { LeadsKanbanView } from "../../components/leads/LeadsKanbanView"
import { LeadsListView } from "../../components/leads/LeadsListView"
import { CRM_TAG_LIST } from "../../types"
import { CrmBoardToolbarFilters } from "../../components/shared/CrmBoardToolbarFilters"
import { CrmListToolbar } from "../../components/shared/CrmListToolbar"
import { CrmListState } from "../../components/shared/CrmListState"
import { LostReasonDialog } from "../../components/shared/LostReasonDialog"
import { LEADS_STRINGS as S } from "../../components/leads/leads.strings"

function LeadsPage() {
  const board = useLeadsBoard()

  const content = (
    <CrmListState isLoading={board.activeIsLoading} error={board.activeError} noun="leads">
      {board.view === "kanban" ? (
        <LeadsKanbanView
          columns={board.kanbanColumnsWithCounts}
          items={board.filteredKanbanItems}
          infinite={board.kanbanInfinite}
          resetKey={board.kanbanResetKey}
          onMoveAcross={board.handleKanbanMoveAcross}
          onOpen={board.openLead}
        />
      ) : (
        <LeadsListView
          leads={board.apiLeads}
          page={board.tablePage}
          pageSize={board.tablePageSize}
          total={board.tableTotal}
          isFetching={board.tableIsFetching}
          onPageChange={board.setTablePage}
          onPageSizeChange={board.setTablePageSize}
          canWrite={board.canWriteLead}
          onOpen={board.openLead}
          onCreate={board.openLeadNew}
        />
      )}
    </CrmListState>
  )

  return (
    <ListPageShell
      title={S.list.title}
      subtitle={S.list.subtitle}
      breadcrumbs={[{ label: S.list.breadcrumbCrm }, { label: S.list.breadcrumbLeads }]}
      actions={
        <LeadsHeaderActions
          view={board.view}
          onViewChange={board.setView}
          onAddLead={board.openLeadNew}
        />
      }
      stats={<StatsRow stats={board.kpiStats} />}
      toolbar={
        <CrmListToolbar
          search={board.kanbanSearch}
          onSearchChange={board.handleSearchChange}
          filtersOpen={board.filtersOpen}
          onToggleFilters={() => board.setFiltersOpen((v) => !v)}
          activeFilterCount={board.activeFilterCount}
          searchPlaceholder={S.list.searchPlaceholder}
          onClearAll={board.resetFilters}
          filters={
            <CrmBoardToolbarFilters
              createdOn={{
                label: S.filters.createdOn,
                value: board.dateRange,
                onChange: board.handleDateRangeChange,
              }}
              orderType={{
                label: S.filters.orderType,
                allLabel: S.filters.allOrderTypes,
                value: board.selectedTag,
                options: CRM_TAG_LIST,
                onChange: board.handleTagChange,
              }}
              assignee={{
                label: S.filters.assignedTo,
                placeholder: S.filters.assignedTo,
                value: board.selectedAssignees,
                onChange: board.handleAssigneesChange,
                disabled: board.onlyUnassigned,
              }}
            />
          }
        />
      }
    >
      <div className="flex">
        <LeadsFilterAside
          open={board.filtersOpen}
          filters={{
            selectedStage: board.selectedStage,
            onStageChange: board.handleStageChange,
            selectedPriority: board.selectedPriority,
            onPriorityChange: board.handlePriorityChange,
            selectedSource: board.selectedSource,
            onSourceChange: board.handleSourceChange,
            selectedPm: board.selectedPm,
            onPmChange: board.handlePmChange,
            selectedCategories: board.selectedCategories,
            onCategoriesChange: board.handleCategoriesChange,
            selectedOems: board.selectedOems,
            onOemsChange: board.handleOemsChange,
            selectedChannelTypes: board.selectedChannelTypes,
            onChannelTypesChange: board.handleChannelTypesChange,
            onlyUnassigned: board.onlyUnassigned,
            onOnlyUnassignedChange: board.handleOnlyUnassignedChange,
            onlyMentioned: board.onlyMentioned,
            onOnlyMentionedChange: board.handleOnlyMentionedChange,
            quoteValue: board.quoteValue,
            onQuoteValueChange: board.handleQuoteValueChange,
            dealValue: board.dealValue,
            onDealValueChange: board.handleDealValueChange,
            activeFilterCount: board.activeFilterCount,
            onClose: () => board.setFiltersOpen(false),
            onResetAll: board.resetFilters,
          }}
        />
        <div className="flex-1 min-w-0">{content}</div>
      </div>
      {/* Close-lost reason capture for kanban drag → "Closed Lost". */}
      <LostReasonDialog
        open={board.lostReasonOpen}
        onOpenChange={board.onLostReasonOpenChange}
        entityType="lead"
        entityId={board.lostEntityId}
        entityName={board.lostEntityName}
        onConfirm={board.handleKanbanLostConfirm}
      />
    </ListPageShell>
  )
}

export default LeadsPage
