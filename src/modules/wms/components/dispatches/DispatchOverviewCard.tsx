import { Ban, ClipboardList, StickyNote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityRef } from "@/components/common/display/EntityRef";
import { DetailTextBlock } from "@/components/common/display/DetailTextBlock";
import { Typography } from "@/components/ui/typography";
import { formatIST } from "@shared/lib/date";
import type { DispatchRequest } from "../../api/dispatch";
import { DISPATCH_TYPE_API_LABELS } from "../../constants/dispatch-request";
import { RentalOrderNumberTag } from "../shared/RentalOrderNumberTag";
import { DetailFact } from "../shared/section-primitives";
import { DISPATCH_DETAIL_STRINGS as S } from "./dispatch-detail.strings";
import { sourceDocumentHref } from "./dispatch-detail-helpers";

/** Cancellation reason — a highlighted callout at the very top so a
 *  cancelled dispatch surfaces WHY at a glance, not buried in the grid. */
export function DispatchCancellationCallout({ reason }: { reason: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3.5">
      <Ban className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
      <div className="min-w-0 space-y-0.5">
        <Typography
          variant="caption"
          tone="danger"
          className="font-semibold uppercase tracking-wide"
        >
          {S.overview.cancellationReason}
        </Typography>
        <Typography variant="body-strong" className="break-words">
          {reason}
        </Typography>
      </div>
    </div>
  );
}

function SourceValue({ dr }: { dr: DispatchRequest }) {
  const src = dr.source;
  // Every source type with a detail page links to it.
  const sourceLink = sourceDocumentHref(dr.source_entity_type, dr.source_entity_id);
  if (!src?.display_number) return <>{S.none}</>;
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      {sourceLink ? (
        <EntityRef href={sourceLink} value={src.display_number} className="font-medium">
          {src.display_number}
        </EntityRef>
      ) : (
        src.display_number
      )}
      <RentalOrderNumberTag orderNumber={dr.rental_order_number} />
    </span>
  );
}

/** Overview — plain-text detail fields. */
export function DispatchOverviewCard({
  dr,
  displayNotes,
}: {
  dr: DispatchRequest;
  displayNotes: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="size-4 text-primary" />
          {S.overviewHeading}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <DetailFact
          label={S.overview.type}
          value={DISPATCH_TYPE_API_LABELS[dr.dispatch_type] ?? dr.dispatch_type}
        />
        <DetailFact label={S.overview.source} value={<SourceValue dr={dr} />} />
        <DetailFact
          label={S.overview.account}
          value={dr.source?.account_name ?? S.none}
        />
        <DetailFact
          label={S.overview.warehouse}
          value={dr.from_warehouse?.name ?? S.none}
        />
        <DetailFact label={S.overview.created} value={formatIST(dr.created_at)} />
        <DetailFact
          label={S.overview.dispatchedAt}
          value={dr.dispatched_at ? formatIST(dr.dispatched_at) : S.none}
        />
        {displayNotes && (
          <div className="col-span-2 md:col-span-3">
            <DetailTextBlock
              icon={StickyNote}
              label={S.overview.notes}
              text={displayNotes}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
