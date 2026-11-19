import { Check } from "lucide-react";

import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import { STEP_LABELS } from "./dispatch-create-helpers";

/** The two-segment wizard step bar (mirrors InwardStepTabs). */
export function StepTabs({
  step,
  setStep,
  step2Enabled,
}: {
  step: 0 | 1;
  setStep: (s: 0 | 1) => void;
  step2Enabled: boolean;
}) {
  return (
    <div className="grid w-full grid-cols-2 gap-1 rounded-lg border border-border bg-muted/40 p-1">
      {STEP_LABELS.map((label, i) => {
        const active = i === step;
        const done = i < step;
        const ok = i === 0 || step2Enabled;
        return (
          <button
            key={label}
            type="button"
            disabled={!ok}
            onClick={() => ok && setStep(i as 0 | 1)}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 transition-colors",
              active
                ? "bg-card text-foreground shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.06)]"
                : "text-muted-foreground hover:text-foreground",
              !ok &&
                "cursor-not-allowed opacity-50 hover:text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full",
                active
                  ? "bg-primary text-primary-foreground"
                  : done
                    ? "bg-primary/15 text-primary"
                    : "bg-muted-foreground/15 text-muted-foreground",
              )}
            >
              {done ? (
                <Check className="size-3" />
              ) : (
                <Typography variant="badge" tone="inherit" asChild>
                  <span>{i + 1}</span>
                </Typography>
              )}
            </span>
            <Typography variant="body-strong" truncate className="min-w-0">
              {label}
            </Typography>
          </button>
        );
      })}
    </div>
  );
}
