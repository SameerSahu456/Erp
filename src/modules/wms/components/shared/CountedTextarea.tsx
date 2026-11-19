import type { ComponentProps } from "react";

import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

/** A textarea with a live "x/limit" count that stops at the limit (§9). */
export function CountedTextarea({
  limit,
  value,
  className,
  ...props
}: Omit<ComponentProps<typeof Textarea>, "value" | "maxLength"> & {
  limit: number;
  value: string;
}) {
  return (
    <div className="relative">
      <Textarea {...props} maxLength={limit} className={cn("pr-20", className)} />
      <Typography variant="caption" tone="muted" numeric asChild>
        <span className="pointer-events-none absolute top-2.5 right-3">{`${value.length}/${limit}`}</span>
      </Typography>
    </div>
  );
}
