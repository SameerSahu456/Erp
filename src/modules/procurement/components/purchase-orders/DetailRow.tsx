import { Typography } from "@/components/ui/typography"
import { TruncatedText } from "@/components/common/display/TruncatedText"

export function DetailRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    // Label on top (small, muted), value below — the stacked detail field layout
    // (§2), never label-left.
    <div className="flex flex-col gap-0.5 py-2">
      <Typography variant="helper" tone="muted">
        {label}
      </Typography>
      {/* The value truncates instead of running off the card edge (Delivery Terms
          is free text); the full value shows on hover. */}
      <Typography
        variant={strong ? "body-strong" : "body"}
        numeric
        truncate
        asChild
        className="min-w-0"
      >
        <TruncatedText value={value} className="max-w-full" />
      </Typography>
    </div>
  )
}
