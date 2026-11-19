import { Boxes } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState";
import type { DispatchLineItem } from "../../api/dispatch";
import { DISPATCH_DETAIL_STRINGS as S } from "./dispatch-detail.strings";
import { UnitCard } from "./UnitCard";

type LinesQuery = {
  data?: DispatchLineItem[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

/** The units card's non-data states: a skeleton while loading, the error
 *  with its reason, or the genuine "no units yet" message. */
function DispatchLinesState({ query, empty }: { query: LinesQuery; empty: boolean }) {
  if (query.isLoading) return <Skeleton className="h-24 w-full" />;
  if (query.isError) return <LoadErrorState error={query.error} fallback={S.linesLoadError} />;
  if (!empty) return null;
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <Typography variant="body" tone="muted">
        {S.noLines}
      </Typography>
    </div>
  );
}

/** Units — kept at the bottom (the fullest section). */
export function DispatchUnitsCard({
  query,
  isDraft,
}: {
  query: LinesQuery;
  isDraft: boolean;
}) {
  const lines = query.data ?? [];
  // A replacement part ships under the customer's device, which left on an
  // earlier dispatch — its parent is not on this one, so it is shown as a unit
  // of its own rather than dropped.
  const onThisDispatch = new Set(lines.map((l) => l.id));
  const primaries = lines.filter(
    (l) => l.parent_dispatch_item_id == null || !onThisDispatch.has(l.parent_dispatch_item_id),
  );
  const childrenOf = (pid: string) =>
    lines.filter((l) => l.parent_dispatch_item_id === pid);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Boxes className="size-4 text-primary" />
          {S.linesHeading}
        </CardTitle>
        {primaries.length > 0 && (
          <StatusBadge variant="neutral">{S.unitsCount(primaries.length)}</StatusBadge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {!isDraft && (
          <Typography variant="helper" tone="muted">
            {S.linesFrozen}
          </Typography>
        )}
        {/* Loading / failed are NOT "no units" — a failed fetch used to
            read as an empty dispatch. */}
        <DispatchLinesState query={query} empty={primaries.length === 0} />
        {primaries.length > 0 && (
          <div className="space-y-2">
            {primaries.map((p) => (
              <UnitCard key={p.id} primary={p} components={childrenOf(p.id)} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
