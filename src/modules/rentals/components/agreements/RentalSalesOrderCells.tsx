import type { MouseEvent } from "react";
import { AlertTriangle, Settings2 } from "lucide-react";

import { StatusBadge } from "@/components/common/display/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";
import { EMPTY_VALUE } from "@/shared/constants";
import { SO_STATUS_LABELS, SO_STATUS_VARIANT, type SOStatus } from "@modules/crm";

import type { RentalDisplayStatus } from "../../api/agreements";
import { RENTAL_STATUS_LABELS, RENTAL_STATUS_VARIANT } from "../../constants/billing";
import { PURCHASE_ORDER_STRINGS as PO } from "../purchase-orders/purchase-orders.strings";
import { PoStateCell } from "../purchase-orders/PoStateCell";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { RentalSalesOrderActions } from "./RentalSalesOrderActions";

/** A live order nobody configured bills nothing, silently — flagged on the
 *  order number, the cell an operator scans. */
export function NeedsConfigurationOrderCell({ orderNumber }: { orderNumber: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex items-center gap-1.5" />}>
        <AlertTriangle className="size-3.5 shrink-0 text-destructive" aria-hidden />
        <Typography variant="body-strong" tone="danger" asChild>
          <span>{orderNumber}</span>
        </Typography>
      </TooltipTrigger>
      <TooltipContent>{S.list.needsConfiguration}</TooltipContent>
    </Tooltip>
  );
}

/** CRM's lifecycle vocabulary; an unmapped status degrades to a neutral badge. */
export function SoStatusCell({ status }: { status: string }) {
  if (!status) {
    return (
      <Typography variant="body" tone="muted">
        {EMPTY_VALUE}
      </Typography>
    );
  }
  const s = status as SOStatus;
  return <StatusBadge variant={SO_STATUS_VARIANT[s] ?? "neutral"}>{SO_STATUS_LABELS[s] ?? status}</StatusBadge>;
}

/** No agreement yet says what has to happen, not "—". */
export function RentalStatusCell({ status }: { status: string }) {
  if (!status) return <StatusBadge variant="warning">{S.list.toConfigure}</StatusBadge>;
  const s = status as RentalDisplayStatus;
  return <StatusBadge variant={RENTAL_STATUS_VARIANT[s] ?? "neutral"}>{RENTAL_STATUS_LABELS[s] ?? status}</StatusBadge>;
}

/** The live rate is 0 until a unit ships; show what the order was sold at
 *  then. One figure, no "expected" tag (2026-10-29). */
export function MonthlyRateCell({ live, expected }: { live: number; expected: number }) {
  return <>{formatINR(live !== 0 || expected <= 0 ? live : expected)}</>;
}

export function PoCell({ row }: { row: Record<string, unknown> }) {
  if (row.po) return <PoStateCell row={row} />;
  return (
    <Typography variant="helper" tone="muted">
      {row._poRequired === true ? PO.list.onFile : EMPTY_VALUE}
    </Typography>
  );
}

const stop = (e: MouseEvent) => e.stopPropagation();

interface ConfigureCellProps {
  salesOrderId: string;
  orderNumber: string;
  isConfigured: boolean;
  /** Amended since last configured — due for Configure again once Approved. */
  reconfigureRequired: boolean;
  canConfigure: boolean;
  mayConfigure: boolean;
  onConfigure: (id: string) => void;
}

/** ONE column: an unconfigured order can only be configured; a configured one
 *  has its lifecycle menu, plus "Configure again" once an amendment is
 *  approved. The row navigates, so clicks here stop there. */
export function ConfigureCell(props: ConfigureCellProps) {
  const { salesOrderId, isConfigured, canConfigure } = props;
  if (isConfigured) {
    const again = props.reconfigureRequired && canConfigure && props.mayConfigure;
    return (
      <div className="flex items-center justify-end gap-2" onClick={stop} role="presentation">
        {again && (
          <Button size="sm" onClick={() => props.onConfigure(salesOrderId)}>
            <Settings2 className="size-4" />
            {S.so.configureAgain}
          </Button>
        )}
        <RentalSalesOrderActions salesOrderId={salesOrderId} orderNumber={props.orderNumber} />
      </div>
    );
  }
  // Configuring is the accounts team's job; anyone else would be refused on save.
  if (!props.mayConfigure) return null;
  const button = (
    <Button
      size="sm"
      disabled={!canConfigure}
      onClick={(e) => {
        stop(e);
        props.onConfigure(salesOrderId);
      }}
    >
      <Settings2 className="size-4" />
      {S.so.configure}
    </Button>
  );
  return (
    <div className="flex justify-end">
      {canConfigure ? (
        button
      ) : (
        // A disabled button swallows its own tooltip, so the trigger is a span.
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>{button}</TooltipTrigger>
          <TooltipContent>{S.so.needsApproval}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
