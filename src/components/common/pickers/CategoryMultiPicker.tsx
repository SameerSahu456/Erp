import { useMemo, useState } from "react";
import { UI } from "@/shared/constants"
import { ChevronDownIcon, MinusIcon, XIcon } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { StatusBadge, type StatusBadgeVariant } from "@/components/common/display/StatusBadge";
import { OverflowPillList } from "@/components/common/display/OverflowPillList";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAllCategories } from "@/modules/ims/hooks/categories/useCategories";

import { CATEGORY_PICKER_STRINGS as S } from './category-picker.strings'

interface CategoryMultiPickerProps {
  /** Selected ids. */
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Supply an explicit tree to reuse this exact picker UI for a NON-category
   *  list (e.g. the flat stock-condition options) so both dropdowns on a form
   *  read identically. When omitted, the IMS category catalog is fetched and
   *  built into the tree as before. */
  nodes?: CategoryNode[];
  /** Trigger summary nouns; default to the category wording. */
  nounSingular?: string;
  nounPlural?: string;
  /** Show the picks as removable chips (`+N` past the first few) instead of a
   *  "3 selected" summary. */
  showChips?: boolean;
  /** Chip colour per id; neutral when omitted. */
  chipVariant?: (id: string) => StatusBadgeVariant;
}

const MAX_VISIBLE_CHIPS = 3;

interface CategoryNode {
  id: string;
  name: string;
  children: CategoryNode[];
}

/**
 * Multi-select category picker. Same nested-submenu dropdown as the IMS
 * `CategoryPicker` — parent categories open a submenu of their children —
 * but every row is a checkbox and the menu stays open (`closeOnClick=false`)
 * so the operator can tick several categories in one session.
 */
export function CategoryMultiPicker({
  value,
  onChange,
  placeholder = "Select categories…",
  disabled,
  id,
  className,
  nodes,
  showChips = false,
  chipVariant,
  nounSingular = "category",
  nounPlural = "categories",
}: CategoryMultiPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Defer the catalog fetch until the picker opens, or a value already
  // exists (edit mode needs the labels to render the trigger). Skipped
  // entirely when the caller supplies its own `nodes`.
  const { data: categories, isLoading: categoriesLoading } = useAllCategories({
    enabled: !nodes && (open || value.length > 0),
  });
  const isLoading = !nodes && categoriesLoading;

  // Everything below (tree, labels, search) derives from ONE flat item list —
  // flattened from the caller's `nodes`, or from the fetched category catalog.
  const items = useMemo<{ id: string; name: string; parent_id: string | null }[]>(() => {
    if (nodes) {
      const out: { id: string; name: string; parent_id: string | null }[] = [];
      const walk = (node: CategoryNode, parent: string | null) => {
        out.push({ id: node.id, name: node.name, parent_id: parent });
        node.children.forEach((child) => walk(child, node.id));
      };
      nodes.forEach((node) => walk(node, null));
      return out;
    }
    return (categories ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      parent_id: c.parent_id,
    }));
  }, [nodes, categories]);

  const tree = useMemo<CategoryNode[]>(() => {
    if (nodes) return nodes;
    const byParent = new Map<string, CategoryNode[]>();
    for (const c of items) {
      const node: CategoryNode = { id: c.id, name: c.name, children: [] };
      const key = c.parent_id ?? "__root__";
      const list = byParent.get(key) ?? [];
      list.push(node);
      byParent.set(key, list);
    }
    const sortByName = (a: CategoryNode, b: CategoryNode) =>
      a.name.localeCompare(b.name);
    for (const c of items) {
      const list = byParent.get(c.id);
      const node = (byParent.get(c.parent_id ?? "__root__") ?? []).find(
        (n) => n.id === c.id,
      );
      if (node && list) node.children = [...list].sort(sortByName);
    }
    return [...(byParent.get("__root__") ?? [])].sort(sortByName);
  }, [nodes, items]);

  const labelById = useMemo(() => {
    const nameById = new Map(items.map((c) => [c.id, c.name]));
    const map = new Map<string, { name: string; parentName: string | null }>();
    for (const c of items) {
      map.set(c.id, {
        name: c.name,
        parentName: c.parent_id ? nameById.get(c.parent_id) ?? null : null,
      });
    }
    return map;
  }, [items]);

  const selected = useMemo(() => new Set(value), [value]);

  // parent → its direct child ids, and child → its parent id. Selecting a
  // parent covers every sub-category under it, so we never store both
  // (the backend rejects parent + descendant together).
  const childIdsByParent = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const node of tree) {
      if (node.children.length) {
        m.set(
          node.id,
          node.children.map((c) => c.id),
        );
      }
    }
    return m;
  }, [tree]);
  const parentIdByChild = useMemo(() => {
    const m = new Map<string, string>();
    for (const node of tree) {
      for (const ch of node.children) m.set(ch.id, node.id);
    }
    return m;
  }, [tree]);

  const toggle = (cid: string) => {
    if (selected.has(cid)) {
      onChange(value.filter((v) => v !== cid));
      return;
    }
    // Adding. If this is a parent, drop any of its children already
    // selected — the parent now covers the whole branch.
    const childIds = childIdsByParent.get(cid);
    const base = childIds
      ? value.filter((v) => !childIds.includes(v))
      : value;
    onChange([...base, cid]);
  };

  // A category reads as checked if it's directly selected OR its parent
  // is selected (parent covers all sub-categories).
  const isChecked = (catId: string) => {
    if (selected.has(catId)) return true;
    const pid = parentIdByChild.get(catId);
    return pid ? selected.has(pid) : false;
  };
  // A sub-category is locked when its parent is selected — it's already
  // covered, so it can't be toggled on its own.
  const isCoveredByParent = (catId: string) => {
    const pid = parentIdByChild.get(catId);
    return pid ? selected.has(pid) : false;
  };
  // A parent shows a PARTIAL (indeterminate) box when one or more of its
  // sub-categories is picked while the parent itself is not — a visual cue
  // that the branch is involved, without the parent (or its other children)
  // actually being selected. The stored value is untouched.
  const hasSelectedChild = (parentId: string) => {
    if (selected.has(parentId)) return false;
    const childIds = childIdsByParent.get(parentId);
    return childIds ? childIds.some((cid) => selected.has(cid)) : false;
  };

  const searchActive = search.trim().length >= 1;
  const searchResults = useMemo(() => {
    if (!searchActive) return [];
    const q = search.trim().toLowerCase();
    return items
      .filter((c) => c.name.toLowerCase().includes(q))
      .map((c) => ({
        id: c.id,
        name: c.name,
        parentName: c.parent_id
          ? labelById.get(c.parent_id)?.name ?? null
          : null,
      }))
      .slice(0, 50);
  }, [search, searchActive, items, labelById]);

  const triggerText =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? labelById.get(value[0])?.name ?? `1 ${nounSingular}`
        : `${value.length} ${nounPlural} selected`;

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
        data-slot="category-multi-picker-trigger"
        disabled={disabled || (isLoading && value.length > 0)}
        className={cn(
          // `group/category-multi-picker-trigger` lets the chevron child
          // rotate on open via Base UI's `data-popup-open` attribute —
          // same Tailwind pattern as the other dropdown primitives.
          // Mirrors AsyncSelect / CategoryPicker trigger token-for-token.
          "group/category-multi-picker-trigger flex h-10 w-full items-center justify-between rounded-[7px] border border-input bg-card px-[10px] text-[13.5px] shadow-xs",
          "transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          !disabled && "cursor-pointer",
          value.length === 0 && "text-muted-foreground",
          open && "border-primary",
          className,
        )}
      >
        {showChips && value.length > 0 && !isLoading ? (
          <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {value.slice(0, MAX_VISIBLE_CHIPS).map((chipId) => {
              const label = labelById.get(chipId)?.name ?? chipId;
              return (
                <StatusBadge
                  key={chipId}
                  variant={chipVariant?.(chipId) ?? "neutral"}
                  showDot={false}
                  className="min-w-0 max-w-[40%]"
                >
                  <span className="truncate">{label}</span>
                  {!disabled && (
                    <span
                      role="button"
                      aria-label={S.removeChip(label)}
                      className="ml-1 shrink-0 rounded opacity-60 hover:opacity-100"
                      // The trigger opens on pointerdown, before click — stop it
                      // there so × removes the pick instead of opening the menu.
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange(value.filter((other) => other !== chipId));
                      }}
                    >
                      <XIcon className="size-3" />
                    </span>
                  )}
                </StatusBadge>
              );
            })}
            {value.length > MAX_VISIBLE_CHIPS && (
              // Hovering "+N" lists every pick, like the pills on the GRN and detail pages.
              <OverflowPillList
                items={value.map((pickId) => labelById.get(pickId)?.name ?? pickId)}
                getItemLabel={(name) => name}
                renderSummary={() => (
                  <span className="shrink-0">
                    <StatusBadge variant="info" showDot={false}>
                      {`+${value.length - MAX_VISIBLE_CHIPS}`}
                    </StatusBadge>
                  </span>
                )}
              />
            )}
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-left">
            {isLoading && value.length > 0 ? S.triggerLoading : triggerText}
          </span>
        )}
        <span className="ml-2 flex shrink-0 items-center gap-1">
          {value.length > 0 && !disabled && (
            <span
              role="button"
              aria-label={S.clearAll}
              className="rounded p-0.5 opacity-50 hover:bg-muted hover:opacity-100"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange([]);
              }}
            >
              <XIcon className="size-3" />
            </span>
          )}
          <ChevronDownIcon className="size-4 opacity-50 transition-transform duration-200 group-data-popup-open/category-multi-picker-trigger:rotate-180 group-data-open/category-multi-picker-trigger:rotate-180" />
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className="w-(--anchor-width) min-w-[280px] p-0"
      >
        <div className="relative border-b border-border p-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={S.search.placeholder}
            maxLength={UI.FILTER_SEARCH_MAX_LENGTH}
            className="h-8 pr-8 text-sm"
            onKeyDown={(e) => {
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
          {isLoading ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {S.trigger.loading}
            </p>
          ) : searchActive ? (
            searchResults.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                {S.search.noMatches(search)}
              </p>
            ) : (
              searchResults.map((r) => (
                <CheckRow
                  key={r.id}
                  checked={isChecked(r.id)}
                  indeterminate={hasSelectedChild(r.id)}
                  disabled={isCoveredByParent(r.id)}
                  onToggle={() => toggle(r.id)}
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
                <CheckRow
                  key={node.id}
                  checked={selected.has(node.id)}
                  onToggle={() => toggle(node.id)}
                  label={node.name}
                />
              ) : (
                <DropdownMenuSub key={node.id}>
                  <DropdownMenuSubTrigger
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                      "data-[popup-open]:bg-accent focus:bg-accent",
                    )}
                    onClick={(e) => {
                      // Clicking the parent row toggles the parent itself;
                      // preventDefault stops the submenu's click-toggle so
                      // hover (Base UI pointer-enter) still drills down.
                      e.preventDefault();
                      toggle(node.id);
                    }}
                  >
                    <CheckMark
                      checked={selected.has(node.id)}
                      indeterminate={hasSelectedChild(node.id)}
                    />
                    <span className="min-w-0 flex-1 truncate">{node.name}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="min-w-[220px] p-1">
                    {/* "All / parent" — toggles the parent category. */}
                    <CheckRow
                      checked={selected.has(node.id)}
                      onToggle={() => toggle(node.id)}
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
                        <CheckRow
                          key={child.id}
                          checked={isChecked(child.id)}
                          disabled={isCoveredByParent(child.id)}
                          onToggle={() => toggle(child.id)}
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

        {value.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-2.5 py-1.5 text-xs text-muted-foreground">
            <span>{S.footer.selected(value.length)}</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="font-medium hover:text-foreground"
            >
              {S.footer.clearAll}
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CheckMark({
  checked,
  indeterminate = false,
}: {
  checked: boolean;
  indeterminate?: boolean;
}) {
  // A real checkbox, not a bare tick: every row shows an empty box when
  // unticked (a filled box when ticked) so the menu clearly reads as
  // multi-select instead of leaving blank space beside unticked rows.
  // Presentational only — the row's own onClick owns the toggle.
  //
  // `indeterminate` (a parent with a sub-category selected, but not the parent
  // itself) renders the standard filled-box-with-a-dash partial state — it
  // reads as "something inside is chosen" without implying the whole branch.
  if (indeterminate && !checked) {
    return (
      <span
        aria-hidden
        className="pointer-events-none grid size-4 shrink-0 place-content-center rounded-[4px] border border-primary bg-primary text-primary-foreground"
      >
        <MinusIcon className="size-3.5" />
      </span>
    );
  }
  return (
    <Checkbox
      checked={checked}
      tabIndex={-1}
      aria-hidden
      className="pointer-events-none shrink-0"
    />
  );
}

function CheckRow({
  checked,
  indeterminate = false,
  onToggle,
  label,
  disabled = false,
}: {
  checked: boolean;
  /** A parent with a sub-category selected but not itself — partial box. */
  indeterminate?: boolean;
  onToggle: () => void;
  label: React.ReactNode;
  /** Covered by a selected parent — checked but locked. */
  disabled?: boolean;
}) {
  return (
    <DropdownMenuItem
      // Keep the menu open so several categories can be ticked in one go.
      closeOnClick={false}
      disabled={disabled}
      onClick={disabled ? undefined : onToggle}
      title={disabled ? S.coveredByParent : undefined}
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
        checked && "font-medium",
        disabled && "opacity-60",
      )}
    >
      <CheckMark checked={checked} indeterminate={indeterminate} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </DropdownMenuItem>
  );
}
