import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { PURCHASE_RETURN_DETAIL_STRINGS as S } from "./purchase-returns.strings";

interface Props {
  disabledReason: string | null;
  pending: boolean;
  onOpen: () => void;
}

/** Header Dispatch button; disables with a reason rather than hiding. */
export function PurchaseReturnDispatchAction({ disabledReason, pending, onOpen }: Props) {
  if (disabledReason == null) {
    return (
      <Button variant="outline" disabled={pending} onClick={onOpen}>
        {S.dispatch}
      </Button>
    );
  }
  // Disabled with a styled why-tooltip, never a native `title=` (§0.9/§0.14).
  // The trigger wraps a span so the disabled button still surfaces the reason.
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex cursor-not-allowed" />}>
          <Button variant="outline" disabled>
            {S.dispatch}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{disabledReason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
