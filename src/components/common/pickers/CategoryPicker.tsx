import { useMemo, useState } from "react";
import { UI } from "@/shared/constants"
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Picker only reads `id / name / parent_id / parent_name` — both the
// full and short shapes carry those, so callers can opt into
// `shape=short` (filter dropdowns) without changing render logic.
import {
  useAllCategories,
  useAllCategoriesShort,
} from "@/modules/ims/hooks/categories/useCategories";

import { CATEGORY_PICKER_STRINGS as S } from './category-picker.strings'

interface CategoryPickerProps {
  /** Selected category id. "" or null means nothing picked. */
  value: string | null | undefined;
  /** Single callback. Receives "" when cleared via `allowAll`. */
  onChange: (id: string) => void;
  placeholder?: string;
  /** Filter contexts: render an "All categories" entry at the top. */
  allowAll?: boolean;
  /** Hide this id (and its descendants). */
  excludeId?: string | null;
  /** Restrict to L1 categories only. */
  l1Only?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  clearable?: boolean;
  /** Filter callers should pass `"short"` to skip backend rollup
   *  subqueries (part_count, subcategory_count, stock summaries, etc.).
   *  Form callers leave it at the default — the full shape stays
   *  cached for any surface that does need rollups. */
  shape?: "full" | "short";
  /** When true, the dropdown only lists categories the backend reports
   *  as active (`?is_active=true`). Inactive parents are filtered out;
   *  active children of inactive parents become orphans and drop out
   *  of the tree silently. Use this on filter dropdowns (Parts, PM
   *  Assignments, Stock) where listing inactive rows would offer the
   *  operator a choice that's been retired. Form callers — especially
   *  edit forms whose `value` may already point at an inactive row —
   *  should leave it undefined so the existing selection's label still
   *  renders. */
  isActive?: boolean;
}

interface CategoryNode {
  id: string;
  name: string;
  children: CategoryNode[];
}

/**
 * Category picker — shares the trigger geometry of `AsyncSelect` exactly
 * (h-10, rounded-[7px], shadow-xs, ChevronsUpDownIcon, slate border on open,
 * inline clear "X") so it reads as the same field family. The popup uses
 * base-ui's nested-menu primitive so an L1 with children hovers to reveal a
 * sibling popup of its L2s — base-ui owns the hover-intent and submenu
 * timing instead of us reinventing it.
 *
 * Item rows match AsyncSelect's vocabulary: 16px check slot on the left,
 * label centred, optional trailing chevron when a sub-popup exists. Colors
 * use Tailwind tokens (bg-accent / text-muted-foreground) so theme drift
 * happens once, in tokens, not here.
 */
export function CategoryPicker({
  value,
  onChange,
  placeholder = "Select category...",
  allowAll = false,
  excludeId = null,
  l1Only = false,
  disabled,
  id,
  className,
  clearable = true,
  shape = "full",
  isActive,
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  // Defer the chained-pages fetch until the picker is actually opened or a
  // value already exists (edit mode needs the catalog to render the label).
  // Filter dropdowns start with value="" and stay closed on mount, so the
  // catalog never loads until the operator clicks.
  //
  // Two hooks live side-by-side so the cached payloads don't fight: one
  // call site (e.g. the parent-picker in PartFormPage) uses the full
  // shape; another (a filter chip on PartsPage) uses short. React Query
  // keys them separately. Only the one that matches the `shape` prop
  // runs — the other stays disabled.
  const useShort = shape === "short";
  const shortQuery = useAllCategoriesShort({
    enabled: useShort && (open || !!value),
    isActive,
  });
  const fullQuery = useAllCategories({
    enabled: !useShort && (open || !!value),
    isActive,
  });
  const categories = useShort ? shortQuery.data : fullQuery.data;
  const isLoading = useShort ? shortQuery.isLoading : fullQuery.isLoading;

  const tree = useMemo<CategoryNode[]>(() => {
    const all = categories ?? [];
    const excluded = new Set<string>();
    if (excludeId) {
      excluded.add(excludeId);
      for (const c of all) if (c.parent_id === excludeId) excluded.add(c.id);
    }
    const byParent = new Map<string, CategoryNode[]>();
    for (const c of all) {
      if (excluded.has(c.id)) continue;
      if (l1Only && c.parent_id != null) continue;
      const node: CategoryNode = { id: c.id, name: c.name, children: [] };
      const key = c.parent_id ?? "__root__";
      const list = byParent.get(key) ?? [];
      list.push(node);
      byParent.set(key, list);
    }
    const sortByName = (a: CategoryNode, b: CategoryNode) =>
      a.name.localeCompare(b.name);
    for (const c of all) {
      const list = byParent.get(c.id);
      const node = (byParent.get(c.parent_id ?? "__root__") ?? []).find(
        (n) => n.id === c.id,
      );
      if (node && list) node.children = [...list].sort(sortByName);
    }
    return [...(byParent.get("__root__") ?? [])].sort(sortByName);
  }, [categories, excludeId, l1Only]);

  const labelById = useMemo(() => {
    const byId = new Map((categories ?? []).map((c) => [c.id, c]));
    const map = new Map<string, { name: string; parentName: string | null }>();
    for (const c of categories ?? []) {
      const parent = c.parent_id ? byId.get(c.parent_id) : null;
      map.set(c.id, { name: c.name, parentName: parent?.name ?? null });
    }
    return map;
  }, [categories]);

  const searchActive = search.trim().length >= 1;
  const searchResults = useMemo(() => {
    if (!searchActive) return [];
    const q = search.trim().toLowerCase();
    return (categories ?? [])
      .filter(
        (c) => !excludeId || (c.id !== excludeId && c.parent_id !== excludeId),
      )
      .filter((c) => !l1Only || c.parent_id == null)
      .filter((c) => c.name.toLowerCase().includes(q))
      .map((c) => ({
        id: c.id,
        name: c.name,
        parentName: c.parent_id
          ? labelById.get(c.parent_id)?.name ?? null
          : null,
      }))
      .slice(0, 50);
  }, [search, searchActive, categories, excludeId, l1Only, labelById]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch("");
  };

  const triggerEntry = value ? labelById.get(value) : null;

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(o) => {
        if (disabled) return;
        setOpen(o);
        if (!o) setSearch("");
      }}
    >
      <DropdownMenuTrigger
        id={id}
        data-slot="category-picker-trigger"
        // `group/category-picker-trigger` lets the chevron child rotate
        // based on Base UI's `data-popup-open` attribute (see chevron
        // below). Same Tailwind pattern as SelectTrigger and AsyncSelect
        // — keeps every dropdown's open-state animation consistent.
        disabled={disabled || isLoading}
        className={cn(
          // Mirrors AsyncSelect's trigger token-for-token so the picker
          // reads as a sibling field, not a foreign component.
          "group/category-picker-trigger flex h-10 w-full items-center justify-between rounded-[7px] border border-input bg-card px-[10px] text-[13.5px] shadow-xs",
          "transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          !disabled && "cursor-pointer",
          !value && "text-muted-foreground",
          open && "border-primary",
          className,
        )}
      >
        <TriggerLabelTooltip entry={isLoading ? undefined : triggerEntry}>
          {isLoading
            ? S.trigger.loading
            : triggerEntry
              ? triggerEntry.parentName
                ? (
                    <>
                      <span className="text-muted-foreground">
                        {triggerEntry.parentName}
                      </span>
                      <span className="mx-1 text-muted-foreground/50">/</span>
                      <span>{triggerEntry.name}</span>
                    </>
                  )
                : (
                    triggerEntry.name
                  )
              : placeholder}
        </TriggerLabelTooltip>
        <span className="ml-2 flex shrink-0 items-center gap-1">
          {/* Clear-× and chevron are mutually exclusive so a picked value shows
              only the ×, matching the part / async selects (no double affordance). */}
          {clearable && value && !disabled ? (
            <span
              role="button"
              aria-label={S.clearSelection}
              className="rounded p-0.5 opacity-50 hover:bg-muted hover:opacity-100"
              // Base-UI's Menu.Trigger opens on `pointerdown`, so a click
              // handler that only stops `click` fires AFTER the popup is
              // already opening. Stop the pointer + mouse events too so
              // clearing the value never reopens the dropdown.
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange("");
              }}
            >
              <XIcon className="size-3" />
            </span>
          ) : (
            <ChevronDownIcon className="size-4 opacity-50 transition-transform duration-200 group-data-popup-open/category-picker-trigger:rotate-180 group-data-open/category-picker-trigger:rotate-180" />
          )}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className="w-(--anchor-width) min-w-[260px] p-0"
      >
        <div className="relative border-b border-border p-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={S.search.placeholder}
            maxLength={UI.FILTER_SEARCH_MAX_LENGTH}
            className="h-8 pr-8 text-sm"
            onKeyDown={(e) => {
              // Stop the menu's roving-tabindex handler from hijacking the
              // first character of the search; keep arrow keys for menu
              // navigation when the input is focused.
              if (e.key === "ArrowDown" || e.key === "ArrowUp") return;
              e.stopPropagation();
            }}
          />
          {search && (
            <button
              type="button"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
              aria-label={S.search.clearAriaLabel}
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto p-1">
          {!searchActive && allowAll && (
            <PickerItem
              onSelect={() => pick("")}
              selected={!value}
              label={S.allCategories}
            />
          )}

          {searchActive ? (
            searchResults.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                {S.search.noMatches(search)}
              </p>
            ) : (
              searchResults.map((r) => (
                <PickerItem
                  key={r.id}
                  onSelect={() => pick(r.id)}
                  selected={value === r.id}
                  label={
                    r.parentName ? (
                      <>
                        <span className="text-muted-foreground">
                          {r.parentName}
                        </span>
                        <span className="mx-1 text-muted-foreground/50">/</span>
                        <span>{r.name}</span>
                      </>
                    ) : (
                      r.name
                    )
                  }
                />
              ))
            )
          ) : tree.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {S.search.noCategories}
            </p>
          ) : (
            tree.map((node) =>
              node.children.length === 0 ? (
                <PickerItem
                  key={node.id}
                  onSelect={() => pick(node.id)}
                  selected={value === node.id}
                  label={node.name}
                />
              ) : (
                <DropdownMenuSub key={node.id}>
                  <DropdownMenuSubTrigger
                    className={cn(
                      // The wrapper appends its own ChevronRightIcon after
                      // these children, so don't render a second one here.
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                      "data-[popup-open]:bg-accent focus:bg-accent",
                      value === node.id && "font-medium",
                    )}
                    onClick={(e) => {
                      // Click selects the parent directly (the "pick the
                      // whole branch" shortcut). Hover still opens the
                      // submenu via Base UI's pointer-enter handler, so
                      // the operator can drill down without selecting if
                      // they want to. We preventDefault to stop the
                      // default click-toggle of the submenu — onPointerEnter
                      // already covers that affordance.
                      e.preventDefault();
                      pick(node.id);
                    }}
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center">
                      {value === node.id && <CheckIcon className="size-3" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{node.name}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="min-w-[220px] p-1">
                    {/* "All / parent" stays pinned above the scroll
                     *  region so the operator always has the
                     *  "pick whole category" affordance regardless of
                     *  how far they've scrolled. Children below scroll
                     *  past 5 rows (32px each ≈ 160px). */}
                    <PickerItem
                      onSelect={() => pick(node.id)}
                      selected={value === node.id}
                      label={
                        <>
                          <span className="text-muted-foreground">{S.allSubLabel}</span>
                          <span className="mx-1 text-muted-foreground/50">/</span>
                          <span>{node.name}</span>
                        </>
                      }
                    />
                    <div className="my-1 h-px bg-border" aria-hidden />
                    <div className="max-h-40 overflow-y-auto">
                      {node.children.map((child) => (
                        <PickerItem
                          key={child.id}
                          onSelect={() => pick(child.id)}
                          selected={value === child.id}
                          label={child.name}
                        />
                      ))}
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ),
            )
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Internal atoms ──────────────────────────────────────────────────────

function PickerItem({
  onSelect,
  selected,
  label,
}: {
  onSelect: () => void;
  selected: boolean;
  label: React.ReactNode;
}) {
  return (
    <DropdownMenuItem
      onClick={onSelect}
      className={cn(
        // Same row vocabulary as AsyncSelect's items — 16px check slot,
        // label flex-1, hover:bg-accent. No extra padding, no extra
        // typography rules. The whole point is to look identical to
        // the rest of the field family in this app.
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
        selected && "font-medium",
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        {selected && <CheckIcon className="size-3" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </DropdownMenuItem>
  );
}

/** The trigger label; when a category is picked, hovering reveals its full
 *  path in the styled tooltip (same as table cells), never a browser title. */
function TriggerLabelTooltip({
  entry,
  children,
}: {
  entry: { name: string; parentName?: string | null } | null | undefined;
  children: React.ReactNode;
}) {
  const labelClass = "min-w-0 flex-1 truncate text-left";
  if (!entry) return <span className={labelClass}>{children}</span>;
  const text = entry.parentName ? `${entry.parentName} / ${entry.name}` : entry.name;
  return (
    <TooltipProvider delay={120}>
      <Tooltip>
        <TooltipTrigger render={<span className={labelClass} />}>{children}</TooltipTrigger>
        <TooltipContent className="max-w-[320px] whitespace-normal break-words text-left leading-relaxed [&]:items-start">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
