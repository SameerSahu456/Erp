import { useMemo, type ComponentType } from 'react'

import { AsyncSelect, makeStaticAsyncOptions } from '@/components/ui/async-select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { MultiSelect } from '@/components/ui/multi-select'
import { Textarea } from '@/components/ui/textarea'
import { Typography } from '@/components/ui/typography'
import { useNumberField } from '@/hooks/use-number-field'
import type { ChecklistItem } from '../../api'
import { ChecklistPhotoField } from './ChecklistPhotoField'
import { type ChecklistAnswer, isCanonicalPassFailNa } from './checklistResponses'
import { CHECKLIST_FIELDS_STRINGS } from './checklist-fields.strings'

interface ChecklistInputProps {
  item: ChecklistItem
  ans: ChecklistAnswer | undefined
  patch: (key: string, p: Partial<ChecklistAnswer>) => void
  opId?: string
}

/** The per-kind input control. Canonical Pass/Fail/N/A selects render their
 *  buttons in the header and emit no body control here. */
export function ChecklistInput(props: ChecklistInputProps) {
  if (isCanonicalPassFailNa(props.item)) return null
  const Control = CONTROL_BY_KIND[props.item.kind]
  return Control ? <Control {...props} /> : null
}

function BooleanInput({ item, ans, patch }: ChecklistInputProps) {
  return (
    <label className="flex items-center gap-2.5">
      <Checkbox
        checked={ans?.value === true}
        onCheckedChange={(c) => patch(item.key, { value: c === true })}
      />
      <Typography variant="body" asChild>
        <span>{CHECKLIST_FIELDS_STRINGS.booleanYes}</span>
      </Typography>
    </label>
  )
}

function TextInput({ item, ans, patch }: ChecklistInputProps) {
  const v = ans?.value
  return (
    <Textarea
      rows={2}
      maxLength={item.max_length ?? undefined}
      placeholder={CHECKLIST_FIELDS_STRINGS.textPlaceholder}
      value={typeof v === 'string' ? v : ''}
      onChange={(e) => patch(item.key, { value: e.target.value })}
    />
  )
}

function NumericInput({ item, ans, patch }: ChecklistInputProps) {
  const v = ans?.value
  return (
    <NumericChecklistInput
      item={item}
      value={typeof v === 'number' && !Number.isNaN(v) ? v : undefined}
      onChange={(n) => patch(item.key, { value: n })}
    />
  )
}

function SelectInput({ item, ans, patch }: ChecklistInputProps) {
  const v = ans?.value
  // Memoised for a stable hook identity across renders (AsyncSelect calls it).
  const useOptions = useMemo(
    () => makeStaticAsyncOptions((item.options ?? []).map((o) => ({ id: o })), (o) => o.id),
    [item.options],
  )
  return (
    <AsyncSelect<{ id: string }>
      value={typeof v === 'string' && v ? { id: v, label: v } : null}
      onValueChange={(opt) => patch(item.key, { value: opt?.id ?? '' })}
      useOptions={useOptions}
      toLabel={(o) => o.id}
      placeholder={CHECKLIST_FIELDS_STRINGS.selectPlaceholder}
      searchPlaceholder={CHECKLIST_FIELDS_STRINGS.searchOptions}
      clearable
      chevron="down"
    />
  )
}

function MultiSelectInput({ item, ans, patch }: ChecklistInputProps) {
  const v = ans?.value
  return (
    <MultiSelect
      options={item.options ?? []}
      value={Array.isArray(v) ? v : []}
      onValueChange={(next) => patch(item.key, { value: next })}
    />
  )
}

function PhotoInput({ item, ans, patch, opId }: ChecklistInputProps) {
  const v = ans?.value
  return (
    <ChecklistPhotoField
      opId={opId}
      itemKey={item.key}
      value={Array.isArray(v) ? v : []}
      onChange={(ids) => patch(item.key, { value: ids })}
      maxCount={5}
      maxSizeMb={10}
    />
  )
}

const CONTROL_BY_KIND: Partial<Record<string, ComponentType<ChecklistInputProps>>> = {
  boolean: BooleanInput,
  text: TextInput,
  numeric: NumericInput,
  select: SelectInput,
  multi_select: MultiSelectInput,
  photo: PhotoInput,
}

interface NumericChecklistInputProps {
  item: ChecklistItem
  value: number | undefined
  onChange: (next: number) => void
}

/** Numeric checklist answer. A component so the shared number-field hook runs at
 *  a component top level. Precision follows `integer_only`; min/max stay
 *  server-validated against the run snapshot, so they are not clamped here. */
function NumericChecklistInput({ item, value, onChange }: NumericChecklistInputProps) {
  const field = useNumberField(value ?? 0, onChange, { decimal: !item.integer_only })
  return <Input {...field} />
}
