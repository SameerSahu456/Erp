import { CalendarDays, Hash, Truck } from "lucide-react";

import { Typography } from "@/components/ui/typography";
import { CopyableText } from "@/components/common/display/CopyableText";
import { EntityRef } from "@/components/common/display/EntityRef";
import { formatIST_date } from "@shared/lib/date";
import { SOURCE_ENTITY_TYPE_LABELS } from "../../../constants/source-entity-type";
import { INWARDS_STRINGS } from "../inwards.strings";
import type { BatchDevicesView } from "../../../hooks/inwards/useBatchDevices";
import type { BatchDerivedView } from "./batch-view-helpers";

/** The source document number. A PO number opens the PO, but only for users
 *  allowed on the PO page; other sources stay copy-only. Block wrapper so the
 *  number sits below its label. */
function SourceNumber({ number, id, isPo }: { number: string; id: string; isPo: boolean }) {
  return (
    <div className="mt-1">
      {/* `inherit` on a PO so EntityRef's own link colour isn't overridden. */}
      <Typography variant="body-strong" tone={isPo ? "inherit" : undefined} className="break-words" asChild>
        {isPo ? (
          <EntityRef kind="purchase_order" id={id} value={number} />
        ) : (
          <CopyableText value={number}>{number}</CopyableText>
        )}
      </Typography>
    </div>
  );
}

/** The Source block of the Batch Information card — source document number,
 *  vendor, and (PO sources) the expected delivery date. */
export function BatchSourceSection({
  view,
  derived,
}: {
  view: BatchDevicesView;
  derived: BatchDerivedView;
}) {
  const { batch } = derived;
  const { sourceVendorName, sourceEta, isPoSource } = view;
  if (!batch.source) return null;
  return (
    <div className="border-t pt-4 pb-2">
      <Typography variant="badge" tone="muted" className="mb-3 block">
        {INWARDS_STRINGS.batchDevices.source}
      </Typography>
      <div className="grid grid-cols-2 items-start gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <div className="flex items-start gap-2">
          <Hash className="mt-0.5 size-4 text-muted-foreground" />
          <div className="min-w-0">
            <Typography variant="helper" className="block">
              {SOURCE_ENTITY_TYPE_LABELS[batch.source_entity_type] ??
                INWARDS_STRINGS.batchDevices.source}
            </Typography>
            {batch.source.display_number ? (
              <SourceNumber
                number={batch.source.display_number}
                id={batch.source_entity_id}
                isPo={isPoSource}
              />
            ) : (
              <Typography variant="body-strong" className="mt-1 block break-words">
                —
              </Typography>
            )}
          </div>
        </div>
        {sourceVendorName && (
          <div className="flex items-start gap-2">
            <Truck className="mt-0.5 size-4 text-muted-foreground" />
            <div className="min-w-0">
              <Typography variant="helper">
                {INWARDS_STRINGS.batchDevices.vendor}
              </Typography>
              <Typography variant="body-strong" className="break-words">
                {sourceVendorName}
              </Typography>
            </div>
          </div>
        )}
        {isPoSource && (
          <div className="flex items-start gap-2">
            <CalendarDays className="mt-0.5 size-4 text-muted-foreground" />
            <div className="min-w-0">
              <Typography variant="helper">
                {INWARDS_STRINGS.batchDevices.estimatedDeliveryDate}
              </Typography>
              <Typography variant="body-strong" className="break-words">
                {sourceEta ? formatIST_date(sourceEta) : "—"}
              </Typography>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
