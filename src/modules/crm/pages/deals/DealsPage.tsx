import { StatsRow } from "@/components/common/display/StatsRow"
import { ListPageShell } from "@/components/page-shells"

import { useDealsBoard } from "../../hooks/deals/useDealsBoard"
import { DealsFilterAside } from "../../components/deals/DealsFilterAside"
import { DealsHeaderActions } from "../../components/deals/DealsHeaderActions"
import { DealsKanbanView } from "../../components/deals/DealsKanbanView"
import { DealsListView } from "../../components/deals/DealsListView"
import { DEAL_TAG_LIST } from "../../api"
import { CrmBoardToolbarFilters } from "../../components/shared/CrmBoardToolbarFilters"
import { CrmListToolbar } from "../../components/shared/CrmListToolbar"
import { CrmListState } from "../../components/shared/CrmListState"
import { LostReasonDialog } from "../../components/shared/LostReasonDialog"
import { DEALS_STRINGS } from "../../components/deals/deals.strings"

function DealsPage() {
  const board = useDealsBoard()

  const content = (
    <CrmListState isLoading={board.activeIsLoading} error={board.activeError} noun="deals">
      {board.view === "kanban" ? (
        <DealsKanbanView
          columns={board.kanbanColumnsWithCounts}
          items={board.filteredKanbanItems}
          infinite={board.kanbanInfinite}
          resetKey={board.kanbanResetKey}
          onMoveAcross={board.handleKanbanMoveAcross}
          onOpen={board.openDeal}
        />
      ) : (
        <DealsListView
          rows={board.tableRows}
          page={board.tablePage}
          pageSize={board.tablePageSize}
          total={board.tableTotal}
          isFetching={board.tableIsFetching}
          onPageChange={board.setTablePage}
          onPageSizeChange={board.setTablePageSize}
          canWrite={board.canWriteDeal}
          onOpen={board.openDeal}
          onCreate={board.openDealNew}
        />
      )}
    </CrmListState>
  )

  return (
    <ListPageShell
      title={DEALS_STRINGS.list.title}
      subtitle={DEALS_STRINGS.list.subtitle}
      breadcrumbs={[
        { label: DEALS_STRINGS.list.breadcrumbCrm },
        { label: DEALS_STRINGS.list.breadcrumbDeals },
      ]}
      actions={
        <DealsHeaderActions
          view={board.view}
          onViewChange={board.setView}
          onAddDeal={board.openDealNew}
        />
      }
      stats={<StatsRow stats={board.kpiStats} />}
      toolbar={
        <CrmListToolbar
          search={board.search}
          onSearchChange={board.handleSearchChange}
          filtersOpen={board.filtersOpen}
          onToggleFilters={() => board.setFiltersOpen((v) => !v)}
          activeFilterCount={board.activeFilterCount}
          searchPlaceholder={DEALS_STRINGS.list.searchPlaceholder}
          onClearAll={board.resetFilters}
          filters={
            <CrmBoardToolbarFilters
              createdOn={{
                label: DEALS_STRINGS.filters.createdDate,
                value: board.dateRange,
                onChange: board.handleDateRangeChange,
              }}
              orderType={{
                label: DEALS_STRINGS.filters.orderType,
                allLabel: DEALS_STRINGS.filters.allOrderTypes,
                value: board.selectedTag,
                options: DEAL_TAG_LIST,
                onChange: board.handleTagChange,
              }}
              assignee={{
                label: DEALS_STRINGS.filters.owners,
                placeholder: DEALS_STRINGS.filters.owners,
                value: board.selectedOwners,
                onChange: board.handleOwnersChange,
                disabled: board.onlyUnassigned,
              }}
            />
          }
        />
      }
    >
      <div className="flex">
        <DealsFilterAside board={board} />
        <div className="flex-1 min-w-0">{content}</div>
      </div>
      {/* Close-lost reason capture for kanban drag → "Closed Lost". */}
      <LostReasonDialog
        open={board.lostReasonOpen}
        onOpenChange={board.onLostReasonOpenChange}
        entityType="deal"
        entityId={board.lostEntityId}
        entityName={board.lostEntityName}
        onConfirm={board.handleKanbanLostConfirm}
      />
    </ListPageShell>
  )
}

export default DealsPage
