import { Typography } from '@/components/ui/typography'

import { useQcComplete } from '../../hooks/qc/useQcComplete'
import { OperationDialog } from '../shared/OperationDialog'
import { StageAssessment, type StageAssessmentStrings } from '../operations/StageAssessment'
import { StageCompleteFooter } from '../operations/StageCompleteFooter'
import { StageNotesField } from '../operations/StageNotesField'
import { StagePhotoUpload } from '../operations/StagePhotoUpload'
import { QcGradeField } from './QcGradeField'
import { QC_STRINGS } from './qc.strings'
import { DeviceReplacementNotice } from '../replacement-requests/ReplacementRequestNotice'

interface QcCompleteDialogProps {
  /** Device whose active QC op is being completed; null = closed. The device
   *  must already have a live QC op (start it first) — this form only completes. */
  deviceId: string | null
  onClose: () => void
}

const S = QC_STRINGS.completeDialog

const ASSESSMENT_STRINGS: StageAssessmentStrings = {
  loadingChecklist: S.loadingChecklist,
  checklistLabel: S.checklistLabel,
  requiredProgress: S.requiredProgress,
  resultLabel: S.resultLabel,
  resultHelperWithChecklist: S.resultHelperNoPassFail,
  resultHelperNoChecklist: S.resultHelperNoChecklist,
  passLabel: S.passBtn,
  failLabel: S.failBtn,
}

/** Complete-QC form (checklist or Pass/Fail, grade, optional photo); a fail goes back to repair.
 *  Keyed by deviceId so it works on the QC list and device page. */
export function QcCompleteDialog({ deviceId, onClose }: QcCompleteDialogProps) {
  const c = useQcComplete(deviceId, onClose)
  const { stage } = c

  return (
    <OperationDialog
      open={c.open}
      onOpenChange={(o) => {
        if (!o) c.close()
      }}
      title={S.title}
      bodyClassName="min-w-0 space-y-4"
      isDirty={stage.dirty || c.grade !== ''}
      footer={({ requestClose }) => (
        <StageCompleteFooter
          cancelLabel={S.cancel}
          submitLabel={S.submit}
          onCancel={requestClose}
          onSubmit={() => void c.submit()}
          disabled={c.busy || c.submitting || !c.ready}
          pending={c.submitting}
          blockReason={c.blockReason}
        />
      )}
    >
      {/* The open replacement request: check the right part went in. */}
      <DeviceReplacementNotice deviceId={deviceId} />
      <StageAssessment stage={stage} strings={ASSESSMENT_STRINGS} onFail={() => c.setGrade('')} />

      {/* Grade is required only on a pass (checklist pass or explicit pass). */}
      {c.resolvedPass && <QcGradeField value={c.grade} onChange={c.setGrade} />}

      {stage.op && (
        <StagePhotoUpload
          value={stage.photoFiles}
          onChange={stage.setPhotoFiles}
          label={S.photoLabel}
          optional
        />
      )}

      <StageNotesField
        id="qc-complete-notes"
        label={S.notesLabel}
        placeholder={S.notesPlaceholder}
        value={stage.notes}
        onChange={stage.setNotes}
      />
      <Typography variant="helper" tone="muted" asChild>
        <p>{S.submitHelper}</p>
      </Typography>
    </OperationDialog>
  )
}
