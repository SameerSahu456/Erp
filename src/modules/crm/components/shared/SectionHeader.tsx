interface SectionHeaderProps {
  icon: React.ElementType
  label: string
  accent?: "primary" | "emerald" | "violet"
}

// Form section header (icon chip + uppercase label) shared by the CRM create/
// edit forms. Promoted here once leads + contacts (and more) needed it.
export function SectionHeader({ icon: Icon, label, accent = "primary" }: SectionHeaderProps) {
  const tone =
    accent === "emerald"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : accent === "violet"
        ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
        : "bg-primary/10 text-primary"

  return (
    <div className="flex items-center gap-2 border-b border-border/70 pb-3">
      <span
        className={`inline-flex size-7 shrink-0 items-center justify-center rounded-lg ${tone}`}
      >
        <Icon className="size-3.5" strokeWidth={2} />
      </span>
      <h3 className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-foreground">
        {label}
      </h3>
    </div>
  )
}
