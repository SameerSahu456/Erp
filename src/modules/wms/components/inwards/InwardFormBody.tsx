import { PageHeader } from '@/components/page-shells'
import { UnsavedChangesDialog } from '@/components/common/dialogs/UnsavedChangesDialog'

import { type GrnBatchResponse } from '../../api'
import { STEPS } from './inward-form/config'
import { useInwardForm } from './inward-form/useInwardForm'
import { InwardStepTabs } from './inward-form/InwardStepTabs'
import { InwardDetailsStep } from './inward-form/InwardDetailsStep'
import { InwardLineStep } from './inward-form/InwardLineStep'
import { InwardFormFooter } from './inward-form/InwardFormFooter'
import { INWARDS_STRINGS } from './inwards.strings'

const { pageHeader: PH } = INWARDS_STRINGS

/** Two-step inward-batch wizard (Inward Details → Line Items). All state, derived
 *  values and submit handlers live in `useInwardForm`; this composes the steps. */
export function InwardFormBody({ editBatch }: { editBatch?: GrnBatchResponse } = {}) {
  const f = useInwardForm({ editBatch })
  return (
    // Mirror FormPageShell: a viewport-height flex column with a flex-1 body, so
    // the sticky footer is PINNED to the bottom on a short form (e.g. an empty
    // batch) instead of floating mid-page — not only sticky on a long one
    // (PAGE-UI §3).
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col gap-6 lg:min-h-[calc(100dvh-7rem)]">
      <PageHeader
        title={
          f.isEdit
            ? PH.editTitle(editBatch?.grn_number ?? PH.inwardBatchFallback)
            : PH.title
        }
        subtitle={
          f.isEdit
            ? PH.editSubtitle
            : PH.createSubtitle(
                f.step + 1,
                STEPS.length,
                f.step === 0 ? PH.stepDetailsLabel : PH.stepLineItemsLabel,
              )
        }
        backHref={f.backHref}
      />

      <div className="flex flex-1 flex-col gap-6">
        <InwardStepTabs f={f} />

        {f.step === 0 && <InwardDetailsStep f={f} />}
        {f.step === 1 && <InwardLineStep f={f} />}
      </div>

      <InwardFormFooter f={f} />

      <UnsavedChangesDialog
        open={f.guard.dialogOpen}
        onOpenChange={f.guard.onDialogOpenChange}
        onConfirm={f.guard.onConfirmDiscard}
      />
    </div>
  )
}
