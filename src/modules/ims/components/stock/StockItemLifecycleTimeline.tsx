import { useQuery } from "@tanstack/react-query";

import { Typography } from "@/components/ui/typography";
import { formatIST } from "@shared/lib/date";
import { fetchAuditTrailPage } from "@modules/audit";

const STRINGS = {
  heading: "Lifecycle",
  loading: "Loading lifecycle…",
  error: "Couldn’t load the lifecycle for this unit. Please try again.",
  empty: "No lifecycle events recorded for this unit yet.",
  by: "by",
  unknownActor: "system",
} as const;

// Show a deep slice of this unit's history in one pass (it's a read-only
// timeline, not a pager), so this intentionally exceeds the 10-row list
// default — named here rather than a bare literal (§16.6).
const LIFECYCLE_PAGE_SIZE = 50;

/** Per-stock-item lifecycle: the audit trail scoped to this unit
 *  (issued → dispatched → issued …), driven by the stock_item-scoped audit
 *  entries the MI-issue / dispatch / cancel flows emit. */
export function StockItemLifecycleTimeline({ stockItemId }: { stockItemId: string }) {
  const q = useQuery({
    queryKey: ["audit", "trail", "stock_item", stockItemId],
    enabled: !!stockItemId,
    queryFn: () =>
      fetchAuditTrailPage({
        resource_type: "stock_item",
        resource_id: stockItemId,
        page: 1,
        page_size: LIFECYCLE_PAGE_SIZE,
      }),
  });

  const entries = q.data?.items ?? [];

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <Typography variant="section-title">{STRINGS.heading}</Typography>
      {q.isLoading ? (
        <Typography variant="helper" tone="muted">{STRINGS.loading}</Typography>
      ) : q.isError ? (
        <Typography variant="helper" tone="danger">{STRINGS.error}</Typography>
      ) : entries.length === 0 ? (
        <Typography variant="helper" tone="muted">{STRINGS.empty}</Typography>
      ) : (
        <ol className="space-y-2">
          {entries.map((e) => {
            const before = (e.before as { status?: string } | null)?.status;
            const after = (e.after as { status?: string } | null)?.status;
            return (
              <li key={e.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Typography variant="body-strong">{e.action}</Typography>
                  {(before || after) && (
                    <Typography variant="caption" tone="muted">
                      {before ?? "—"} → {after ?? "—"} · {STRINGS.by}{" "}
                      {e.actor_name ?? STRINGS.unknownActor}
                    </Typography>
                  )}
                </div>
                <Typography variant="caption" tone="muted" className="shrink-0">
                  {formatIST(e.created_at)}
                </Typography>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
