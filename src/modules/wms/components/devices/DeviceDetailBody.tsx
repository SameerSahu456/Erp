import { AlertTriangle, ArrowLeftRight, ListChecks } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-shells";
import { isForbidden } from "@shared/api/envelope";
import {
  useRecordLabel,
  recordNotFoundTitle,
} from "@shared/routing/record-label";

import { isDeviceAway } from "../../constants/component-check-state";
import { useDeviceDetailView } from "../../hooks/devices/useDeviceDetailView";
import { STOCK_TRANSFER_STRINGS } from "../stock-transfer/stock-transfer.strings";
import { VendorServiceCards } from "../vendor-jobs/VendorServiceCards";
import { DEVICE_IDENTITY_STRINGS } from "./device-identity/device-identity.strings";
import { DEVICE_DETAIL_BODY_STRINGS } from "./device-detail-body.strings";
import {
  headerSubtitle,
  locationLabel,
  partModelOf,
  resolveHeaderStatus,
} from "./device-detail/device-detail-view-helpers";
import { ActivityTimeLog } from "./device-detail/ActivityTimeLog";
import { ChecklistRunsCard } from "./device-detail/ChecklistRunsCard";
import { ComponentsCard } from "./device-detail/ComponentsCard";
import { DeviceHeaderActions } from "./device-detail/DeviceHeaderActions";
import { DeviceInfoCard } from "./device-detail/DeviceInfoCard";
import { DeviceStageDialogs } from "./device-detail/DeviceStageDialogs";
import { DeviceUnavailable } from "./device-detail/DeviceUnavailable";
import {
  PurchaseReturnBanner,
  SalesReturnBanner,
} from "./device-detail/LiveReturnBanner";
import { ReplacementRequestNotice } from "../replacement-requests/ReplacementRequestNotice";
import { SparesRequestedCard } from "./device-detail/SparesRequestedCard";
import { WorkflowHistoryCard } from "./device-detail/WorkflowHistoryCard";

const S = DEVICE_DETAIL_BODY_STRINGS;

type DetailView = ReturnType<typeof useDeviceDetailView>;
type LoadedDevice = NonNullable<DetailView["device"]>;
interface LoadedProps {
  v: DetailView;
  device: LoadedDevice;
}

export function DeviceDetailBody() {
  const v = useDeviceDetailView();
  const label = useRecordLabel();
  const { device, deviceQuery } = v;

  if (deviceQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={S.headerTitle} />
        {/* Skeleton placeholders rather than a bare "Loading…" (§0.6 / §12.1). */}
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  if (deviceQuery.isError || !device) {
    return (
      <div className="space-y-6">
        <PageHeader title={S.headerTitle} />
        {/* A 403 is a permission boundary, never "doesn't exist". */}
        <DeviceUnavailable
          forbidden={isForbidden(deviceQuery.error)}
          isError={deviceQuery.isError}
          notFoundTitle={recordNotFoundTitle(label, S.notFoundTitle)}
          onRetry={() => void deviceQuery.refetch()}
        />
      </div>
    );
  }
  return <DeviceDetailLoaded v={v} device={device} />;
}

function DeviceDetailLoaded({ v, device }: LoadedProps) {
  const liveReturn = v.deviceQuery.data?.live_purchase_return ?? null;
  const liveSalesReturn = v.deviceQuery.data?.live_sales_return ?? null;

  return (
    <div className="space-y-6">
      {/* Re-identified into a different checklist scope, so the rack gate now
          refuses it — said here rather than discovered as a 422 at the rack. */}
      {device.checklist_rerun_required ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>{DEVICE_IDENTITY_STRINGS.banner.title}</AlertTitle>
          <AlertDescription>
            {DEVICE_IDENTITY_STRINGS.banner.body}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Racking does not wait for the contents check, so the page flags it
          instead (inward-verification D8). Clears itself once all are checked.
          Not while the device is away: nothing can be checked until it is back. */}
      {device.components_unchecked && !isDeviceAway(device.status) ? (
        // Amber "needs attention" tint, matching the live-return notice on this page.
        <Alert className="border-warning/40 bg-warning-soft px-4 py-3 *:[svg]:text-warning">
          <ListChecks />
          <AlertTitle>
            {DEVICE_DETAIL_BODY_STRINGS.componentsUnchecked.title}
          </AlertTitle>
          <AlertDescription>
            {DEVICE_DETAIL_BODY_STRINGS.componentsUnchecked.body}
          </AlertDescription>
        </Alert>
      ) : null}

      <DeviceDetailHeader v={v} device={device} />

      <DeviceStageDialogs
        id={v.id}
        device={device}
        canMove={v.canMove}
        dialog={v.dialog}
        onClose={v.closeDialog}
      />

      {liveReturn && <PurchaseReturnBanner liveReturn={liveReturn} />}
      {liveSalesReturn && <SalesReturnBanner liveReturn={liveSalesReturn} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <DeviceDetailMainColumn v={v} device={device} />

        {/* The timeline is taller than the left column: taken OUT of flow on
            desktop so the left column sizes the row and the card scrolls
            internally. On mobile it's normal flow. */}
        <div className="min-w-0 lg:relative lg:col-span-1">
          <div className="lg:absolute lg:inset-0">
            <WorkflowHistoryCard
              history={v.history}
              isLoading={v.historyQuery.isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DeviceDetailHeader({ v, device }: LoadedProps) {
  const subtitle = headerSubtitle(device, partModelOf(device));
  return (
    <PageHeader
      title={device.internal_serial}
      titleCopyable
      status={resolveHeaderStatus(device)}
      subtitle={subtitle || undefined}
      backHref={v.backHref}
      actions={
        <>
          {v.canMove ? (
            <Button variant="outline" onClick={() => v.openDialog("move")}>
              <ArrowLeftRight className="size-4" data-icon="inline-start" />
              {STOCK_TRANSFER_STRINGS.title}
            </Button>
          ) : null}
          <DeviceHeaderActions
            deviceId={v.id}
            internalSerial={device.internal_serial}
            deviceStatus={device.status}
            hasLocation={!!device.warehouse_location_id}
            scrapPriorStatus={device.scrap_prior_status}
            workflowStatus={v.wf}
            warehouseId={device.warehouse_id ?? ""}
            grnBatchId={device.grn_batch_id ?? null}
            assigneeIds={{
              inspection: device.inspection_assignee_id,
              qc: device.qc_assignee_id,
              repair: device.repair_assignee_id,
            }}
            onOpenInspectionForm={() => v.openDialog("inspection")}
            onOpenRepairForm={() => v.openDialog("repair")}
            onOpenQcForm={() => v.openDialog("qc")}
            onOpenRack={() => v.openDialog("rack")}
          />
        </>
      }
    />
  );
}

function DeviceDetailMainColumn({ v, device }: LoadedProps) {
  const { id } = v;
  const liveReplacement = v.deviceQuery.data?.live_replacement_request ?? null;
  return (
    <div className="min-w-0 space-y-6 lg:col-span-2">
      <DeviceInfoCard
        device={device}
        partModel={partModelOf(device)}
        // GRN number is denormalized on the summary — no batch fetch (which
        // needs `wms:inward_read` and 403'd for engineers).
        batch={device.grn_number || "—"}
        location={locationLabel(device)}
        category={device.category_name || "—"}
        ctx={v.ctx}
        liveWorkAssignment={v.deviceQuery.data?.live_work_assignment ?? null}
      />
      {/* What is physically inside this device (component-tracking D1).
          Gated on the category's assembly flag — the same gate the API
          enforces on every composition write (else 422
          CATEGORY_NOT_BOM_ELIGIBLE). */}
      {device.is_bom_eligible && (
        <ComponentsCard
          deviceId={id}
          deviceWarehouseId={device.warehouse_id}
          deviceStatus={device.status}
        />
      )}
      {/* Always shown: a device's spare requests stay visible however it
          was reached. The card self-handles empty state + raise gating. */}
      <SparesRequestedCard
        deviceId={id}
        deviceStatus={device.status}
        warehouseId={device.warehouse_id ?? null}
        stageByOp={v.stageByOp}
        canRaise={v.canRaiseSpare}
        canCancel={v.canCancelSpare}
        raiseStage={v.spareRaiseStage ?? "repair"}
      />
      {/* Raise is offered only once the unit is being worked (Repair / QC /
          Outward QC); job history shows in every stage. */}
      <VendorServiceCards
        deviceId={id}
        canRaise={v.canRaiseVendor}
        canManage={v.canManageVendorJob}
        canWithdraw={v.canStage("service_job", device.warehouse_id)}
      />
      <ChecklistRunsCard runs={v.checklistRuns} />
      {/* The open replacement request: which parts to check and what to do. */}
      {liveReplacement && <ReplacementRequestNotice live={liveReplacement} />}
      <ActivityTimeLog deviceId={id} />
    </div>
  );
}
