import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import type { MaterialInquiryFormController } from "../../hooks/material-inquiries/useMaterialInquiryForm"
import { MIFormHeaderFields } from "./MIFormHeaderFields"
import { MIItemsTable } from "./MIItemsTable"
import { MATERIAL_INQUIRIES_STRINGS as S } from "./material-inquiries.strings"

export function MIFormBody({ form }: { form: MaterialInquiryFormController }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {form.isEdit ? S.form.cardTitleEdit : S.form.cardTitleNew}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <MIFormHeaderFields form={form} />
        <MIItemsTable form={form} />

        {/* Internal Notes */}
        <div className="space-y-1.5 pt-2">
          <Label className="font-ui">{S.form.notesLabel}</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => form.setNotes(e.target.value)}
            placeholder={S.form.notesPlaceholder}
            rows={4}
            disabled={!form.canEditHeader}
          />
        </div>
      </CardContent>
    </Card>
  )
}
