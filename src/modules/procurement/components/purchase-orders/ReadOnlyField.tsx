import { Typography } from "@/components/ui/typography"

/** A read-only context field for the locked Warehouse / Vendor — a muted label
 *  over the value as plain text (no input box, since nothing here is editable). */
export function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <Typography variant="helper" tone="muted">
        {label}
      </Typography>
      <Typography variant="body-strong" truncate>
        {value}
      </Typography>
    </div>
  )
}
