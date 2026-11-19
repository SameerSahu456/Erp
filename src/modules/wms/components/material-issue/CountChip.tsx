import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

// A dot-badge count chip shown against a column header (available units to add /
// units of the picked part fitted on the build).
export function CountChip({ n, tone }: { n: number; tone: "success" | "danger" }) {
  return (
    <Typography
      variant="helper"
      tone="inherit"
      className={cn(
        "inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 font-semibold tabular-nums",
        tone === "success"
          ? "bg-success/12 text-success"
          : "bg-destructive/12 text-destructive",
      )}
      asChild
    >
      <span>{n}</span>
    </Typography>
  );
}
