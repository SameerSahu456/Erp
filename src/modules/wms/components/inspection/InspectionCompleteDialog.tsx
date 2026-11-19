import { Typography } from '@/components/ui/typography'
import { UnsavedChangesDialog } from '@/components/common/dialogs/UnsavedChangesDialog'

import { useInspectionComplete } from '../../hooks/inspection/useInspectionComplete'
import { OperationDialog } from '../shared/OperationDialog'
import { StageAssessment, type StageAssessmentStrings } from '../operations/StageAssessment'
import { StageCompleteFooter } from '../operations/StageCompleteFooter'
import { StageNotesField } from '../operations/StageNotesField'
import { StagePhotoUpload } from '../operations/StagePhotoUpload'
import { InspectionComponentsCheck } from './InspectionComponentsCheck'
import { ReturnToVendorPanel } from './ReturnToVendorPanel'
import { INSPECTION_STRINGS } from './inspection.strings'
import { DeviceReplacementNotice } from '../replacement-requests/ReplacementRequestNotice'

interface InspectionCompleteDialogProps {
  deviceId: string | null
  onClose: () => void
}

const S = INSPECTION_STRINGS.completeDialog

const ASSESSMENT_STRINGS: StageAssessmentStrings = {
  loadingChecklist: S.loadingChecklist,
  checklistLabel: S.checklistLabel,
  requiredProgress: S.requiredProgress,
  resultLabel: S.resultLabel,
  resultHelperWithChecklist: S.resultHelperNoPassFail,
  resultHelperNoChecklist: S.resultHelperNoChecklist,
  passLabel: S.passButton,
  failLabel: S.failButton,
}

/** Complete-inspection form; PO-origin units also get "Return to vendor". Keyed by deviceId. */
export function InspectionCompleteDialog({ deviceId, onClose }: InspectionCompleteDialogProps) {
  const c = useInspectionComplete(deviceId, onClose)
  const { stage, submit } = c

  return (
    <>
      <OperationDialog
        open={c.open}
        onOpenChange={(o) => {
          if (!o) c.close()
        }}
        title={S.title}
        className="sm:max-w-xl"
        isDirty={stage.dirty}
        footer={({ requestClose }) => (
          <StageCompleteFooter
            cancelLabel={S.footer.cancel}
            submitLabel={S.footer.submit}
            onCancel={requestClose}
            onSubmit={() => submit.mutate()}
            disabled={!c.ready || submit.isPending}
            pending={submit.isPending}
            blockReason={c.blockReason}
          />
        )}
      >
        <InspectionCompleteContent c={c} />
      </OperationDialog>

      {/* Return-to-vendor abandons the inspection — guard the discard (§5). */}
      <UnsavedChangesDialog
        open={c.pendingReturnUrl !== null}
        onOpenChange={(o) => {
          if (!o) c.cancelReturn()
        }}
        onConfirm={c.confirmReturn}
        title={INSPECTION_STRINGS.returnToVendor.discardTitle}
        description={INSPECTION_STRINGS.returnToVendor.discardDescription}
      />
    </>
  )
}

function InspectionCompleteContent({ c }: { c: ReturnType<typeof useInspectionComplete> }) {
  const { stage } = c
  if (stage.templateLoading) {
    return (
      <Typography variant="helper" tone="muted" asChild>
        <p className="py-6 text-center">{S.loading}</p>
      </Typography>
    )
  }
  if (!stage.op) {
    return (
      <Typography variant="helper" tone="danger" asChild>
        <p className="py-6 text-center">{S.loadError}</p>
      </Typography>
    )
  }
  return (
    <div className="min-w-0 space-y-5">
      {/* The open replacement request: what the customer reported, what to check. */}
      <DeviceReplacementNotice deviceId={c.deviceId} />
      {/* Unchecked components block completion: say so first, before the
          checklist (inward-verification D3). */}
      {c.deviceId ? <InspectionComponentsCheck deviceId={c.deviceId} /> : null}
      <StageAssessment stage={stage} strings={ASSESSMENT_STRINGS} />

      <ReturnToVendorPanel visible={c.canReturnToVendor} onReturn={c.requestReturnToVendor} />

      {/* Record block — the evidence being filed (photo, notes), set off from
          the assessment above by a hairline for a ledger-like rhythm. */}
      <div className="space-y-5 border-t border-border pt-5">
        <StagePhotoUpload
          value={stage.photoFiles}
          onChange={stage.setPhotoFiles}
          label={S.photoLabel}
          optional
        />
        <StageNotesField
          id="insp-complete-notes"
          label={S.notesLabel}
          placeholder={S.notesPlaceholder}
          value={stage.notes}
          onChange={stage.setNotes}
        />
        <Typography variant="helper" tone="muted" asChild>
          <p>{S.outcomeHelper}</p>
        </Typography>
      </div>
    </div>
  )
}
