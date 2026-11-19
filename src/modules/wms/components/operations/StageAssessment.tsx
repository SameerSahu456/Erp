import { Check, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

import { type StageCompletion, type StageVerdict } from '../../hooks/operations/useStageCompletion'
import { ChecklistFields } from './ChecklistFields'
import { ChecklistProgress } from './ChecklistProgress'

/** Per-stage copy for the assessment block. */
export interface StageAssessmentStrings {
  loadingChecklist: string
  checklistLabel: string
  requiredProgress: (answered: number, total: number) => string
  resultLabel: string
  /** Helper under the verdict toggle when a checklist exists but can't decide. */
  resultHelperWithChecklist: string
  resultHelperNoChecklist: string
  passLabel: string
  failLabel: string
}

interface StageAssessmentProps {
  stage: StageCompletion
  strings: StageAssessmentStrings
  /** Extra work when the operator picks Fail (QC clears the grade). */
  onFail?: () => void
}

const VERDICT_TINT: Record<StageVerdict, string> = {
  pass: 'border-success/50 bg-success-soft text-success hover:bg-success-soft hover:text-success',
  fail: 'border-destructive/50 bg-destructive-soft text-destructive hover:bg-destructive-soft hover:text-destructive',
}

/** Checklist plus a Pass / Fail toggle when the checklist can't decide; shared by stage dialogs. */
export function StageAssessment({ stage, strings, onFail }: StageAssessmentProps) {
  if (stage.templateLoading) {
    return (
      <Typography variant="helper" tone="muted" asChild>
        <p>{strings.loadingChecklist}</p>
      </Typography>
    )
  }

  const pick = (v: StageVerdict) => {
    stage.setResult(v)
    if (v === 'fail') onFail?.()
  }

  return (
    <>
      {stage.hasChecklist && (
        <div className="space-y-2">
          <ChecklistProgress
            items={stage.items}
            responses={stage.responses}
            label={strings.checklistLabel}
            formatProgress={strings.requiredProgress}
          />
          <ChecklistFields
            items={stage.items}
            value={stage.responses}
            onChange={stage.setResponses}
            opId={stage.op?.id}
          />
        </div>
      )}
      {!stage.checklistVerdict && (
        <div className="space-y-2">
          <Typography variant="badge" tone="muted" asChild>
            <span>
              {strings.resultLabel} <span className="text-destructive">*</span>
            </span>
          </Typography>
          <Typography variant="helper" tone="muted" asChild>
            <p>
              {stage.hasChecklist ? strings.resultHelperWithChecklist : strings.resultHelperNoChecklist}
            </p>
          </Typography>
          {/* Symmetric pass/fail: the selected side carries the status tint
              (green pass / red fail) so the chosen outcome — and where the
              device routes — reads at a glance. Icon + label keep it legible
              without relying on colour (§14 a11y). */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              aria-pressed={stage.result === 'pass'}
              className={cn('justify-center', stage.result === 'pass' && VERDICT_TINT.pass)}
              onClick={() => pick('pass')}
            >
              <Check className="size-4" data-icon="inline-start" />
              {strings.passLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-pressed={stage.result === 'fail'}
              className={cn('justify-center', stage.result === 'fail' && VERDICT_TINT.fail)}
              onClick={() => pick('fail')}
            >
              <X className="size-4" data-icon="inline-start" />
              {strings.failLabel}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
