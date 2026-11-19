import type { ReactNode } from "react";

import { Typography } from "@/components/ui/typography";
import { EMPTY_VALUE } from "@/shared/constants";

/** One labelled value in a facts grid; empty values show `EMPTY_VALUE`. */
export function Fact({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <Typography variant="caption" tone="muted">
        {label}
      </Typography>
      <Typography variant="body-strong" className="min-w-0 break-words">
        {value || EMPTY_VALUE}
      </Typography>
      {hint ? (
        <Typography variant="helper" tone="muted">
          {hint}
        </Typography>
      ) : null}
    </div>
  );
}
