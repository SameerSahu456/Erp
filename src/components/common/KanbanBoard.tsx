import * as React from "react"
import {
  DndContext,
  closestCorners,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
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
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface KanbanColumnConfig {
  id: string
  label: string
  color?: string
}

interface KanbanBoardProps<T extends { id: string }> {
  columns: KanbanColumnConfig[]
  items: Record<string, T[]>
  renderCard: (item: T) => React.ReactNode
  onMoveAcross?: (itemId: string, fromColumn: string, toColumn: string) => void
  onReorder?: (columnId: string, orderedIds: string[]) => void
  className?: string
}

function KanbanBoard<T extends { id: string }>({
  columns,
  items,
  renderCard,
  onMoveAcross,
  onReorder,
  className,
}: KanbanBoardProps<T>) {
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [localItems, setLocalItems] = React.useState(items)

  // Sync external items
  React.useEffect(() => {
    setLocalItems(items)
  }, [items])

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

  const activeItem = React.useMemo(() => {
    if (!activeId) return null
    for (const colItems of Object.values(localItems)) {
      const item = colItems.find((i) => i.id === activeId)
      if (item) return item
    }
    return null
  }, [activeId, localItems])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeCol = findColumn(String(active.id))
    const overCol = findColumn(String(over.id))

    if (!activeCol || !overCol || activeCol === overCol) return

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
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    // Use the EXTERNAL items prop to find the original source column
    // (localItems has been modified by handleDragOver during the drag)
    const originalSourceCol = Object.entries(items).find(([, colItems]) =>
      colItems.some((i) => i.id === String(active.id))
    )?.[0]

    const overCol = findColumn(String(over.id))

    if (!originalSourceCol || !overCol) return

    if (originalSourceCol === overCol) {
      // Reorder within column
      const colItems = localItems[overCol] ?? []
      const oldIndex = colItems.findIndex((i) => i.id === String(active.id))
      const newIndex = colItems.findIndex((i) => i.id === String(over.id))

      if (oldIndex !== newIndex && oldIndex >= 0 && newIndex >= 0) {
        const newOrder = arrayMove(colItems, oldIndex, newIndex)
        setLocalItems((prev) => ({ ...prev, [overCol]: newOrder }))
        onReorder?.(overCol, newOrder.map((i) => i.id))
      }
    } else {
      // Cross-column move
      onMoveAcross?.(String(active.id), originalSourceCol, overCol)
      // Also fire reorder for the destination column
      const destItems = localItems[overCol] ?? []
      onReorder?.(overCol, destItems.map((i) => i.id))
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn(
          "flex gap-4 overflow-x-auto pb-4",
          className
        )}
      >
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            items={localItems[column.id] ?? []}
            renderCard={renderCard}
          />
        ))}
      </div>

      <DragOverlay>
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
}: {
  column: KanbanColumnConfig
  items: T[]
  renderCard: (item: T) => React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[280px] flex-col rounded-lg border bg-muted/30",
        isOver && "ring-2 ring-primary/30"
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          {column.color && (
            <div
              className="size-2.5 rounded-full"
              style={{ backgroundColor: column.color }}
            />
          )}
          <span className="text-sm font-semibold">{column.label}</span>
        </div>
        <Badge variant="secondary">{items.length}</Badge>
      </div>

      {/* Card list */}
      <ScrollArea className="max-h-[500px]">
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2 p-2">
            {items.length > 0 ? (
              items.map((item) => (
                <SortableCard
                  key={item.id}
                  item={item}
                  renderCard={renderCard}
                />
              ))
            ) : (
              <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                No items
              </div>
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  )
}

function SortableCard<T extends { id: string }>({
  item,
  renderCard,
}: {
  item: T
  renderCard: (item: T) => React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

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
        isDragging && "opacity-40"
      )}
      {...attributes}
      {...listeners}
    >
      {renderCard(item)}
    </div>
  )
}

export { KanbanBoard }
export type { KanbanBoardProps, KanbanColumnConfig }
