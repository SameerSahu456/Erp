import type React from "react"

export function SoSectionHeader({
  icon,
  tint,
  title,
  subtitle,
}: {
  icon: React.ReactNode
  tint: string
  title: string
  subtitle: string
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tint}`}>
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="text-base font-semibold leading-tight tracking-tight">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}
