import { MessageSquareText, StickyNote } from "lucide-react";

import { DetailTextBlock } from "@/components/common/display/DetailTextBlock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EMPTY_VALUE } from "@/shared/constants";
import { formatIST } from "@shared/lib/date";
import { DetailFact, FactGrid } from "@modules/wms";

import { formatINR } from "../../lib/format";
import { adjustmentReasonLabel } from "../../lib/stock-adjustment-labels";
import type { StockAdjustment } from "../../stock-adjustments.api";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

const D = S.detail;

const ist = (iso: string | null) => (iso ? formatIST(iso) : EMPTY_VALUE);

/** Header facts + notes of one adjustment, in the shared detail-card grammar. */
export function AdjustmentOverviewCard({ adjustment: a }: { adjustment: StockAdjustment }) {
  const source = a.source === "import" ? D.sourceImport(a.import_filename) : D.sourceForm;
  // A rejection reason is shown as the callout at the top of the page instead.
  const decisionNotes = a.status === "rejected" ? null : a.decision_notes;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{D.overview}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FactGrid>
          <DetailFact label={D.warehouse} value={a.warehouse_name} />
          <DetailFact label={D.reason} value={adjustmentReasonLabel(a.reason)} />
          <DetailFact label={D.source} value={source} />
          <DetailFact label={D.createdBy} value={a.created_by_name} />
          <DetailFact label={D.created} value={ist(a.created_at)} />
          <DetailFact label={D.submitted} value={ist(a.submitted_at)} />
          {a.status === "approved" ? <DetailFact label={D.unitsAdded} value={a.units_added} /> : null}
          {a.status === "approved" ? <DetailFact label={D.unitsRemoved} value={a.units_removed} /> : null}
          {/* Present only for callers who may see prices — keyed off the payload. */}
          {a.total_value != null ? <DetailFact label={D.totalValue} value={formatINR(Number(a.total_value))} /> : null}
        </FactGrid>
        <DetailTextBlock icon={StickyNote} label={D.notes} text={a.notes} />
        {decisionNotes ? (
          <DetailTextBlock icon={MessageSquareText} label={D.decisionNotes} text={decisionNotes} />
        ) : null}
      </CardContent>
    </Card>
  );
}
