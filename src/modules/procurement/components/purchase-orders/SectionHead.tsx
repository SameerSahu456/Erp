import { Building2 } from "lucide-react"

import { Typography } from "@/components/ui/typography"

/** Card section header — icon chip + title, matching the reference. */
export function SectionHead({ icon: Icon, title }: { icon: typeof Building2; title: string }) {
  return (
    <div className="flex items-center gap-3 px-[18px] py-3.5">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <Typography variant="card-title">{title}</Typography>
    </div>
  )
}
