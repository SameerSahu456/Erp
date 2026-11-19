interface AccountInfoRowProps {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}

export function AccountInfoRow({ icon: Icon, label, children }: AccountInfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-0.5 text-[13.5px] text-foreground">{children}</dd>
      </div>
    </div>
  )
}
