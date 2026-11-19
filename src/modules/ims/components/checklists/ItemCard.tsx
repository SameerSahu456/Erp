import {
  useWatch,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Trash2,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { type ChecklistItemInput } from "../../schemas";
import { KindConfigAndPreview } from "./KindConfigAndPreview";
import { CHECKLISTS_STRINGS } from "./checklists.strings";
import {
  isPresetSelect,
  PRESET_SELECT_OPTIONS,
  uiKindFromItem,
  UI_KIND_LABEL,
  SELECTABLE_UI_KINDS,
  type UiKind,
  type ChecklistFormShape,
  type ItemErrorMap,
} from "./checklist-items-editor-helpers";

// ─── ItemCard + per-kind config ─────────────────────────────────────────────

interface ItemCardProps {
  /** Stable useFieldArray id — the sortable key for drag-to-reorder. */
  id: string;
  index: number;
  control: Control<ChecklistFormShape>;
  setValue: UseFormSetValue<ChecklistFormShape>;
  register: UseFormRegister<ChecklistFormShape>;
  errors: ItemErrorMap;
  onRemove?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ItemCard({
  id,
  index,
  control,
  setValue,
  register,
  errors,
  onRemove,
  collapsed = false,
  onToggleCollapse,
}: ItemCardProps) {
  const item = useWatch({ control, name: `items.${index}` }) as
    | ChecklistItemInput
    | undefined;
  const kind = item?.kind ?? "boolean";
  const uiKind = uiKindFromItem(item);
  const required = !!item?.required;
  const hasErrors = errors != null && Object.keys(errors).length > 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-card shadow-sm",
        // Lift the card above its siblings + soften it while dragging so
        // the drop target reads clearly.
        isDragging && "relative z-10 opacity-80 shadow-md",
      )}
      data-testid={`checklist-item-${index}`}
    >
      <div
        className={`flex items-start gap-2 bg-muted/30 px-3 py-2.5 ${
          collapsed ? "" : "border-b"
        }`}
      >
        {/* Drag handle — listeners live here (not the whole card) so the
            item's inputs / selects stay normally interactive. */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={CHECKLISTS_STRINGS.itemsEditor.reorderItem(index + 1)}
          title={CHECKLISTS_STRINGS.itemsEditor.dragToReorder}
          className="flex h-9 cursor-grab touch-none items-center text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-expanded={!collapsed}
            aria-label={collapsed ? CHECKLISTS_STRINGS.itemsEditor.expandItem : CHECKLISTS_STRINGS.itemsEditor.collapseItem}
            title={collapsed ? CHECKLISTS_STRINGS.itemsEditor.expand : CHECKLISTS_STRINGS.itemsEditor.collapse}
            className="grid h-9 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        )}
        <div className="flex-1 space-y-1">
          <Input
            {...register(`items.${index}.label`)}
            placeholder={CHECKLISTS_STRINGS.itemsEditor.itemPlaceholder(index + 1)}
            aria-invalid={errors?.label ? "true" : undefined}
            className="h-9 bg-background"
          />
          {errors?.label?.message && (
            <Typography asChild variant="helper" tone="danger">
              <p>{errors.label.message}</p>
            </Typography>
          )}
        </div>
        <div className="w-[200px]">
          <Select
            value={uiKind}
            onValueChange={(v) => {
              const nextUi = (v ?? "boolean") as UiKind;
              // route_tags are valid only on the preset; clear them whenever the
              // item is no longer a Pass/Fail preset so a stale tag can't 422.
              if (nextUi !== "select_preset") {
                setValue(`items.${index}.route_tags`, [], {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }
              if (nextUi === "select_preset") {
                // Backend stores kind="select" with the locked option set.
                setValue(`items.${index}.kind`, "select", {
                  shouldValidate: true,
                  shouldDirty: true,
                });
                setValue(
                  `items.${index}.options`,
                  [...PRESET_SELECT_OPTIONS],
                  { shouldValidate: true, shouldDirty: true },
                );
              } else if (nextUi === "select") {
                // Switching FROM the preset to "Custom" replaces the
                // locked PASS/FAIL/N/A with one empty editable row so
                // the user starts on a clean slate.
                setValue(`items.${index}.kind`, "select", {
                  shouldValidate: true,
                  shouldDirty: true,
                });
                if (
                  isPresetSelect({
                    kind: "select",
                    options: item?.options ?? null,
                  })
                ) {
                  setValue(`items.${index}.options`, [""], {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }
              } else {
                setValue(
                  `items.${index}.kind`,
                  nextUi as ChecklistItemInput["kind"],
                  { shouldValidate: true, shouldDirty: true },
                );
              }
            }}
          >
            <SelectTrigger
              className="h-9 w-full bg-background"
              data-testid={`checklist-item-${index}-kind`}
              // Kind is required — there's no "no kind" state, so the
              // clear-X is suppressed. (Previously clearing reset to
              // `boolean` / "Yes / No", which is the legacy read-side
              // fallback and isn't even in SELECTABLE_UI_KINDS.) Switch
              // types by picking a new value from the dropdown.
              clearable={false}
            >
              <span className="truncate">{UI_KIND_LABEL[uiKind]}</span>
            </SelectTrigger>
            <SelectContent>
              {SELECTABLE_UI_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {UI_KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Typography asChild variant="helper" tone="inherit" className="flex h-9 items-center gap-2 rounded-md border bg-background px-2.5">
        <label>
          <Switch
            checked={required}
            onCheckedChange={(v) =>
              setValue(`items.${index}.required`, Boolean(v), {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            aria-label={CHECKLISTS_STRINGS.itemsEditor.itemRequired(index + 1)}
          />
          <span className="text-muted-foreground">{CHECKLISTS_STRINGS.itemsEditor.required}</span>
        </label>
        </Typography>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-9 w-9 shrink-0 p-0 text-muted-foreground hover:text-destructive"
            aria-label={CHECKLISTS_STRINGS.itemsEditor.removeItemAriaLabel(index + 1)}
            title={CHECKLISTS_STRINGS.itemsEditor.removeItem}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!collapsed && (
        // Compact body — no per-card blurb (the kind picker label
        // already states the kind). Tighter padding (py-2.5) so a long
        // checklist stays scannable inside the editor.
        <div className="space-y-2 px-3 py-2.5">
          <KindConfigAndPreview
            kind={kind}
            uiKind={uiKind}
            index={index}
            control={control}
            setValue={setValue}
            errors={errors}
          />
          <Typography asChild variant="helper" tone="inherit">
            <Input
              {...register(`items.${index}.notes`)}
              placeholder={CHECKLISTS_STRINGS.itemsEditor.inspectorHint}
              className="h-8 bg-background"
            />
          </Typography>
        </div>
      )}
      {collapsed && hasErrors && (
        <Typography asChild variant="helper" tone="inherit" className="flex items-center gap-2 px-3 py-2">
          <div>
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
            {CHECKLISTS_STRINGS.itemsEditor.hasErrors}
          </span>
          </div>
        </Typography>
      )}
    </div>
  );
}
