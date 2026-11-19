import { useCallback } from "react"
import { toast } from "sonner"

import { KanbanBoard } from "@/components/common/views/KanbanBoard"
import { useKeepWindowScroll } from "@/shared/hooks"

import type { Lead } from "../../types"
import type { useLeadsBoard } from "../../hooks/leads/useLeadsBoard"
import { LeadCard } from "./LeadCard"
import { LEADS_STRINGS } from "./leads.strings"

type Board = ReturnType<typeof useLeadsBoard>

interface LeadsKanbanViewProps {
  columns: Board["kanbanColumnsWithCounts"]
  items: Board["filteredKanbanItems"]
  infinite: Board["kanbanInfinite"]
  resetKey: Board["kanbanResetKey"]
  onMoveAcross: Board["handleKanbanMoveAcross"]
  onOpen: Board["openLead"]
}

const isLeadDraggable = (lead: Lead) => lead.accessLevel !== "view"

// Say why a view-only card won't move, instead of failing silently. A fixed
// toast id keeps repeated attempts to one toast.
const warnViewOnly = () => toast.info(LEADS_STRINGS.toast.viewOnlyMove, { id: "lead-view-only-move" })

export function LeadsKanbanView({
  columns,
  items,
  infinite,
  resetKey,
  onMoveAcross,
  onOpen,
}: LeadsKanbanViewProps) {
  useKeepWindowScroll(resetKey)

  const renderLeadCard = useCallback(
    (lead: Lead) => <LeadCard lead={lead} onOpen={onOpen} />,
    [onOpen],
  )

  return (
    <KanbanBoard<Lead>
      key={resetKey}
      columns={columns}
      items={items}
      renderCard={renderLeadCard}
      // View-only (mentioned) leads open fine but can't change stage.
      isItemDraggable={isLeadDraggable}
      onLockedDragAttempt={warnViewOnly}
      onMoveAcross={onMoveAcross}
      columnInfinite={infinite}
      scrollRestoreKey="crm:leads:kanban"
    />
  )
}
