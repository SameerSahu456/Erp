import * as React from "react"
import { Check, X, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type StepAccent =
  | "primary"
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "violet"
  | "teal"

interface StepConfig {
  id: string
  label: string
  icon?: LucideIcon
  status: "completed" | "active" | "pending" | "failed"
  description?: string
  accent?: StepAccent
}

interface WorkflowStepperProps {
  steps: StepConfig[]
  onStepClick?: (stepId: string) => void
  className?: string
}

// ── Premium accent palette ────────────────────────────────────────────────
// Each palette entry returns a coordinated gradient + glow + ring + label.

const ACCENT_COMPLETED: Record<StepAccent, string> = {
  primary: "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-white shadow-md shadow-slate-900/35 ring-1 ring-white/10",
  success: "bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/45 ring-1 ring-white/15",
  info:    "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/45 ring-1 ring-white/15",
  warning: "bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/50 ring-1 ring-white/15",
  danger:  "bg-gradient-to-br from-rose-400 via-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/45 ring-1 ring-white/15",
  violet:  "bg-gradient-to-br from-violet-400 via-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/45 ring-1 ring-white/15",
  teal:    "bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/45 ring-1 ring-white/15",
}

const ACCENT_ACTIVE: Record<StepAccent, string> = {
  primary: "border-slate-700 ring-slate-900/20 text-slate-900 dark:text-white shadow-lg shadow-slate-900/40",
  success: "border-emerald-500 ring-emerald-500/30 text-emerald-600 shadow-lg shadow-emerald-500/45",
  info:    "border-sky-500 ring-sky-500/30 text-sky-600 shadow-lg shadow-sky-500/45",
  warning: "border-amber-500 ring-amber-500/30 text-amber-600 shadow-lg shadow-amber-500/45",
  danger:  "border-rose-500 ring-rose-500/30 text-rose-600 shadow-lg shadow-rose-500/45",
  violet:  "border-violet-500 ring-violet-500/30 text-violet-600 shadow-lg shadow-violet-500/45",
  teal:    "border-teal-500 ring-teal-500/30 text-teal-600 shadow-lg shadow-teal-500/45",
}

const ACCENT_HALO: Record<StepAccent, string> = {
  primary: "bg-slate-900/30",
  success: "bg-emerald-500/40",
  info:    "bg-sky-500/40",
  warning: "bg-amber-500/40",
  danger:  "bg-rose-500/40",
  violet:  "bg-violet-500/40",
  teal:    "bg-teal-500/40",
}

const ACCENT_DOT: Record<StepAccent, string> = {
  primary: "bg-slate-800",
  success: "bg-emerald-500",
  info:    "bg-sky-500",
  warning: "bg-amber-500",
  danger:  "bg-rose-500",
  violet:  "bg-violet-500",
  teal:    "bg-teal-500",
}

const ACCENT_CONNECTOR_GRADIENT: Record<StepAccent, string> = {
  primary: "bg-gradient-to-r from-slate-600 to-slate-800",
  success: "bg-gradient-to-r from-emerald-400 to-emerald-600",
  info:    "bg-gradient-to-r from-sky-400 to-blue-600",
  warning: "bg-gradient-to-r from-amber-300 to-orange-500",
  danger:  "bg-gradient-to-r from-rose-400 to-rose-600",
  violet:  "bg-gradient-to-r from-violet-400 to-purple-600",
  teal:    "bg-gradient-to-r from-teal-400 to-cyan-600",
}

const ACCENT_LABEL: Record<StepAccent, string> = {
  primary: "text-slate-900 dark:text-slate-100",
  success: "text-emerald-700 dark:text-emerald-400",
  info:    "text-sky-700 dark:text-sky-400",
  warning: "text-amber-700 dark:text-amber-400",
  danger:  "text-rose-700 dark:text-rose-400",
  violet:  "text-violet-700 dark:text-violet-400",
  teal:    "text-teal-700 dark:text-teal-400",
}

const ACCENT_PENDING_BORDER: Record<StepAccent, string> = {
  primary: "border-slate-400/30",
  success: "border-emerald-500/30",
  info:    "border-sky-500/30",
  warning: "border-amber-500/35",
  danger:  "border-rose-500/30",
  violet:  "border-violet-500/30",
  teal:    "border-teal-500/30",
}

// Connector style: gradient & solid for completed/active, dashed for pending.
function connectorClass(nextStep: StepConfig): string {
  const accent = nextStep.accent ?? "primary"
  switch (nextStep.status) {
    case "completed":
      return cn(ACCENT_CONNECTOR_GRADIENT[accent], "shadow-sm")
    case "active":
      return cn(ACCENT_CONNECTOR_GRADIENT[accent], "opacity-50")
    case "failed":
      return "bg-gradient-to-r from-rose-400 to-rose-600"
    case "pending":
    default:
      return "border-t-2 border-dashed border-border bg-transparent"
  }
}

function WorkflowStepper({ steps, onStepClick, className }: WorkflowStepperProps) {
  const gridCols = { gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }

  return (
    <>
      {/* ── Desktop: horizontal stepper (one grid column per stage — labels never overlap) ── */}
      <div className={cn("hidden md:block", className)}>
        {/* Top row: circles with connectors drawn within each column */}
        <div className="grid items-center" style={gridCols}>
          {steps.map((step, index) => {
            const isFirst = index === 0
            const isLast = index === steps.length - 1
            const next = steps[index + 1]
            return (
              <div
                key={step.id}
                className="relative flex items-center justify-center"
              >
                {/* Left half-connector — owned by this step (matches its status) */}
                {!isFirst && (
                  <div
                    className={cn(
                      "absolute left-0 right-1/2 top-1/2 mr-5 -translate-y-1/2 h-[3px] rounded-full",
                      connectorClass(step)
                    )}
                  />
                )}
                {/* Right half-connector — owned by the next step */}
                {!isLast && next && (
                  <div
                    className={cn(
                      "absolute left-1/2 right-0 top-1/2 ml-5 -translate-y-1/2 h-[3px] rounded-full",
                      connectorClass(next)
                    )}
                  />
                )}
                <div
                  className={cn(
                    "relative z-10 flex items-center justify-center transition-transform duration-300",
                    onStepClick && "cursor-pointer hover:scale-110"
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
              </div>
            )
          })}
        </div>
        {/* Bottom row: labels — full column width, wrap freely, never collide */}
        <div className="grid mt-3.5" style={gridCols}>
          {steps.map((step) => {
            const accent = step.accent ?? "primary"
            return (
              <div
                key={step.id}
                className="flex flex-col items-center px-1.5 text-center"
              >
                <span
                  className={cn(
                    "text-xs font-medium leading-tight tracking-tight break-words transition-colors",
                    step.status === "active" && cn("font-semibold", ACCENT_LABEL[accent]),
                    step.status === "completed" && "text-foreground",
                    step.status === "pending" && "text-muted-foreground",
                    step.status === "failed" && "text-destructive"
                  )}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="text-[11px] text-muted-foreground/80 mt-0.5 leading-tight">
                    {step.description}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Mobile: vertical stepper ── */}
      <div className={cn("flex flex-col gap-0 md:hidden", className)}>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1
          const next = steps[index + 1]
          const accent = step.accent ?? "primary"
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
                      step.status === "active" && cn("font-semibold", ACCENT_LABEL[accent]),
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
              {!isLast && next && (
                <div className="ml-[15px] flex h-6 items-center">
                  <div
                    className={cn(
                      "w-[3px] h-full rounded-full",
                      next.status === "completed"
                        ? ACCENT_CONNECTOR_GRADIENT[next.accent ?? "primary"]
                        : next.status === "active"
                          ? cn(ACCENT_CONNECTOR_GRADIENT[next.accent ?? "primary"], "opacity-50")
                          : next.status === "failed"
                            ? "bg-gradient-to-b from-rose-400 to-rose-600"
                            : "border-l-2 border-dashed border-border bg-transparent"
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
  const accent: StepAccent = step.accent ?? "primary"

  const baseClasses =
    "relative flex size-9 shrink-0 items-center justify-center rounded-full transition-all duration-300"

  switch (step.status) {
    case "completed":
      return (
        <div className={cn(baseClasses, ACCENT_COMPLETED[accent])}>
          {Icon ? <Icon className="size-[18px]" strokeWidth={2.25} /> : <Check className="size-[18px]" strokeWidth={2.5} />}
        </div>
      )
    case "active":
      return (
        <span className="relative inline-flex">
          {/* Pulsing halo — premium "you are here" beacon */}
          <span
            className={cn(
              "absolute inset-0 -m-1 rounded-full opacity-60 animate-ping",
              ACCENT_HALO[accent]
            )}
            aria-hidden
          />
          <span
            className={cn(
              "absolute inset-0 -m-0.5 rounded-full opacity-25 blur-sm",
              ACCENT_HALO[accent]
            )}
            aria-hidden
          />
          <div
            className={cn(
              baseClasses,
              "border-2 bg-card ring-4 z-10",
              ACCENT_ACTIVE[accent]
            )}
          >
            {Icon ? (
              <Icon className="size-[18px]" strokeWidth={2.25} />
            ) : (
              <div className={cn("size-2.5 rounded-full animate-pulse", ACCENT_DOT[accent])} />
            )}
          </div>
        </span>
      )
    case "pending":
      return (
        <div
          className={cn(
            baseClasses,
            "border-2 bg-secondary/60 backdrop-blur-sm text-muted-foreground/70",
            ACCENT_PENDING_BORDER[accent]
          )}
        >
          {Icon && <Icon className="size-[18px]" strokeWidth={2} />}
        </div>
      )
    case "failed":
      return (
        <div className={cn(
          baseClasses,
          "bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-md shadow-rose-500/45 ring-1 ring-white/15"
        )}>
          {Icon ? <Icon className="size-[18px]" strokeWidth={2.25} /> : <X className="size-[18px]" strokeWidth={2.5} />}
        </div>
      )
  }
}


export { WorkflowStepper }
export type { WorkflowStepperProps, StepConfig, StepAccent }
