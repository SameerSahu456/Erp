import { Typography } from '@/components/ui/typography'

import { useRepairComplete } from '../../hooks/repair/useRepairComplete'
import { OperationDialog } from '../shared/OperationDialog'
import { StageAssessment, type StageAssessmentStrings } from '../operations/StageAssessment'
import { StageCompleteFooter } from '../operations/StageCompleteFooter'
import { StageNotesField } from '../operations/StageNotesField'
import { StagePhotoUpload } from '../operations/StagePhotoUpload'
import { REPAIR_STRINGS } from './repair.strings'
import { DeviceReplacementNotice } from '../replacement-requests/ReplacementRequestNotice'

interface RepairCompleteDialogProps {
  /** Device whose active repair is being completed; null = closed. */
  deviceId: string | null
  onClose: () => void
}

const S = REPAIR_STRINGS.completeDialog

const ASSESSMENT_STRINGS: StageAssessmentStrings = {
  loadingChecklist: S.loadingChecklist,
  checklistLabel: S.checklistLabel,
  requiredProgress: S.requiredProgress,
  resultLabel: S.resultLabel,
  resultHelperWithChecklist: S.resultHelperWithChecklist,
  resultHelperNoChecklist: S.resultHelperNoChecklist,
  passLabel: S.passLabel,
  failLabel: S.failLabel,
}

/** Complete-repair form: checklist or Pass/Fail. Pass → QC, fail → repair. Keyed by deviceId. */
export function RepairCompleteDialog({ deviceId, onClose }: RepairCompleteDialogProps) {
  const c = useRepairComplete(deviceId, onClose)
  const { stage, submit } = c

  return (
    <OperationDialog
      open={c.open}
      onOpenChange={(o) => {
        if (!o) c.close()
      }}
      title={S.title}
      bodyClassName="min-w-0 space-y-4"
      isDirty={stage.dirty}
      footer={({ requestClose }) => (
        <StageCompleteFooter
          cancelLabel={S.cancel}
          submitLabel={S.submit}
          onCancel={requestClose}
          onSubmit={() => submit.mutate()}
          disabled={!c.ready || submit.isPending}
          pending={submit.isPending}
          blockReason={c.blockReason}
        />
      )}
    >
      {/* Pending-request notices — a red count only, no per-row list. The
          operator fulfils / receives / cancels these from the device's Spares
          and Vendor sections; a pass stays blocked until then. */}
      {(c.openSpareCount > 0 || c.openVendorCount > 0) && (
        <div className="space-y-1 rounded-lg border border-destructive/30 bg-destructive-soft/40 p-3">
          {c.openSpareCount > 0 && (
            <Typography variant="helper" tone="danger" asChild>
              <p>{S.spareBlock(c.openSpareCount)}</p>
            </Typography>
          )}
          {c.openVendorCount > 0 && (
            <Typography variant="helper" tone="danger" asChild>
              <p>{S.vendorBlock(c.openVendorCount)}</p>
            </Typography>
          )}
        </div>
      )}

      {/* The open replacement request: which part to swap or repair. */}
      <DeviceReplacementNotice deviceId={deviceId} />

      <StageAssessment stage={stage} strings={ASSESSMENT_STRINGS} />

      <StagePhotoUpload
        value={stage.photoFiles}
        onChange={stage.setPhotoFiles}
        label={S.photoLabel}
        optional
      />

      <StageNotesField
        id="repair-complete-notes"
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
