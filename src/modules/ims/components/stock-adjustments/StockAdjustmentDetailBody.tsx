import { useParams } from "react-router-dom";

import { DetailPageShell } from "@/components/page-shells";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { Card } from "@/components/ui/card";
import { AttachmentsPanel } from "@/shared/components/AttachmentsPanel";
import { useAuth } from "@shared/auth/use-auth";
import { formatIST_date } from "@shared/lib/date";
import { asUuid } from "@shared/lib/validation";
import type { StockAdjustment } from "../../stock-adjustments.api";
import { usePermission } from "@shared/rbac";
import { LabelPreviewDialog } from "@modules/wms";

import { usePrintAdjustmentLabels } from "../../hooks/stock-adjustments/usePrintAdjustmentLabels";
import { useStockAdjustmentActions } from "../../hooks/stock-adjustments/useStockAdjustmentActions";
import { useStockAdjustment } from "../../hooks/stock-adjustments/useStockAdjustments";
import { addedUnitIds, adjustmentActionFlags } from "../../lib/stock-adjustment-actions";
import { adjustmentStatusLabel, adjustmentStatusVariant } from "../../lib/stock-adjustment-labels";
import { imsCan } from "../../permissions";
import { AdjustmentActions } from "./AdjustmentActions";
import { AdjustmentLinesTable } from "./AdjustmentLinesTable";
import { AdjustmentNotices } from "./AdjustmentNotices";
import { AdjustmentOverviewCard } from "./AdjustmentOverviewCard";
import { StockAdjustmentDetailFallback } from "./StockAdjustmentDetailFallback";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

/** Who decided + when — shown under the title (design). Absent until decided. */
const decidedSubtitle = (a: StockAdjustment) =>
  a.decided_at
    ? S.detail.decidedSubtitle(a.decided_by_name ?? "", formatIST_date(a.decided_at))
    : undefined;

/** Adjustment detail + approval (spec §7). */
export function StockAdjustmentDetailBody() {
  // §11.1: a malformed id becomes "" — the query stays disabled, not-found renders.
  const { id: rawId = "" } = useParams<{ id: string }>();
  const id = asUuid(rawId) ?? "";
  const query = useStockAdjustment(id);
  const actions = useStockAdjustmentActions(id);
  const { user } = useAuth();
  const { can } = usePermission();
  const adjustment = query.data;
  const labels = usePrintAdjustmentLabels(id, adjustment?.adjustment_number ?? "");

  if (!adjustment) return <StockAdjustmentDetailFallback query={query} />;

  const flags = adjustmentActionFlags(adjustment, {
    id: user?.id,
    canApprove: can(imsCan.stockAdjustApprove),
  });

  return (
    <DetailPageShell
      // The number copies on click — DetailPageShell's titleCopyable default (PAGE-UI §2).
      title={adjustment.adjustment_number}
      subtitle={decidedSubtitle(adjustment)}
      backHref="/ims/stock-adjustments"
      status={{
        label: adjustmentStatusLabel(adjustment.status),
        variant: adjustmentStatusVariant(adjustment.status),
      }}
      badges={
        adjustment.self_approved ? (
          <StatusBadge variant="info" showDot={false}>{S.detail.selfApproved}</StatusBadge>
        ) : null
      }
      actions={
        <AdjustmentActions
          id={adjustment.id}
          flags={flags}
          actions={actions}
          onPrintLabels={() => labels.print(addedUnitIds(adjustment))}
          printing={labels.isPrinting}
        />
      }
    >
      <div className="space-y-6">
        <AdjustmentNotices
          adjustment={adjustment}
          selfApproval={flags.selfApproval}
          listedError={actions.listedError}
        />
        <AdjustmentOverviewCard adjustment={adjustment} />
        <AdjustmentLinesTable lines={adjustment.lines} />
        <Card className="px-5">
          <AttachmentsPanel
            entityType="ims_stock_adjustment"
            entityId={adjustment.id}
            title={S.detail.attachments}
          />
        </Card>
      </div>
      <LabelPreviewDialog
        url={labels.preview?.url ?? null}
        count={labels.preview?.count ?? 0}
        filename={labels.preview?.filename ?? ""}
        onClose={labels.dismiss}
      />
    </DetailPageShell>
  );
}
