import { Typography } from "@/components/ui/typography"

export function DetailField({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  const empty =
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  return (
    <div className="space-y-1">
      <dt className="flex items-center gap-1.5">
        <Icon className="size-3.5 text-muted-foreground" />
        <Typography variant="caption" tone="muted" className="uppercase tracking-[0.06em]" asChild>
          <span>{label}</span>
        </Typography>
      </dt>
      <Typography variant="body" asChild>
        <dd className={mono ? "font-mono" : undefined}>
          {empty ? <span className="text-muted-foreground">—</span> : value}
        </dd>
      </Typography>
    </div>
  )
}
