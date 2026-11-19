import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import { LOCATIONS_STRINGS } from "./locations.strings";

/** "Over capacity" short mark with an explanatory tooltip. */
export function OverCapacityMark({
  variant,
  className,
}: {
  variant: "helper" | "stat-value";
  className?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
          <Typography variant={variant} numeric={variant === "stat-value"} tone="inherit" asChild>
            <span className={cn("shrink-0 text-destructive", className)}>
              {LOCATIONS_STRINGS.rackKind.overCapacityShort}
            </span>
          </Typography>
        </TooltipTrigger>
        <TooltipContent>{LOCATIONS_STRINGS.rackKind.overCapacity}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
