import { useCallback, useState } from "react";
import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import { Maximize2, Minimize2, Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Typography } from "@/components/ui/typography";

import { ItemCard } from "./ItemCard";
import { CHECKLISTS_STRINGS } from "./checklists.strings";
import {
  makeBlankChecklistItem,
  type ChecklistFormShape,
} from "./checklist-items-editor-helpers";

interface ChecklistItemsEditorProps {
  control: Control<ChecklistFormShape>;
  register: UseFormRegister<ChecklistFormShape>;
  setValue: UseFormSetValue<ChecklistFormShape>;
  itemErrors?: FieldErrors<ChecklistFormShape>["items"];
  /** Section heading shown above the list. */
  heading?: string;
  /** Optional content rendered to the LEFT of the Add item button in the
   *  header row. Used by the WMS form to surface a Preview action next to
   *  Add item without forking this component. */
  headerActions?: React.ReactNode;
}

export function ChecklistItemsEditor({
  control,
  register,
  setValue,
  itemErrors,
  heading = "Items",
  headerActions,
}: ChecklistItemsEditorProps) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "items",
  });

  // Drag-to-reorder. Listeners sit on each card's grip handle only, so
  // typing in the item's inputs never starts a drag. A small activation
  // distance prevents an accidental click-drag.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    // Keyboard reorder for a11y (§0.15): focus the grip, Space to lift, arrows
    // to move, Space to drop.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = fields.findIndex((f) => f.id === active.id);
    const to = fields.findIndex((f) => f.id === over.id);
    if (from !== -1 && to !== -1) move(from, to);
  };

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const isCollapsed = useCallback(
    (id: string) => collapsedIds.has(id),
    [collapsedIds],
  );
  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const collapseAll = useCallback(() => {
    setCollapsedIds(new Set(fields.map((f) => f.id)));
  }, [fields]);
  const expandAll = useCallback(() => setCollapsedIds(new Set()), []);
  const allCollapsed =
    fields.length > 0 && collapsedIds.size === fields.length;

  const rootItemsError =
    itemErrors && "message" in itemErrors ? itemErrors.message : null;

  return (
    <section className="space-y-2">
      {/* Sticky toolbar — the count + Collapse all / Add item stay pinned
          while the page scrolls. `top-14` clears the sticky global header
          (h-14); both callers are full pages. Background + bottom border so
          items scroll cleanly underneath without bleeding through. */}
      <div className="sticky top-14 z-10 flex items-center justify-between gap-3 border-b border-border bg-card pb-2 pt-2.5">
        <div>
          <Typography asChild variant="caption" className="font-[550] uppercase tracking-[0.06em]">
            <Label>{heading}</Label>
          </Typography>
          <Typography asChild variant="helper" className="mt-0.5">
            <p>{CHECKLISTS_STRINGS.itemsEditor.itemCount(fields.length)}</p>
          </Typography>
        </div>
        <div className="flex items-center gap-1.5">
          {fields.length > 1 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={allCollapsed ? expandAll : collapseAll}
                    data-testid="checklist-toggle-all"
                  >
                    {allCollapsed ? (
                      <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
                    ) : (
                      <Minimize2 className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {allCollapsed ? CHECKLISTS_STRINGS.itemsEditor.expandAll : CHECKLISTS_STRINGS.itemsEditor.collapseAll}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {allCollapsed ? CHECKLISTS_STRINGS.itemsEditor.expandAll : CHECKLISTS_STRINGS.itemsEditor.collapseAll}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {headerActions}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(makeBlankChecklistItem())}
            data-testid="checklist-add-item"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {CHECKLISTS_STRINGS.itemsEditor.addItem}
          </Button>
        </div>
      </div>

      {rootItemsError && (
        <Typography asChild variant="helper" tone="danger">
          <p>{rootItemsError}</p>
        </Typography>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={fields.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {fields.map((field, idx) => (
              <ItemCard
                key={field.id}
                id={field.id}
                index={idx}
                control={control}
                setValue={setValue}
                register={register}
                errors={
                  Array.isArray(itemErrors) ? itemErrors[idx] : undefined
                }
                onRemove={fields.length > 1 ? () => remove(idx) : undefined}
                collapsed={isCollapsed(field.id)}
                onToggleCollapse={() => toggleCollapse(field.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}
