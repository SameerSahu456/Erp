import { Check, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Typography } from '@/components/ui/typography'
import type { ChecklistItem } from '../../api'
import { ChecklistInput } from './ChecklistInput'
import { StagePhotoUpload } from './StagePhotoUpload'
import {
  type ChecklistAnswer,
  type ChecklistResponses,
  isCanonicalPassFailNa,
} from './checklistResponses'
import { CHECKLIST_FIELDS_STRINGS } from './checklist-fields.strings'

// `activeVariant` is the button look once picked (a Fail reads destructive);
// every unpicked option stays outline.
const PF_OPTIONS = [
  { value: 'pass', label: CHECKLIST_FIELDS_STRINGS.passFailNa.pass, icon: Check, activeVariant: 'default' },
  { value: 'fail', label: CHECKLIST_FIELDS_STRINGS.passFailNa.fail, icon: X, activeVariant: 'destructive' },
] as const
const PF_INACTIVE_VARIANT = 'outline' as const
const FAIL_NOTE_MAX = 500

interface ChecklistFieldsProps {
  items: ChecklistItem[]
  value: ChecklistResponses
  onChange: (next: ChecklistResponses) => void
  /** Operation id — required for `photo` items, whose answer is a set of
   *  attachment ids uploaded against the op. Omit only when no photo item
   *  exists in `items`. */
  opId?: string
}

/** Renders a checklist template's items as kind-appropriate inputs (the form is
 *  derived from how each item was authored in the IMS form builder):
 *  boolean → toggle, text → textarea, numeric → number input, select →
 *  Pass/Fail/N/A buttons (canonical) or dropdown, multi_select → multi-select,
 *  photo → per-item upload. The submit value is typed per kind and re-validated
 *  server-side against the run snapshot. */
export function ChecklistFields({ items, value, onChange, opId }: ChecklistFieldsProps) {
  const patch = (key: string, p: Partial<ChecklistAnswer>) =>
    onChange({ ...value, [key]: { ...(value[key] ?? {}), ...p } })

  return (
    <div className="space-y-2.5">
      {items.map((item) => {
        const ans = value[item.key]
        return (
          <div key={item.key} className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Typography variant="body-strong" asChild>
                  <p>
                    {item.label}
                    {item.required && <span className="text-destructive"> *</span>}
                  </p>
                </Typography>
                {item.notes && (
                  <Typography variant="helper" tone="muted" asChild>
                    <p>{item.notes}</p>
                  </Typography>
                )}
              </div>
              {isCanonicalPassFailNa(item) && (
                <div className="inline-flex shrink-0 gap-1">
                  {PF_OPTIONS.map((o) => {
                    const variant = ans?.value === o.value ? o.activeVariant : PF_INACTIVE_VARIANT
                    return (
                      <Button
                        key={o.value}
                        type="button"
                        size="sm"
                        variant={variant}
                        onClick={() => patch(item.key, { value: o.value })}
                      >
                        <o.icon className="size-3.5" data-icon="inline-start" />
                        {o.label}
                      </Button>
                    )
                  })}
                </div>
              )}
            </div>

            <ChecklistInput item={item} ans={ans} patch={patch} opId={opId} />

            {/* A failed canonical item reveals an optional note and an optional
                evidence photo box, so the operator can show what failed without
                being forced to. Neither blocks Complete. */}
            {isCanonicalPassFailNa(item) && ans?.value === 'fail' && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <Textarea
                    rows={2}
                    maxLength={FAIL_NOTE_MAX}
                    placeholder={CHECKLIST_FIELDS_STRINGS.failNotePlaceholder}
                    value={ans?.notes ?? ''}
                    onChange={(e) => patch(item.key, { notes: e.target.value })}
                  />
                  <Typography variant="helper" tone="muted" className="text-right">
                    {CHECKLIST_FIELDS_STRINGS.failNoteCounter((ans?.notes ?? '').length, FAIL_NOTE_MAX)}
                  </Typography>
                </div>
                {/* Buffered — uploaded only on Complete, so a cancelled /
                    reopened dialog shows none. */}
                <StagePhotoUpload
                  value={ans?.photos ?? []}
                  onChange={(files) => patch(item.key, { photos: files })}
                  label={CHECKLIST_FIELDS_STRINGS.failPhotoLabel}
                  optional
                  maxCount={5}
                  maxSizeMb={10}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
