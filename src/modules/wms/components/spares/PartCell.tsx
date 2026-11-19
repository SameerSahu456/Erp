import { Typography } from '@/components/ui/typography'

/** Part identity cell: friendly name on top, real SKU code in mono underneath.
 *  The SKU line is dropped when it would just echo the name (seed data does this). */
export function PartCell({ name, sku }: { name: string; sku?: string }) {
  const showSku = !!sku && sku !== name
  return (
    <div className="flex min-w-0 flex-col">
      <Typography variant="body" truncate asChild>
        <span className="font-medium">{name}</span>
      </Typography>
      {showSku && (
        <Typography variant="helper" tone="muted" truncate asChild>
          <span className="font-mono">{sku}</span>
        </Typography>
      )}
    </div>
  )
}
