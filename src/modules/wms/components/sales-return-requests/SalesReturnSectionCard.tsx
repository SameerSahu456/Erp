import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/** Titled card with icon, description and an optional right-side `action`. */
export function ReturnSectionCard({
  icon: Icon,
  title,
  description,
  action,
  contentClassName = "space-y-4",
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  contentClassName?: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader
        className={
          action ? "flex flex-row items-start justify-between gap-2 space-y-0" : undefined
        }
      >
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <Icon className="size-4 text-primary" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {action}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  )
}
