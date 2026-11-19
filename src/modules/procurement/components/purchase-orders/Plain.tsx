/** A plain right-aligned value, struck + muted when the whole row is removed. */
export function Plain({ text, removed }: { text: string; removed: boolean }) {
  return (
    <span className={removed ? "text-muted-foreground line-through tabular-nums" : "tabular-nums"}>
      {text}
    </span>
  )
}
