import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Typography } from "@/components/ui/typography";

/** A labelled field in an SO action dialog. The label text sits in its own
 *  shrinkable, anywhere-breaking box (§8.7): an imported line name is one long
 *  unbroken run. Clamped to two lines; the full value is on hover. */
export function ActionField({
  label,
  htmlFor,
  help,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  help?: string;
  /** Shows the red asterisk; the dialog itself blocks submit while empty. */
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={htmlFor} className="min-w-0" required={required}>
        <Tooltip>
          <TooltipTrigger render={<span className="line-clamp-2 min-w-0 [overflow-wrap:anywhere]" />}>
            {label}
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      </Label>
      {children}
      {help ? (
        <Typography variant="helper" tone="muted">
          {help}
        </Typography>
      ) : null}
    </div>
  );
}
