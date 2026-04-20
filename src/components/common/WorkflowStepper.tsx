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
    <>
      {/* ── Desktop: horizontal stepper ── */}
      <div className={cn("hidden md:block", className)}>
        {/* Top row: circles + connectors */}
        <div className="flex items-center">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1
            return (
              <React.Fragment key={step.id}>
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-center",
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
                  <StepCircle step={step} />
                </div>
                {!isLast && (
                  <div className="flex-1 min-w-[28px]">
                    <div
                      className={cn(
                        "h-0.5 w-full rounded-full",
                        steps[index + 1]!.status === "pending"
                          ? "border-t-2 border-dashed border-border bg-transparent"
                          : steps[index + 1]!.status === "completed"
                            ? "bg-primary"
                            : steps[index + 1]!.status === "active"
                              ? "bg-primary/40"
                              : "bg-destructive"
                      )}
                    />
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
        {/* Bottom row: labels aligned under each circle */}
        <div className="flex mt-3">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1
            return (
              <React.Fragment key={step.id}>
                <div className="flex shrink-0 flex-col items-center" style={{ width: 36 }}>
                  <span
                    className={cn(
                      "text-xs font-medium whitespace-nowrap",
                      step.status === "active" && "text-primary font-semibold",
                      step.status === "completed" && "text-foreground",
                      step.status === "pending" && "text-muted-foreground",
                      step.status === "failed" && "text-destructive"
                    )}
                  >
                    {step.label}
                  </span>
                  {step.description && (
                    <span className="text-[11px] text-muted-foreground/80 whitespace-nowrap mt-0.5">
                      {step.description}
                    </span>
                  )}
                </div>
                {!isLast && <div className="flex-1 min-w-[28px]" />}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* ── Mobile: vertical stepper ── */}
      <div className={cn("flex flex-col gap-0 md:hidden", className)}>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1
          return (
            <React.Fragment key={step.id}>
              <div
                className={cn(
                  "flex items-start gap-3",
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
                <StepCircle step={step} />
                <div className="flex flex-col pt-1">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      step.status === "active" && "text-primary font-semibold",
                      step.status === "completed" && "text-foreground",
                      step.status === "pending" && "text-muted-foreground",
                      step.status === "failed" && "text-destructive"
                    )}
                  >
                    {step.label}
                  </span>
                  {step.description && (
                    <span className="text-xs text-muted-foreground/80 mt-0.5">
                      {step.description}
                    </span>
                  )}
                </div>
              </div>
              {!isLast && (
                <div className="ml-[15px] flex h-6 items-center">
                  <div
                    className={cn(
                      "w-0.5 h-full rounded-full",
                      steps[index + 1]!.status === "pending"
                        ? "border-l-2 border-dashed border-border bg-transparent"
                        : steps[index + 1]!.status === "completed"
                          ? "bg-primary"
                          : steps[index + 1]!.status === "active"
                            ? "bg-primary/40"
                            : "bg-destructive"
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </>
  )
}

function StepCircle({ step }: { step: StepConfig }) {
  const Icon = step.icon

  const baseClasses =
    "relative flex size-8 shrink-0 items-center justify-center rounded-full transition-all"

  switch (step.status) {
    case "completed":
      return (
        <div className={cn(baseClasses, "bg-primary text-primary-foreground shadow-sm")}>
          {Icon ? <Icon className="size-4" /> : <Check className="size-4" />}
        </div>
      )
    case "active":
      return (
        <div
          className={cn(
            baseClasses,
            "border-2 border-primary bg-card ring-4 ring-primary/15"
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
            "border-2 border-border bg-secondary text-muted-foreground"
          )}
        >
          {Icon && <Icon className="size-4" />}
        </div>
      )
    case "failed":
      return (
        <div className={cn(baseClasses, "bg-destructive text-white shadow-sm")}>
          {Icon ? <Icon className="size-4" /> : <X className="size-4" />}
        </div>
      )
  }
}


export { WorkflowStepper }
export type { WorkflowStepperProps, StepConfig }
