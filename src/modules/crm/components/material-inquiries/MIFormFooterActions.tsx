import { Button } from "@/components/ui/button"

import { MATERIAL_INQUIRIES_STRINGS as S } from "./material-inquiries.strings"

interface MIFormFooterActionsProps {
  isPending: boolean
  canSave: boolean
  onCancel: () => void
  onSaveDraft: () => void
  onSubmit: () => void
}

// Create-mode footer for the Material Inquiry form: Cancel / Save as Draft /
// Submit to Procurement.
export function MIFormFooterActions({
  isPending,
  canSave,
  onCancel,
  onSaveDraft,
  onSubmit,
}: MIFormFooterActionsProps) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-9"
        disabled={isPending}
        onClick={onCancel}
      >
        {S.form.cancel}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-9"
        disabled={!canSave}
        onClick={onSaveDraft}
      >
        {S.form.saveDraft}
      </Button>
      <Button
        type="button"
        className="h-9 min-w-[120px]"
        disabled={!canSave}
        onClick={onSubmit}
      >
        {S.form.submitToProcurement}
      </Button>
    </>
  )
}
