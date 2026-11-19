import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState";
import { usePermission } from "@shared/rbac";

import type { DeviceIdentityReconcile } from "../../api/devices";
import { useDeviceIdentityReconcile } from "../../hooks/devices/useRentalDevices";
import { rentalsCan } from "../../permissions";
import { DEVICE_STRINGS as S } from "./devices.strings";

const R = S.reconcile;

function ReconcileCounts({ data }: { data: DeviceIdentityReconcile }) {
  const defects = [
    { label: R.noSerialNoLink, value: data.no_serial_no_link, hint: R.noSerialNoLinkHint },
    { label: R.orphanStockItem, value: data.orphan_stock_item, hint: R.orphanStockItemHint },
    { label: R.statusDisagreement, value: data.status_disagreement, hint: R.statusDisagreementHint },
    { label: R.doubleLet, value: data.double_let, hint: R.doubleLetHint },
  ];
  return (
    <CardContent className="space-y-4">
      {/* Progress, NOT a defect — see the component docstring. */}
      <div className="rounded-md border p-3">
        <div className="flex items-baseline justify-between gap-2">
          <Typography variant="body">{R.unlinked}</Typography>
          <Typography variant="body" numeric>
            {S.reconcile.progress(data.unlinked, data.live_units)}
          </Typography>
        </div>
        <Typography variant="helper" tone="muted">
          {R.unlinkedHint}
        </Typography>
      </div>
      <div className="space-y-2">
        {defects.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-2">
            <div className="min-w-0">
              <Typography variant="body">{row.label}</Typography>
              <Typography variant="helper" tone="muted">
                {row.hint}
              </Typography>
            </div>
            <Typography variant="body" numeric tone={row.value > 0 ? "danger" : "muted"}>
              {row.value.toLocaleString()}
            </Typography>
          </div>
        ))}
      </div>
    </CardContent>
  );
}

/**
 * Where the rental fleet's identity links disagree with reality.
 *
 * `unlinked` is the CUTOVER PROGRESS METRIC, not a defect: it starts at the
 * migrated fleet's size and falls as units come back and are linked by
 * their GRN, so it is shown apart from the four defects.
 */
export function DeviceIdentityReconcileCard() {
  // Read-gated like the rest of the page, so a viewer without it fires no 403.
  const canView = usePermission().canAny(rentalsCan.view);
  const { data, isPending, isError, error } = useDeviceIdentityReconcile({ enabled: canView });
  if (!canView) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>{R.title}</CardTitle>
        {data ? (
          <Badge variant={data.is_clean ? "secondary" : "destructive"}>
            {data.is_clean ? R.clean : R.hasDefects}
          </Badge>
        ) : null}
      </CardHeader>
      {isPending ? (
        <CardContent className="space-y-2" aria-label={R.loading}>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      ) : isError || !data ? (
        <CardContent>
          <LoadErrorState error={error} fallback={R.failed} compact />
        </CardContent>
      ) : (
        <ReconcileCounts data={data} />
      )}
    </Card>
  );
}
