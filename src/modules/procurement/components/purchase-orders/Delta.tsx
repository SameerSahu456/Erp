/** Inline "old → new" change for a right-aligned numeric / money cell: the old
 *  value struck + muted, the new value emphasised. No directional colour — a
 *  higher qty or price isn't inherently good or bad on an amendment. */
export function Delta({ from, to }: { from: string; to: string }) {
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1">
      <span className="text-muted-foreground line-through tabular-nums">{from}</span>
      <span aria-hidden className="text-muted-foreground">
        →
      </span>
      <span className="font-semibold tabular-nums">{to}</span>
    </span>
  )
}
