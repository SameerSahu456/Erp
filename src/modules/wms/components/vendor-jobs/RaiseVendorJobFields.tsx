import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AsyncSelect } from '@/components/ui/async-select'
import { AsyncMultiSelect } from '@/components/ui/async-multi-select'
import { Typography } from '@/components/ui/typography'
import { FieldError } from '@/components/common/forms/FieldError'

import type { useRaiseVendorJob } from '../../hooks/vendor-jobs/useRaiseVendorJob'
import { VENDOR_JOB_DIALOG_STRINGS as S } from './vendor-job-dialogs.strings'

type RaiseController = ReturnType<typeof useRaiseVendorJob>

/** Job-type picker, shown only when more than one section applies. */
export function RaiseJobTypePicker({ c }: { c: RaiseController }) {
  const { pickedSectionId, sectionName, useSectionOptions } = c
  return (
    <div className="space-y-1">
      <Label htmlFor="job_type" required>{S.raise.jobTypeLabel}</Label>
      <AsyncSelect
        id="job_type"
        value={
          pickedSectionId
            ? { id: pickedSectionId, label: sectionName(pickedSectionId) }
            : null
        }
        onValueChange={(opt) => c.changeSection(opt?.id ?? '')}
        useOptions={useSectionOptions}
        toLabel={(s) => s.name}
        placeholder={S.raise.jobTypePlaceholder}
        clearable={false}
        className="w-full"
      />
    </div>
  )
}

/** Item multi-pick plus the "Others" free-text box. */
export function RaiseItemFields({ c }: { c: RaiseController }) {
  const { itemSuggestions, picked, setPicked, useItemOptions, showFreeText, form } = c
  return (
    <>
      {itemSuggestions.length > 0 && (
        <div className="space-y-2">
          <Label required>{S.raise.pickLabel}</Label>
          <AsyncMultiSelect
            value={picked}
            onValueChange={setPicked}
            useOptions={useItemOptions}
            toLabel={(o) => o.name}
            placeholder={S.raise.pickPlaceholder}
          />
          <Typography variant="helper" tone="muted" className="block">
            {S.raise.pickHelp}
          </Typography>
        </div>
      )}

      {/* Free text — shown only once "Others" is picked (or a section has
          no suggestions at all, where it is the only way to name the item). */}
      {showFreeText && (
        <div className="space-y-1">
          <Label htmlFor="item_description" required>
            {itemSuggestions.length > 0 ? S.raise.customLabel : S.raise.itemLabel}
          </Label>
          <Input
            id="item_description"
            placeholder={S.raise.itemPlaceholder}
            {...form.register('item_description')}
          />
          <Typography variant="helper" tone="muted">
            {S.raise.itemHelp}
          </Typography>
          <FieldError message={form.formState.errors.item_description?.message} />
        </div>
      )}
    </>
  )
}
