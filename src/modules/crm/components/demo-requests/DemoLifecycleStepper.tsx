import { CheckCircle2, XCircle } from "lucide-react"

import { Typography } from "@/components/ui/typography"

import { DEMO_REQUESTS_STRINGS as S } from "./demo-requests.strings"
import { DEMO_WORKFLOW_STAGES } from "./demoRequestDetailHelpers"

export function DemoLifecycleStepper({
  activeStage,
  isRejected,
  isOverdue,
}: {
  activeStage: number
  isRejected: boolean
  isOverdue: boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <Typography
        variant="card-title"
        tone="muted"
        className="mb-4 uppercase tracking-wider"
      >
        {S.detail.lifecycleTitle}
      </Typography>
      <div className="flex items-center gap-0">
        {DEMO_WORKFLOW_STAGES.map((stage, idx) => {
          const isCompleted = idx < activeStage
          const isActive = idx === activeStage
          const isFailed = isActive && (isRejected || isOverdue)
          return (
            <div key={stage.id} className="flex flex-1 items-center">
              <div className="flex flex-1 flex-col items-center gap-1.5">
                <Typography variant="helper" tone="inherit" asChild>
                  <div
                    className={`flex size-8 items-center justify-center rounded-full font-semibold transition-colors ${
                      isFailed
                        ? "bg-destructive-soft text-destructive ring-2 ring-destructive"
                        : isCompleted
                          ? "bg-success-soft text-success"
                          : isActive
                            ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isFailed ? (
                      <XCircle className="size-4" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                </Typography>
                <Typography
                  variant="helper"
                  tone={isActive ? "default" : "muted"}
                  align="center"
                  className={isActive ? "font-semibold" : undefined}
                >
                  {stage.label}
                </Typography>
              </div>
              {idx < DEMO_WORKFLOW_STAGES.length - 1 && (
                <div className={`h-0.5 w-full min-w-4 ${idx < activeStage ? "bg-success" : "bg-muted"}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
