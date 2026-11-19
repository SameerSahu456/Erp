import type { ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * A single-line text value that ellipsizes when it's too long, with the FULL
 * value revealed in a styled tooltip on hover. The tooltip WRAPS long content
 * inside a bounded box, so it never runs off the edge.
 *
 * Reach for this on any read-only field that can outgrow its column / card —
 * payment & delivery terms, names, emails, addresses. The trigger is capped at
 * 160px by default so one long value can't stretch a table; pass `max-w-full`
 * (or another cap) via `className` for a detail/dialog field that should fill
 * its container and truncate there. [TruncatedSerial] is this component preset
 * for monospace serials.
 */
export function TruncatedText({
  value,
  className,
  mono = false,
  breakAll = false,
  emptyFallback = "—",
}: {
  value: string | null | undefined;
  className?: string;
  /** Monospace ramp (serials / barcodes). Default off. */
  mono?: boolean;
  /** Break at any character in the tooltip — for unbreakable strings like
   *  serials — instead of the default word-boundary wrap. */
  breakAll?: boolean;
  /** Rendered (no tooltip) when the value is empty or a dash. */
  emptyFallback?: ReactNode;
}) {
  const text = (value ?? "").trim();
  // Treat a missing value (or an em-dash placeholder) as "no value": render the
  // fallback with no hover tooltip.
  if (!text || text === "—") return <span className={className}>{emptyFallback}</span>;
  return (
    <TooltipProvider delay={120}>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              className={cn(
                "block max-w-[160px] cursor-default truncate",
                mono && "font-mono",
                className,
              )}
            >
              {text}
            </span>
          }
        />
        <TooltipContent
          className={cn(
            "max-w-[320px] whitespace-normal text-left leading-relaxed [&]:items-start",
            breakAll ? "break-all" : "break-words",
          )}
        >
          {mono ? <span className="font-mono">{text}</span> : text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
