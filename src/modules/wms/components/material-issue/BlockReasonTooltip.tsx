import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Wraps a (possibly disabled) button so hovering it names why it's blocked
 *  (§0.9). The span trigger keeps the tooltip working on a disabled button. */
export function BlockReasonTooltip({
  reason,
  triggerClassName,
  children,
}: {
  reason: string | null;
  triggerClassName: string;
  children: ReactNode;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className={triggerClassName} />}>
          {children}
        </TooltipTrigger>
        {reason && <TooltipContent>{reason}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );
}
