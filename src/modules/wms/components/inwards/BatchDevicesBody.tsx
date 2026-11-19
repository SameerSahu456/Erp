import { FileText } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { ExpandableClampText } from "@/components/common/display/ExpandableClampText";
import { PageHeader } from "@/components/page-shells";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { recordNotFoundTitle } from "@shared/routing/record-label";
import { MoveStockDialog } from "../stock-transfer/MoveStockDialog";
import { DeliveryChallanSection } from "./DeliveryChallanSection";
import { INWARDS_STRINGS } from "./inwards.strings";
import {
  useBatchDevices,
  type BatchDevicesView,
} from "../../hooks/inwards/useBatchDevices";
import {
  INWARD_TYPE_LABELS,
  INWARD_TYPE_VARIANT,
  GRN_STATUS_LABELS,
  GRN_STATUS_VARIANT,
} from "../../constants";
import { BatchHeaderActions } from "./batch-devices/BatchHeaderActions";
import { BatchInfoCard } from "./batch-devices/BatchInfoCard";
import { ReceivedUnitsCard } from "./batch-devices/ReceivedUnitsCard";
import { ReplacementPartsOwedCard } from "./batch-devices/ReplacementPartsOwedCard";
import { ReplacementRequestNotesCard } from "./batch-devices/ReplacementRequestNotesCard";
import { StagedLinesCard } from "./batch-devices/StagedLinesCard";
import type { BatchDerivedView } from "./batch-devices/batch-view-helpers";

type SectionProps = { view: BatchDevicesView; derived: BatchDerivedView };

function BatchPageHeader({ view, derived }: SectionProps) {
  const { batch, inwardType, status, isOpen, hasStaged } = derived;
  return (
    <PageHeader
      title={batch.grn_number}
      titleCopyable
      status={{
        label: GRN_STATUS_LABELS[status] ?? status,
        variant: GRN_STATUS_VARIANT[status] ?? "neutral",
      }}
      badges={
        <>
          <StatusBadge variant={INWARD_TYPE_VARIANT[inwardType] ?? "neutral"}>
            {INWARD_TYPE_LABELS[inwardType] ?? inwardType}
          </StatusBadge>
          {isOpen && !hasStaged && (
            <StatusBadge variant="warning">
              {INWARDS_STRINGS.batchDevices.needsItems}
            </StatusBadge>
          )}
        </>
      }
      actions={<BatchHeaderActions view={view} derived={derived} />}
      backHref="/wms/inward"
      className="mb-8"
    />
  );
}

/** Received units grouped by part, else the staged lines, else an empty state. */
function BatchUnitsSection({ view, derived }: SectionProps) {
  if (view.lines.length > 0) return <ReceivedUnitsCard view={view} derived={derived} />;
  if (derived.hasStaged) return <StagedLinesCard view={view} derived={derived} />;
  return (
    <EmptyState
      title={INWARDS_STRINGS.batchDevices.noUnitsRecordedTitle}
      description={INWARDS_STRINGS.batchDevices.noUnitsRecordedDescription}
    />
  );
}

function BatchLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-9 w-64 animate-pulse rounded-md bg-muted" />
      <div className="h-48 animate-pulse rounded-md bg-muted" />
      <div className="h-64 animate-pulse rounded-md bg-muted" />
    </div>
  );
}

/** GRN batch detail — thin shell over useBatchDevices; each card is its own
 *  presentational component under ./batch-devices/. */
export function BatchDevicesBody() {
  const view = useBatchDevices();
  const { batchQuery, derived, goBack } = view;

  // ── Loading / error / not-found states (§12.1) ──────────────────────────
  if (batchQuery.isLoading) return <BatchLoadingSkeleton />;
  if (batchQuery.isError) {
    return (
      <EmptyState
        title={INWARDS_STRINGS.batchDevices.loadErrorTitle}
        description={INWARDS_STRINGS.batchDevices.loadErrorDescription}
        action={{
          label: INWARDS_STRINGS.batchDevices.backToInward,
          onClick: goBack,
        }}
      />
    );
  }
  if (!derived) {
    return (
      <EmptyState
        title={recordNotFoundTitle(view.label, INWARDS_STRINGS.batchDevices.notFoundTitle)}
        description={INWARDS_STRINGS.batchDevices.notFoundDescription}
        action={{
          label: INWARDS_STRINGS.batchDevices.backToInward,
          onClick: goBack,
        }}
      />
    );
  }

  const { batch, isOpen } = derived;

  return (
    <div className="space-y-6">
      <MoveStockDialog
        open={view.parkOpen}
        onOpenChange={view.setParkOpen}
        warehouseId={view.parkWarehouseId}
        units={view.parkUnits}
      />
      <BatchPageHeader view={view} derived={derived} />

      {/* Batch Info Card */}
      <BatchInfoCard view={view} derived={derived} />

      {/* Replacement return: what the request asks for, read before inspecting. */}
      <ReplacementRequestNotesCard batch={batch} />

      {/* Delivery Challan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            {INWARDS_STRINGS.batchDevices.deliveryChallan}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Editable only while the batch is open — a finalized/cancelled GRN's
              delivery challan is a receiving record that must not change after. */}
          <DeliveryChallanSection batchId={batch.id} editable={isOpen} />
        </CardContent>
      </Card>

      {/* Notes */}
      {batch.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              {INWARDS_STRINGS.batchDevices.notes}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExpandableClampText text={batch.notes} lines={3} variant="body" />
          </CardContent>
        </Card>
      )}

      <ReplacementPartsOwedCard batch={batch} isOpen={isOpen} />

      <BatchUnitsSection view={view} derived={derived} />
    </div>
  );
}
