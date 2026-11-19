export function AccountEmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-secondary/30 px-6 py-10 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}
