import * as React from "react"
import { Check, X, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface StepConfig {
  id: string
  label: string
  icon?: LucideIcon
  status: "completed" | "active" | "pending" | "failed"
  description?: string
}

interface WorkflowStepperProps {
  steps: StepConfig[]
  onStepClick?: (stepId: string) => void
  className?: string
}

function WorkflowStepper({ steps, onStepClick, className }: WorkflowStepperProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0 md:flex-row md:items-start md:gap-0",
        className
      )}
    >
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1

        return (
          <React.Fragment key={step.id}>
            {/* Step item */}
            <div
              className={cn(
                "flex items-start gap-3 md:flex-col md:items-center md:gap-2",
                onStepClick && "cursor-pointer"
              )}
              onClick={() => onStepClick?.(step.id)}
              role={onStepClick ? "button" : undefined}
              tabIndex={onStepClick ? 0 : undefined}
              onKeyDown={(e) => {
                if (onStepClick && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault()
                  onStepClick(step.id)
                }
              }}
            >
              {/* Circle + vertical line (mobile) */}
              <div className="flex flex-col items-center md:flex-row">
                <StepCircle step={step} />
              </div>

              {/* Label + description */}
              <div className="flex flex-col md:items-center md:text-center">
                <span
                  className={cn(
                    "text-sm font-medium",
                    step.status === "active" && "text-primary",
                    step.status === "completed" && "text-foreground",
                    step.status === "pending" && "text-muted-foreground",
                    step.status === "failed" && "text-destructive"
                  )}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="text-xs text-muted-foreground max-w-[140px]">
                    {step.description}
                  </span>
                )}
              </div>
            </div>

            {/* Connector line */}
            {!isLast && (
              <StepConnector nextStatus={steps[index + 1]!.status} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function StepCircle({ step }: { step: StepConfig }) {
  const Icon = step.icon

  const baseClasses =
    "relative flex size-8 shrink-0 items-center justify-center rounded-full transition-all"

  switch (step.status) {
    case "completed":
      return (
        <div className={cn(baseClasses, "bg-primary text-primary-foreground")}>
          {Icon ? <Icon className="size-4" /> : <Check className="size-4" />}
        </div>
      )
    case "active":
      return (
        <div
          className={cn(
            baseClasses,
            "border-2 border-primary bg-background ring-4 ring-primary/20"
          )}
        >
          {Icon ? (
            <Icon className="size-4 text-primary" />
          ) : (
            <div className="size-2.5 rounded-full bg-primary animate-pulse" />
          )}
        </div>
      )
    case "pending":
      return (
        <div
          className={cn(
            baseClasses,
            "border-2 border-muted-foreground/30 bg-muted text-muted-foreground"
          )}
        >
          {Icon && <Icon className="size-4" />}
        </div>
      )
    case "failed":
      return (
        <div className={cn(baseClasses, "bg-destructive text-white")}>
          {Icon ? <Icon className="size-4" /> : <X className="size-4" />}
        </div>
      )
  }
}

function StepConnector({
  nextStatus,
}: {
  nextStatus: StepConfig["status"]
}) {
  const lineColor = (() => {
    switch (nextStatus) {
      case "completed":
        return "bg-primary"
      case "active":
        return "bg-primary/40"
      case "failed":
        return "bg-destructive"
      case "pending":
        return "bg-muted-foreground/30"
    }
  })()

  const isDashed = nextStatus === "pending"

  return (
    <>
      {/* Horizontal connector (md+) */}
      <div className="hidden flex-1 md:flex md:items-center md:self-center md:mt-4 md:min-w-[32px]">
        <div
          className={cn(
            "h-0.5 w-full",
            isDashed ? "border-t-2 border-dashed border-muted-foreground/30 bg-transparent" : lineColor
          )}
        />
      </div>

      {/* Vertical connector (mobile) */}
      <div className="ml-[15px] flex h-6 items-center md:hidden">
        <div
          className={cn(
            "w-0.5 h-full",
            isDashed ? "border-l-2 border-dashed border-muted-foreground/30 bg-transparent" : lineColor
          )}
        />
      </div>
    </>
  )
}

export { WorkflowStepper }
export type { WorkflowStepperProps, StepConfig }
