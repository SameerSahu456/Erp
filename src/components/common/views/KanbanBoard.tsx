import * as React from "react"
import {
  DndContext,
  closestCorners,
  pointerWithin,
  defaultDropAnimationSideEffects,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
  type DropAnimation,
  useDroppable,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { cn } from "@/lib/utils"
import { Typography } from "@/components/ui/typography"
import { useScrollRestoration } from "@/shared/hooks"

import { KANBAN_BOARD_STRINGS as S } from './kanban-board.strings'

// Drop animation tuned for "settle, don't bounce".
// - 260ms with a soft cubic-bezier matches dnd-kit's recommended "smooth"
//   curve while staying under the human "instantaneous" threshold (~300ms).
// - `dragSourceOpacity: 0` keeps the placeholder card hidden during the
//   drop animation so the overlay appears to land into its new slot
//   instead of fading out on top of a duplicate underneath.
const dropAnimation: DropAnimation = {
  duration: 260,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0",
      },
    },
  }),
}

interface KanbanColumnConfig {
  id: string
  label: string
  color?: string
  count?: number
}

/**
 * Optional per-column infinite-scroll wiring. When provided, each column
 * exposes a sentinel that fires `onLoadMore(columnId)` as the user scrolls
 * near the bottom — the parent decides whether more pages are available
 * (`hasMore`) and whether a fetch is currently in flight (`loading`).
 */
interface KanbanColumnInfiniteConfig {
  hasMore: Record<string, boolean>
  loading: Record<string, boolean>
  onLoadMore: (columnId: string) => void
}

interface KanbanBoardProps<T extends { id: string }> {
  columns: KanbanColumnConfig[]
  items: Record<string, T[]>
  renderCard: (item: T) => React.ReactNode
  onMoveAcross?: (itemId: string, fromColumn: string, toColumn: string) => void
  onReorder?: (columnId: string, orderedIds: string[]) => void
  className?: string
  draggable?: boolean
  /**
   * Optional per-card drag gate (on top of the board-level `draggable`).
   * Return false to pin a card in place — e.g. a view-only record the viewer
   * may open but not move. Omit to keep every card draggable.
   */
  isItemDraggable?: (item: T) => boolean
  /**
   * Fired once when the user tries to DRAG a card `isItemDraggable` pinned
   * (press + move past a small threshold — a plain click still opens it).
   * Use it to say why the card won't move instead of failing silently.
   */
  onLockedDragAttempt?: (item: T) => void
  columnInfinite?: KanbanColumnInfiniteConfig
  /**
   * Opt-in scroll restoration. When set, the board's horizontal track and
   * every column's vertical card list save their scroll offset to
   * sessionStorage and restore it on remount (e.g. after a detail
   * round-trip or browser back/forward). Pass a stable per-board key like
   * `"crm:leads:kanban"`; column scrollers derive `<key>:col:<columnId>`.
   */
  scrollRestoreKey?: string
}

// Fixed kanban column width. Every column renders at this exact size in
// every state, so a single filtered stage and the full multi-stage board
// show identical column widths. The board scrolls horizontally when the
// columns overflow the viewport (standard kanban behaviour).
const KANBAN_COLUMN_WIDTH = "260px"

function KanbanBoard<T extends { id: string }>({
  columns,
  items,
  renderCard,
  onMoveAcross,
  onReorder,
  className,
  draggable = true,
  isItemDraggable,
  onLockedDragAttempt,
  columnInfinite,
  scrollRestoreKey,
}: KanbanBoardProps<T>) {
  // Restore the horizontal board track (which columns are in view). Column
  // vertical scrollers are restored individually inside KanbanColumn.
  const boardScrollRef = useScrollRestoration<HTMLDivElement>(
    scrollRestoreKey ? `${scrollRestoreKey}:board` : "",
    { enabled: !!scrollRestoreKey },
  )
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [localItems, setLocalItems] = React.useState(items)
  // Tracks activeId synchronously without re-running the items-sync effect
  // when the id flips. We want the sync to fire only when the parent's
  // `items` prop changes (refetch or optimistic write), never on the same
  // tick that `setActiveId(null)` is called — otherwise the dropped card
  // would visually snap back to its origin column for one frame while the
  // mutation is still in flight.
  const activeIdRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  // Sync external items into the local mirror — but never mid-drag.
  // Why: with the global query defaults set to `refetchOnMount: "always"`
  // and `staleTime: 0` (see `src/shared/constants/api.ts`), the per-stage
  // queries refetch aggressively. If a refetch lands during a drag, it
  // produces a new `items` reference, this effect fires, and `setLocalItems`
  // would clobber the optimistic positions set by `handleDragOver` — which
  // de-stabilises `SortableContext.items` content and trips React's depth
  // guard inside dnd-kit's `measureDroppableContainers` layout effect.
  // Gating on `activeIdRef.current` (not the state) keeps the sync gated
  // during a drag without re-running on the drop tick.
  React.useEffect(() => {
    if (activeIdRef.current) return
     
    setLocalItems(items)
  }, [items])

  // Debounce ref used by `handleDragOver` to prevent the cursor from
  // shuttling a card back-and-forth across a column boundary on every
  // mouse-move event. Pattern from dnd-kit's "MultipleContainers" recipe.
  const recentlyMovedToNewContainer = React.useRef(false)
  React.useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false
    })
  }, [localItems])

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  )

  const findColumn = React.useCallback(
    (id: string): string | undefined => {
      // Check if id is a column id
      if (localItems[id]) return id
      // Otherwise find which column contains this item
      for (const [colId, colItems] of Object.entries(localItems)) {
        if (colItems.some((item) => item.id === id)) return colId
      }
      return undefined
    },
    [localItems]
  )

  // Pointer-first collision: whatever the cursor is physically over wins, so an
  // empty (short) column still receives the drop. `closestCorners` alone picks
  // the neighbouring column's card, which is how a card dropped on an empty
  // "Closed Won" ended up in "Closed Lost". Cards beat the column container so
  // in-column ordering still works; closestCorners is the off-target fallback.
  const collisionDetection = React.useCallback<CollisionDetection>(
    (args) => {
      const hits = pointerWithin(args)
      if (hits.length > 0) {
        const cardHits = hits.filter((h) => !localItems[String(h.id)])
        return cardHits.length > 0 ? cardHits : hits
      }
      return closestCorners(args)
    },
    [localItems]
  )

  const activeItem = React.useMemo(() => {
    if (!activeId) return null
    for (const colItems of Object.values(localItems)) {
      const item = colItems.find((i) => i.id === activeId)
      if (item) return item
    }
    return null
  }, [activeId, localItems])

  const handleDragStart = (event: DragStartEvent) => {
    if (!draggable) return
    setActiveId(String(event.active.id))
  }

  const handleDragOver = (event: DragOverEvent) => {
    if (!draggable) return
    // Debounce: a card just moved across a boundary; ignore further
    // dragOver ticks until the next animation frame so the cursor can't
    // shuttle it back and trigger an oscillation cascade.
    if (recentlyMovedToNewContainer.current) return

    const { active, over } = event
    if (!over) return

    const activeCol = findColumn(String(active.id))
    const overCol = findColumn(String(over.id))

    if (!activeCol || !overCol || activeCol === overCol) return

    recentlyMovedToNewContainer.current = true
    setLocalItems((prev) => {
      const activeItems = [...(prev[activeCol] ?? [])]
      const overItems = [...(prev[overCol] ?? [])]
      const activeIndex = activeItems.findIndex((i) => i.id === String(active.id))
      if (activeIndex === -1) return prev

      const movedItem = activeItems[activeIndex]
      if (!movedItem) return prev
      activeItems.splice(activeIndex, 1)
      const overIndex = overItems.findIndex((i) => i.id === String(over.id))
      const insertIndex = overIndex >= 0 ? overIndex : overItems.length

      overItems.splice(insertIndex, 0, movedItem)

      return {
        ...prev,
        [activeCol]: activeItems,
        [overCol]: overItems,
      }
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    if (!draggable) {
      setActiveId(null)
      return
    }

    const { active, over } = event
    setActiveId(null)

    // Drop on empty space — revert localItems to source-of-truth.
    // The items-sync effect no longer fires on activeId change, so we
    // must roll back explicitly here; otherwise `handleDragOver` may
    // have moved the card into a column the user didn't actually drop on.
    if (!over) {
      setLocalItems(items)
      return
    }

    // Use the EXTERNAL items prop to find the original source column
    // (localItems has been modified by handleDragOver during the drag)
    const originalSourceCol = Object.entries(items).find(([, colItems]) =>
      colItems.some((i) => i.id === String(active.id))
    )?.[0]

    const overCol = findColumn(String(over.id))

    if (!originalSourceCol || !overCol) {
      setLocalItems(items)
      return
    }

    if (originalSourceCol === overCol) {
      // Reorder within column — or, if the user dragged across columns
      // during the gesture and ended back at the source, revert.
      const colItems = localItems[overCol] ?? []
      const oldIndex = colItems.findIndex((i) => i.id === String(active.id))
      const newIndex = colItems.findIndex((i) => i.id === String(over.id))

      if (oldIndex !== newIndex && oldIndex >= 0 && newIndex >= 0) {
        const newOrder = arrayMove(colItems, oldIndex, newIndex)
        setLocalItems((prev) => ({ ...prev, [overCol]: newOrder }))
        onReorder?.(overCol, newOrder.map((i) => i.id))
      } else {
        setLocalItems(items)
      }
    } else {
      // Cross-column move — keep the optimistic localItems in place.
      // The parent's mutation (with its own optimistic cache write) will
      // push a fresh `items` prop within a tick or two, at which point
      // the sync effect reconciles. No snap-back in the meantime.
      //
      // Deferred past dnd-kit's own drag teardown: a rejected move (owner /
      // type validation) makes the parent remount this board via `key`. If
      // that lands in the same tick as the drop, the DndContext unmounts while
      // its auto-scroll interval is still armed, and the page keeps scrolling
      // up on its own. Letting the context finish ending the drag first
      // clears that interval.
      //
      // Land the card at the TOP of the destination right now. The list APIs
      // sort recently-updated first and the move mutation's optimistic write
      // inserts at index 0, so the card ends up there anyway. Leaving it where
      // the cursor parked it (usually the bottom) made it drop low, then jump to
      // the top once the cache write arrived — a visible blink.
      const itemId = String(active.id)
      const droppedItem = (localItems[overCol] ?? []).find((i) => i.id === itemId)
      const destItems = droppedItem
        ? [droppedItem, ...(localItems[overCol] ?? []).filter((i) => i.id !== itemId)]
        : (localItems[overCol] ?? [])
      if (droppedItem) setLocalItems((prev) => ({ ...prev, [overCol]: destItems }))
      window.setTimeout(() => {
        onMoveAcross?.(itemId, originalSourceCol, overCol)
        // Also fire reorder for the destination column
        onReorder?.(overCol, destItems.map((i) => i.id))
      }, 60)
    }
  }

  // Stuck-drag guard. Throwing a card past the top of the window and releasing
  // there can swallow the mouseup, leaving dnd-kit "dragging" with auto-scroll
  // running forever. While a card is held: cancel the drag if the pointer
  // leaves the window / the window loses focus, or if a move event reports no
  // button down. dnd-kit's pointer sensors cancel on Escape, so we send one.
  React.useEffect(() => {
    if (!activeId) return
    const cancelDrag = () =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }),
      )
    const onMove = (e: MouseEvent) => {
      if (e.buttons === 0) cancelDrag()
    }
    document.documentElement.addEventListener("mouseleave", cancelDrag)
    window.addEventListener("blur", cancelDrag)
    document.addEventListener("mousemove", onMove)
    return () => {
      document.documentElement.removeEventListener("mouseleave", cancelDrag)
      window.removeEventListener("blur", cancelDrag)
      document.removeEventListener("mousemove", onMove)
    }
  }, [activeId])

  // A cancelled drag (Esc, pointer lost) must clear the drag state too, else
  // the board stays "mid-drag": auto-scroll keeps running and the items sync
  // stays gated. Roll the optimistic cross-column move back as well.
  const handleDragCancel = () => {
    setActiveId(null)
    setLocalItems(items)
  }

  return (
    <DndContext
      sensors={draggable ? sensors : []}
      collisionDetection={collisionDetection}
      // Auto-scroll only while a card is actually held. Layout-shift
      // compensation is off: handleDragOver moves the card between columns
      // mid-drag, and the compensation re-scrolls to chase each shift — which
      // is what kept the column scrolling upward after the card landed.
      autoScroll={
        activeId
          ? { layoutShiftCompensation: false, threshold: { x: 0.15, y: 0.2 }, acceleration: 8 }
          : false
      }
      onDragCancel={handleDragCancel}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={boardScrollRef}
        className={cn("grid gap-[14px] overflow-x-auto pb-2", className)}
        style={{
          // Fixed column width in every state — `1fr` is intentionally not
          // used. With `1fr`, columns stretched to fill the row, so a single
          // filtered stage went full-width and the all-stages view sized
          // columns differently per screen. A fixed track keeps every column
          // identical whether 1 or 9 are shown.
          gridTemplateColumns: `repeat(${columns.length}, ${KANBAN_COLUMN_WIDTH})`,
        }}
      >
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            items={localItems[column.id] ?? []}
            renderCard={renderCard}
            draggable={draggable}
            isItemDraggable={isItemDraggable}
            onLockedDragAttempt={onLockedDragAttempt}
            hasMore={columnInfinite?.hasMore[column.id] ?? false}
            loading={columnInfinite?.loading[column.id] ?? false}
            onLoadMore={
              columnInfinite ? () => columnInfinite.onLoadMore(column.id) : undefined
            }
            scrollRestoreKey={
              scrollRestoreKey ? `${scrollRestoreKey}:col:${column.id}` : undefined
            }
          />
        ))}
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeItem ? (
          <div className="rotate-2 opacity-90 shadow-lg">
            {renderCard(activeItem)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function KanbanColumn<T extends { id: string }>({
  column,
  items,
  renderCard,
  draggable,
  isItemDraggable,
  onLockedDragAttempt,
  hasMore,
  loading,
  onLoadMore,
  scrollRestoreKey,
}: {
  column: KanbanColumnConfig
  items: T[]
  renderCard: (item: T) => React.ReactNode
  draggable: boolean
  isItemDraggable?: (item: T) => boolean
  onLockedDragAttempt?: (item: T) => void
  hasMore: boolean
  loading: boolean
  onLoadMore?: () => void
  scrollRestoreKey?: string
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    disabled: !draggable,
  })

  // IntersectionObserver-based load-more sentinel. Fires `onLoadMore` while
  // the sentinel is in view, the column has more pages, and no fetch is
  // already in flight. We re-arm by observing both `hasMore` and `loading`.
  const sentinelRef = React.useRef<HTMLDivElement | null>(null)
  const scrollerRef = React.useRef<HTMLDivElement | null>(null)

  // Save/restore this column's vertical scroll across detail round-trips.
  // The scroller node feeds two consumers — the IO root (`scrollerRef`) and
  // the restoration hook — so a combined ref callback fans the node to both.
  const restoreScrollRef = useScrollRestoration<HTMLDivElement>(
    scrollRestoreKey ?? "",
    { enabled: !!scrollRestoreKey },
  )
  const setScrollerRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      scrollerRef.current = node
      restoreScrollRef(node)
    },
    [restoreScrollRef],
  )
  React.useEffect(() => {
    if (!onLoadMore || !sentinelRef.current || !scrollerRef.current) return
    if (!hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !loading && hasMore) onLoadMore()
        }
      },
      { root: scrollerRef.current, rootMargin: "0px 0px 80px 0px", threshold: 0.01 },
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [onLoadMore, hasMore, loading])

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "cpt-kcol flex flex-col",
        // Column capped at the filter sidebar's height (CrmFilterAside: 100dvh - 5.5rem).
        "max-h-[max(16rem,calc(100dvh-5.5rem))]",
        isOver && "ring-2 ring-primary/30"
      )}
      style={
        column.color
          ? ({ ['--cpt-col-accent' as string]: column.color } as React.CSSProperties)
          : undefined
      }
    >
      {/* Column header — Comprint style */}
      <div className="cpt-kcol-h">
        <span className="flex items-center gap-1.5">
          {column.color && (
            <span
              className="inline-block size-[6px] rounded-full"
              style={{ backgroundColor: column.color, boxShadow: `0 0 0 2px ${column.color}22` }}
            />
          )}
          {column.label}
          <span className="count" style={{ marginLeft: 6 }}>{column.count ?? items.length}</span>
        </span>
      </div>

      {/* Card list — native scroller (not Radix ScrollArea) so the
          IntersectionObserver root works reliably for paged columns. The
          `cpt-kcol-scroll` utility suppresses the visible scrollbar in
          every engine while keeping wheel / touch / keyboard scroll alive. */}
      <div
        ref={setScrollerRef}
        // Takes what the capped column leaves after its header, then scrolls.
        className="cpt-kcol-scroll -mx-2 min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-1"
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-0 px-0">
            {items.length > 0 ? (
              items.map((item) => (
                <SortableCard
                  key={item.id}
                  item={item}
                  renderCard={renderCard}
                  disabled={!draggable || (isItemDraggable ? !isItemDraggable(item) : false)}
                  onLockedDragAttempt={
                    draggable && isItemDraggable && !isItemDraggable(item) ? onLockedDragAttempt : undefined
                  }
                />
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-[12.5px] text-muted-foreground">
                {loading ? S.column.loading : S.column.noItems}
              </div>
            )}
            {hasMore && (
              <Typography variant="card-meta" align="center" asChild>
                <div
                  ref={sentinelRef}
                  className="py-2"
                >
                  {loading ? S.column.loadingMore : S.column.scrollForMore}
                </div>
              </Typography>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

/** Pointer travel (px) that turns a press on a locked card into a drag attempt. */
const LOCKED_DRAG_THRESHOLD = 8

function SortableCardImpl<T extends { id: string }>({
  item,
  renderCard,
  disabled,
  onLockedDragAttempt,
}: {
  item: T
  renderCard: (item: T) => React.ReactNode
  disabled: boolean
  onLockedDragAttempt?: (item: T) => void
}) {
  // A locked card never starts a dnd-kit drag, so watch the raw pointer: press
  // + move past the threshold = the user tried to drag it. Fires once per press.
  const pressRef = React.useRef<{ x: number; y: number; fired: boolean } | null>(null)
  const lockedHandlers = onLockedDragAttempt
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          pressRef.current = { x: e.clientX, y: e.clientY, fired: false }
        },
        onPointerMove: (e: React.PointerEvent) => {
          const press = pressRef.current
          if (!press || press.fired) return
          if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > LOCKED_DRAG_THRESHOLD) {
            press.fired = true
            onLockedDragAttempt(item)
          }
        },
        onPointerUp: () => {
          pressRef.current = null
        },
        onPointerLeave: () => {
          pressRef.current = null
        },
      }
    : undefined

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-opacity",
        // Hide the source card completely while it's being dragged so the
        // floating DragOverlay isn't shadowed by a half-opacity ghost
        // underneath. The destination slot opens up cleanly and the
        // overlay's drop animation settles into it.
        isDragging && "opacity-0"
      )}
      {...attributes}
      {...listeners}
      {...lockedHandlers}
    >
      {renderCard(item)}
    </div>
  )
}

// Memoized leaf. The board re-renders on every drag tick / activeId flip; without
// this, all cards in all columns re-render each time. Props are referentially
// stable per card (`item` from the data slice, `renderCard` is a parent
// useCallback, `disabled` is a boolean), so unaffected cards now skip re-render.
// The card being dragged still re-renders — dnd-kit's `useSortable` drives that
// via its own internal state, independent of `memo`. The cast preserves the
// generic signature that `React.memo` would otherwise erase.
const SortableCard = React.memo(SortableCardImpl) as typeof SortableCardImpl

export { KanbanBoard }
export type { KanbanBoardProps, KanbanColumnConfig }
