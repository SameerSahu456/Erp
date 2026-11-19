import type { ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/** Wraps a disabled control so hovering it says why (a disabled button gets no
 *  pointer events, so the tooltip hangs off a span around it). */
export function WhyDisabled({ reason, children }: { reason: string | null; children: ReactNode }) {
  if (!reason) return children;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex cursor-not-allowed" />}>{children}</TooltipTrigger>
        <TooltipContent>{reason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
