import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

import { INWARDS_STRINGS } from '../inwards.strings'
import { SectionHeader } from './FormPrimitives'
import { InwardInfoCard } from './InwardInfoCard'
import type { InwardForm } from './useInwardForm'
import { DeliveryChallanSection } from '../DeliveryChallanSection'

/** Step 1: the locked-in-edit Inward Info card, plus the delivery-challan and
 *  notes cards (which stay editable in edit — they're documents, not header). */
export function InwardDetailsStep({ f }: { f: InwardForm }) {
  const { isEdit, editBatch, challanFiles, setChallanFiles, markDocsTouched, notes, setNotes } = f
  return (
    <>
      {/* Header (type / warehouse / source) is locked in edit. */}
      <fieldset disabled={isEdit} className="m-0 min-w-0 space-y-6 border-0 p-0">
        <InwardInfoCard f={f} />
      </fieldset>

      {/* Delivery Challan + Notes stay editable in edit (documents, not the
          locked header). Uses ONE section for both modes:
          • edit → LIVE (batchId set): uploads/deletes hit the backend now.
          • create → STAGED (stagedFiles): buffer in the form's list, upload
            after the batch is created (see useInwardForm.onCreate).
          Both modes render the same list with a View button, mirroring
          PODocumentsSection. */}
      <Card>
        <CardHeader>
          <SectionHeader
            step={2}
            title={INWARDS_STRINGS.challan.sectionTitle}
            description={INWARDS_STRINGS.detailsStep.deliveryChallanDescription}
          />
        </CardHeader>
        <CardContent>
          {isEdit && editBatch ? (
            <DeliveryChallanSection batchId={editBatch.id} onLiveChange={markDocsTouched} />
          ) : (
            <DeliveryChallanSection
              stagedFiles={challanFiles}
              onStagedChange={setChallanFiles}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionHeader
            step={3}
            title={INWARDS_STRINGS.notes.sectionTitle}
            description={INWARDS_STRINGS.detailsStep.notesDescription}
          />
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={INWARDS_STRINGS.notes.placeholder}
            rows={3}
          />
        </CardContent>
      </Card>
    </>
  )
}
