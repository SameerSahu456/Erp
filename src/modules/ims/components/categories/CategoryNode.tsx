import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  Pencil,
  Trash2,
} from "lucide-react";

import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { cn } from "@/lib/utils";

import type { Category } from "../../api";
import { CATEGORIES_STRINGS } from "./categories.strings";
import type { TreeNode } from "./categories-body-helpers";

export interface CategoryNodeProps {
  category: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  deletePending: boolean;
  /** Hides Edit / Delete affordances for `ims:read` users. */
  canWrite: boolean;
  /**
   * Whether to reserve the leading expand-chevron column. Defaults to `true`
   * (the tree list page). Set `false` where nodes never nest, e.g. the
   * subcategory table on the Category detail page, so leaf rows don't carry a
   * dead chevron gutter.
   */
  expandable?: boolean;
}

export function CategoryNode({
  category,
  depth,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  deletePending,
  canWrite,
  expandable = true,
}: CategoryNodeProps) {
  const hasSubs = category.subcategories.length > 0;
  const isOpen = expanded.has(category.id);
  const subCount = category.subcategories.length;
  const navigate = useNavigate();

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/ims/categories/${category.id}`)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate(`/ims/categories/${category.id}`);
          }
        }}
        className={cn(
          "group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
          "hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !category.isActive && "opacity-50",
        )}
        style={{ marginLeft: depth * 24 }}
      >
        {expandable &&
          (hasSubs ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle(category.id);
              }}
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={isOpen ? CATEGORIES_STRINGS.list.node.collapseLabel : CATEGORIES_STRINGS.list.node.expandLabel}
            >
              <ChevronRight
                className={cn(
                  "size-4 transition-transform duration-200",
                  isOpen && "rotate-90",
                )}
              />
            </button>
          ) : (
            <span className="size-6 shrink-0" />
          ))}

        {hasSubs ? (
          <FolderOpen className="size-[18px] shrink-0 text-violet" />
        ) : (
          <Folder className="size-[18px] shrink-0 text-muted-foreground/60" />
        )}

        <Typography
          asChild
          variant={depth === 0 ? "body-lg" : "body"}
          className={cn(
            "min-w-0 flex-1 truncate",
            depth === 0 ? "font-semibold" : "font-medium",
          )}
        >
          <span>{category.name}</span>
        </Typography>

        <Typography asChild variant="helper" tone="muted" className="ml-2 flex shrink-0 items-center gap-3 tabular-nums">
          <span>
          {hasSubs && (
            <span>
              {subCount} {subCount === 1 ? CATEGORIES_STRINGS.list.node.subcategorySingular : CATEGORIES_STRINGS.list.node.subcategoryPlural}
            </span>
          )}
          <span className="font-medium text-foreground/70">
            {category.partCount} {category.partCount === 1 ? CATEGORIES_STRINGS.list.node.partSingular : CATEGORIES_STRINGS.list.node.partPlural}
          </span>
          </span>
        </Typography>

        {!category.isActive && <StatusBadge variant="neutral">{CATEGORIES_STRINGS.list.node.inactive}</StatusBadge>}

        {/* Edit / Delete affordances only render for write-enabled users.
            Read-only viewers see the row without the hover-revealed
            action cluster. */}
        {canWrite && (
          <div className="ml-auto flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(category.raw);
              }}
              title={CATEGORIES_STRINGS.list.node.editTitle}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(category.raw);
              }}
              disabled={deletePending}
              title={CATEGORIES_STRINGS.list.node.deleteTitle}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {hasSubs && isOpen && (
        <div className="mt-0.5 space-y-0.5">
          {category.subcategories.map((sub) => (
            <CategoryNode
              key={sub.id}
              category={sub}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              deletePending={deletePending}
              canWrite={canWrite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
