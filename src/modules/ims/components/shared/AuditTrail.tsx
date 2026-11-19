import { useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  PackagePlus,
  Pencil,
  Plus,
  Trash2,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { TablePagination } from "@/components/common/tables/TablePagination";
import { cn } from "@/lib/utils";
import { formatIST_date } from "@shared/lib/date";

import { useActivity } from "../../hooks/shared/useActivity";
import { IMS_PAGE_SIZE } from "../../constants";
import type {
  ActivityChange,
  ActivityEntry,
  ActivityResourceType,
} from "../../api";
import { IMS_SHARED_STRINGS } from "./shared.strings";

// Per-resource audit-log timeline for IMS detail pages. Same visual
// treatment as the CRM Audit Trail (timeline rail + colored dot +
// action-tinted card + collapsible "Show changes N" expander) but
// driven by the IMS `ActivityEntry` shape — the backend already
// resolves FK ids to names and pre-formats money / booleans, so we
// render `changes[]` verbatim without the FK-resolution machinery
// the CRM component carries.

interface AuditTrailProps {
  resourceType: ActivityResourceType;
  resourceId: string;
}

// Client-side filter buckets. Backend has no action filter param yet,
// so we fetch a page and filter the rendered rows. Each bucket matches
// an IMS-emitted action suffix (`*_created`, `*_updated`, etc.) — see
// the `categoryFromAction` helper below.
type FilterKey = "all" | "created" | "updated" | "deleted" | "other";

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "All",
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  other: "Other",
};

const FILTER_ORDER: FilterKey[] = ["all", "created", "updated", "deleted", "other"];

// Action → category mapping. Suffix match keeps the table small as new
// resources land (every `<resource>_created` falls into "created" with
// no extra wiring). `price_changed`, `*_disposed`, `*_moved` get
// explicit handling because their suffixes don't follow the pattern.
function categoryFromAction(action: string): FilterKey {
  const a = action.toLowerCase();
  if (a.endsWith("_created") || a === "insert" || a === "create") return "created";
  if (a.endsWith("_updated") || a === "update" || a === "price_changed")
    return "updated";
  if (
    a.endsWith("_deleted") ||
    a.endsWith("_disposed") ||
    a === "delete" ||
    a === "soft_delete"
  )
    return "deleted";
  return "other";
}

// Action → icon + dot color. Matches the CRM AuditTrail palette so the
// two surfaces feel like the same component. Defaults to a neutral
// pencil + muted dot for actions we haven't classified yet (e.g. new
// audit codes the backend adds later).
interface ActionVisual {
  icon: LucideIcon;
  dotColor: string;
  cardClass: string;
  iconClass: string;
}

const ACTION_VISUALS: Record<FilterKey, ActionVisual> = {
  created: {
    icon: Plus,
    dotColor: "bg-success",
    cardClass: "border-success/30 bg-success-soft/50",
    iconClass: "text-success",
  },
  updated: {
    icon: Pencil,
    dotColor: "bg-info",
    cardClass: "border-info-soft/80 bg-info-soft",
    iconClass: "text-info",
  },
  deleted: {
    icon: Trash2,
    dotColor: "bg-destructive",
    cardClass: "border-destructive/30 bg-destructive-soft/50",
    iconClass: "text-destructive",
  },
  other: {
    icon: Pencil,
    dotColor: "bg-muted-foreground",
    cardClass: "bg-muted/30",
    iconClass: "text-muted-foreground",
  },
  // `all` is never used to look up a visual — listed only so the map
  // covers every FilterKey and TS stays happy on the lookup below.
  all: {
    icon: Pencil,
    dotColor: "bg-muted-foreground",
    cardClass: "bg-muted/30",
    iconClass: "text-muted-foreground",
  },
};

// Special-case overrides — actions whose visual doesn't follow the
// suffix-driven default (price changes get the rupee glyph, stock
// moves get a truck). Keys are exact action codes the backend emits.
const ACTION_OVERRIDES: Record<string, Partial<ActionVisual>> = {
  price_changed: {
    icon: IndianRupee,
    dotColor: "bg-warning",
    cardClass: "border-warning/30 bg-warning-soft/40",
    iconClass: "text-warning",
  },
  stock_item_created: {
    icon: PackagePlus,
  },
  stock_item_moved: {
    icon: Truck,
    dotColor: "bg-violet",
    cardClass: "border-violet/30 bg-violet-soft",
    iconClass: "text-violet",
  },
};

function visualForAction(action: string): ActionVisual {
  const base = ACTION_VISUALS[categoryFromAction(action)];
  const override = ACTION_OVERRIDES[action];
  return override ? { ...base, ...override } : base;
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return formatIST_date(iso);
}

export function AuditTrail({ resourceType, resourceId }: AuditTrailProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(IMS_PAGE_SIZE);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set());

  const { data, isLoading, isError, isFetching, error } = useActivity(
    resourceType,
    resourceId,
    { page, pageSize },
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Which buckets actually have rows on this page — used to disable
  // pills that would otherwise produce an empty list, mirroring the
  // CRM AuditTrail's "filtering coming soon" disabled treatment.
  const presentCategories = useMemo(() => {
    const set = new Set<FilterKey>(["all"]);
    for (const e of items) set.add(categoryFromAction(e.action));
    return set;
  }, [items]);

  const filtered = useMemo(() => {
    if (activeFilter === "all") return items;
    return items.filter((e) => categoryFromAction(e.action) === activeFilter);
  }, [items, activeFilter]);

  const toggleExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <Typography
        variant="body-strong"
        tone="muted"
        className="font-ui uppercase tracking-wide"
        asChild
      >
        <h3>{IMS_SHARED_STRINGS.auditTrail.heading}</h3>
      </Typography>

      {/* Filter pills — client-side filtering only; no backend round-trip
          per click. Disabled buckets carry a tooltip so the operator knows
          why the pill is dimmed (no rows of that kind on this page). */}
      <div className="flex flex-wrap gap-2">
        {FILTER_ORDER.map((key) => {
          const disabled = !presentCategories.has(key);
          return (
            <Button
              key={key}
              variant={activeFilter === key ? "default" : "secondary"}
              size="sm"
              disabled={disabled}
              title={
                disabled ? IMS_SHARED_STRINGS.auditTrail.filterDisabledTitle : undefined
              }
              onClick={() => {
                if (!disabled) setActiveFilter(key);
              }}
            >
              {FILTER_LABELS[key]}
            </Button>
          );
        })}
      </div>

      {isLoading && filtered.length === 0 ? (
        <FeedSkeleton />
      ) : isError ? (
        <FeedError error={error} />
      ) : filtered.length === 0 ? (
        <FeedEmpty />
      ) : (
        <div className="relative space-y-3 pl-6">
          {/* Vertical rail */}
          <div className="absolute top-0 bottom-0 left-[5px] w-0.5 bg-border" />

          {filtered.map((entry) => (
            <TimelineRow
              key={entry.id}
              entry={entry}
              isOpen={expandedRows.has(entry.id)}
              onToggle={() => toggleExpanded(entry.id)}
            />
          ))}
        </div>
      )}

      <TablePagination
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        total={total}
        isFetching={isFetching}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}

function TimelineRow({
  entry,
  isOpen,
  onToggle,
}: {
  entry: ActivityEntry;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const visual = visualForAction(entry.action);
  const Icon = visual.icon;
  const Chevron = isOpen ? ChevronUp : ChevronDown;
  const actorName = entry.actor?.name?.trim() || entry.actor?.email || "System";

  return (
    <div className="relative flex gap-3">
      {/* Dot */}
      <div
        className={cn(
          "absolute -left-6 top-1.5 flex size-3 items-center justify-center rounded-full",
          visual.dotColor,
        )}
      />

      {/* Card */}
      <div
        className={cn(
          "min-w-0 flex-1 rounded-lg border p-1.5",
          visual.cardClass,
        )}
      >
        <div className="flex items-start gap-2">
          <Icon className={cn("mt-0.5 size-4 shrink-0", visual.iconClass)} />
          <div className="min-w-0 flex-1">
            <Typography asChild variant="body-sm" className="font-medium">
              <p>{entry.headline}</p>
            </Typography>

            {/* User + timestamp */}
            <Typography
              asChild
              variant="helper"
              tone="muted"
              className="mt-1 flex items-center gap-2"
            >
              <div>
                <span>{actorName}</span>
                <span>·</span>
                <span>{formatRelativeTime(entry.occurred_at)}</span>
              </div>
            </Typography>

            {entry.note && (
              <Typography
                asChild
                variant="helper"
                tone="warning"
                className="mt-1.5 rounded-md border border-warning/40 bg-warning-soft px-2.5 py-1.5 italic"
              >
                <p>{entry.note}</p>
              </Typography>
            )}

            {/* "Show changes N" expander — only when there's a non-empty
                change list. Matches CRM's pill-style chevron toggle. */}
            {entry.changes.length > 0 && (
              <div className="mt-2">
                <Typography
                  asChild
                  variant="helper"
                  tone="muted"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 font-medium transition-colors hover:bg-background/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={isOpen}
                  >
                    <Chevron className="size-3.5" />
                    <span>{isOpen ? IMS_SHARED_STRINGS.auditTrail.hideChanges : IMS_SHARED_STRINGS.auditTrail.showChanges}</span>
                    {!isOpen && (
                      <Typography
                        variant="micro"
                        tone="muted"
                        className="rounded-full bg-muted px-1.5 py-0.5 font-semibold leading-none"
                      >
                        {entry.changes.length}
                      </Typography>
                    )}
                  </button>
                </Typography>

                {isOpen && (
                  <div className="mt-2 space-y-1 rounded-md border bg-background/70 p-2">
                    {entry.changes.map((c) => (
                      <ChangeLine key={c.field} change={c} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChangeLine({ change }: { change: ActivityChange }) {
  // Pre-formatted strings from the backend — we just decide the colored
  // marker based on whether old/new is null. Mirrors the CRM diff line.
  const added = change.old == null && change.new != null;
  const removed = change.old != null && change.new == null;
  const changed = change.old != null && change.new != null;

  return (
    <Typography
      asChild
      variant="helper"
      tone="inherit"
      className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
    >
      <div>
      <span className="font-medium text-foreground">{change.label}:</span>
      {added && (
        <>
          <span className="text-success">{IMS_SHARED_STRINGS.auditTrail.added}</span>
          <span className="text-foreground">{change.new ?? "—"}</span>
        </>
      )}
      {removed && (
        <>
          <span className="text-destructive">{IMS_SHARED_STRINGS.auditTrail.removed}</span>
          <span className="text-foreground">{change.old ?? "—"}</span>
        </>
      )}
      {changed && (
        <>
          <span className="text-muted-foreground line-through">{change.old}</span>
          <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
          <span className="text-foreground">{change.new}</span>
        </>
      )}
      {!added && !removed && !changed && (
        <span className="text-muted-foreground">—</span>
      )}
      </div>
    </Typography>
  );
}

// ─── Loading / error / empty ─────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div
      className="relative space-y-3 pl-6"
      role="status"
      aria-label={IMS_SHARED_STRINGS.auditTrail.loadingAriaLabel}
    >
      <div className="absolute top-0 bottom-0 left-[5px] w-0.5 bg-border" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="relative flex gap-3">
          <div className="absolute -left-6 top-1.5 size-3 rounded-full bg-muted" />
          <div className="min-w-0 flex-1 rounded-lg border bg-muted/30 p-1.5">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-2 w-1/4 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FeedError({ error }: { error: unknown }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <Typography variant="body" tone="muted">
        {error instanceof Error
          ? IMS_SHARED_STRINGS.auditTrail.loadError(error.message)
          : IMS_SHARED_STRINGS.auditTrail.loadErrorGeneric}
      </Typography>
    </div>
  );
}

function FeedEmpty() {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <Typography variant="body" tone="muted">
        {IMS_SHARED_STRINGS.auditTrail.empty}
      </Typography>
    </div>
  );
}
