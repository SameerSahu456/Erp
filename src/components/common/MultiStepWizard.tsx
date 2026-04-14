import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface WizardStepProps {
  onNext: () => void
  onPrev: () => void
  isFirst: boolean
  isLast: boolean
}

interface WizardStepConfig {
  id: string
  label: string
  component: React.ComponentType<WizardStepProps>
  validate?: () => boolean
  optional?: boolean
}

interface MultiStepWizardProps {
  steps: WizardStepConfig[]
  onComplete: () => void
  className?: string
}

function MultiStepWizard({
  steps,
  onComplete,
  className,
}: MultiStepWizardProps) {
  const [currentStep, setCurrentStep] = React.useState(0)

  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1
  const activeStep = steps[currentStep] as WizardStepConfig

  const handleNext = React.useCallback(() => {
    if (activeStep.validate && !activeStep.validate()) {
      return
    }
    if (isLast) {
      onComplete()
    } else {
      setCurrentStep((s) => s + 1)
    }
  }, [activeStep, isLast, onComplete])

  const handlePrev = React.useCallback(() => {
    if (!isFirst) {
      setCurrentStep((s) => s - 1)
    }
  }, [isFirst])

  const handleSkip = React.useCallback(() => {
    if (activeStep.optional && !isLast) {
      setCurrentStep((s) => s + 1)
    }
  }, [activeStep, isLast])

  const StepComponent = activeStep.component

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Progress bar */}
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isActive = index === currentStep
          const isPending = index > currentStep

          return (
            <React.Fragment key={step.id}>
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all",
                    isCompleted &&
                      "bg-primary text-primary-foreground",
                    isActive &&
                      "border-2 border-primary bg-primary/10 text-primary",
                    isPending &&
                      "border-2 border-muted-foreground/30 bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium whitespace-nowrap",
                    isActive && "text-primary",
                    isCompleted && "text-foreground",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="mx-2 mt-[-18px] flex flex-1 items-center">
                  <div
                    className={cn(
                      "h-0.5 w-full transition-colors",
                      index < currentStep
                        ? "bg-primary"
                        : "bg-muted-foreground/30"
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Step content */}
      <div className="min-h-[200px]">
        <StepComponent
          onNext={handleNext}
          onPrev={handlePrev}
          isFirst={isFirst}
          isLast={isLast}
        />
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={isFirst}
        >
          Previous
        </Button>

        <div className="flex gap-2">
          {activeStep.optional && !isLast && (
            <Button variant="ghost" onClick={handleSkip}>
              Skip
            </Button>
          )}
          <Button onClick={handleNext}>
            {isLast ? "Complete" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export { MultiStepWizard }
export type { MultiStepWizardProps, WizardStepConfig, WizardStepProps }
