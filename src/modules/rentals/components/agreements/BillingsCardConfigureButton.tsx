import { useNavigate } from "react-router-dom";
import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import type { RentalSalesOrderBillingDetail } from "../../api/sales-orders";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";

/** Configure / Reconfigure — a full page, since the terms govern every invoice.
 *  Blocked: disabled, with the API's own reason on hover (on a span — a
 *  disabled button swallows its tooltip). */
export function BillingsCardConfigureButton({
  salesOrderId,
  detail,
}: {
  salesOrderId: string;
  detail: RentalSalesOrderBillingDetail;
}) {
  const navigate = useNavigate();
  // An amended order is due for configuring again — the primary action.
  const due = !detail.is_configured || detail.reconfigure_required;
  const label = !detail.is_configured
    ? S.so.configure
    : detail.reconfigure_required
      ? S.so.configureAgain
      : S.so.reconfigure;
  const button = (
    <Button
      size="sm"
      variant={due ? "default" : "outline"}
      onClick={() => navigate(`/rentals/sales-orders/${salesOrderId}/configure`)}
      disabled={!detail.can_configure}
    >
      <Settings2 className="size-4" />
      {label}
    </Button>
  );
  const blocked = detail.configure_blocked_reason;
  if (!blocked) return button;
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>{button}</TooltipTrigger>
      <TooltipContent>{blocked}</TooltipContent>
    </Tooltip>
  );
}
