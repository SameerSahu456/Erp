import { useCallback } from "react"
import { toast } from "sonner"

import { KanbanBoard } from "@/components/common/views/KanbanBoard"
import { useKeepWindowScroll } from "@/shared/hooks"

import type { DealListItem } from "../../api"
import type { useDealsBoard } from "../../hooks/deals/useDealsBoard"
import { DealCard } from "./DealCard"
import { DEALS_STRINGS } from "./deals.strings"

type Board = ReturnType<typeof useDealsBoard>

const isDealDraggable = (deal: DealListItem) => deal.access_level !== "view"

// Say why a view-only card won't move, instead of failing silently. A fixed
// toast id keeps repeated attempts to one toast.
const warnViewOnly = () => toast.info(DEALS_STRINGS.toast.viewOnlyMove, { id: "deal-view-only-move" })

interface DealsKanbanViewProps {
  columns: Board["kanbanColumnsWithCounts"]
  items: Board["filteredKanbanItems"]
  infinite: Board["kanbanInfinite"]
  resetKey: Board["kanbanResetKey"]
  onMoveAcross: Board["handleKanbanMoveAcross"]
  onOpen: Board["openDeal"]
}

export function DealsKanbanView({
  columns,
  items,
  infinite,
  resetKey,
  onMoveAcross,
  onOpen,
}: DealsKanbanViewProps) {
  useKeepWindowScroll(resetKey)

  const renderDealCard = useCallback(
    (deal: DealListItem) => <DealCard deal={deal} onOpen={onOpen} />,
    [onOpen],
  )

  return (
    <KanbanBoard<DealListItem>
      key={resetKey}
      columns={columns}
      items={items}
      renderCard={renderDealCard}
      // View-only (mentioned) deals open fine but can't change stage.
      isItemDraggable={isDealDraggable}
      onLockedDragAttempt={warnViewOnly}
      onMoveAcross={onMoveAcross}
      columnInfinite={infinite}
      scrollRestoreKey="crm:deals:kanban"
    />
  )
}
