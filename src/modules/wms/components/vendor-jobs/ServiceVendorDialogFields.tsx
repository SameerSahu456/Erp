import { Controller } from 'react-hook-form'

import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Typography } from '@/components/ui/typography'
import { AsyncSelect } from '@/components/ui/async-select'
import { FieldError } from '@/components/common/forms/FieldError'
import { useVendorOptions } from '@modules/procurement'

import type { useServiceVendorForm } from '../../hooks/vendor-jobs/useServiceVendorForm'
import { SERVICE_VENDOR_DIALOG_STRINGS as S } from './service-vendor-dialog.strings'

type VendorFormController = ReturnType<typeof useServiceVendorForm>

const TYPE_LABEL = { internal: S.typeInternal, external: S.typeExternal } as const

/** Section (immutable on edit) and vendor pickers. */
export function ServiceVendorPairFields({ c }: { c: VendorFormController }) {
  const { form, sections, useSectionOptions, isEdit, sectionInvalid, vendor, vendorError } = c
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor="section_id" required>
          {S.sectionLabel}
        </Label>
        <Controller
          control={form.control}
          name="section_id"
          rules={{ required: true }}
          render={({ field }) => (
            <AsyncSelect
              id="section_id"
              // Show the section NAME, not its id (PAGE-UI §7.2).
              value={
                field.value
                  ? {
                      id: field.value,
                      label: sections.find((s) => s.id === field.value)?.name ?? field.value,
                    }
                  : null
              }
              onValueChange={(opt) => field.onChange(opt?.id ?? '')}
              useOptions={useSectionOptions}
              toLabel={(s) => s.name}
              placeholder={S.sectionPlaceholder}
              disabled={isEdit}
              clearable={false}
              className={cn(
                'w-full',
                sectionInvalid && 'border-destructive ring-2 ring-destructive/20',
              )}
            />
          )}
        />
        <FieldError message={sectionInvalid ? S.sectionRequired : null} />
      </div>

      <div className="space-y-1">
        <Label required>{S.vendorLabel}</Label>
        <AsyncSelect
          value={vendor}
          onValueChange={c.pickVendor}
          useOptions={useVendorOptions}
          toLabel={(v: { id: string; name?: string }) => v.name ?? v.id}
          placeholder={S.vendorPlaceholder}
          className={cn(vendorError && 'border-destructive ring-2 ring-destructive/20')}
        />
        <FieldError message={vendorError} />
      </div>
    </>
  )
}

export function ServiceVendorTypeField({ c }: { c: VendorFormController }) {
  const { form, typeInvalid } = c
  return (
    <div className="space-y-1">
      <Label htmlFor="vendor_type" required>{S.typeLabel}</Label>
      <Controller
        control={form.control}
        name="vendor_type"
        rules={{ required: true }}
        render={({ field }) => (
          <Select value={field.value || undefined} onValueChange={field.onChange}>
            <SelectTrigger
              id="vendor_type"
              className={cn(
                'w-full',
                typeInvalid && 'border-destructive ring-2 ring-destructive/20',
              )}
            >
              {/* Placeholder until a type is chosen; otherwise the mapped
                  label, not the raw "internal"/"external". */}
              <SelectValue placeholder={S.typePlaceholder}>
                {field.value ? TYPE_LABEL[field.value] : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="external">{S.typeExternal}</SelectItem>
              <SelectItem value="internal">{S.typeInternal}</SelectItem>
            </SelectContent>
          </Select>
        )}
      />
      <FieldError message={typeInvalid ? S.typeRequired : null} />
    </div>
  )
}

/** Default switch, the edit-only Active switch, and notes. */
export function ServiceVendorFlagFields({ c }: { c: VendorFormController }) {
  const { form, isEdit } = c
  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Label htmlFor="is_default" className="cursor-pointer">
            {S.defaultLabel}
          </Label>
          <Typography variant="helper" tone="muted" asChild>
            <span>{S.defaultHelp}</span>
          </Typography>
        </div>
        <Controller
          control={form.control}
          name="is_default"
          render={({ field }) => (
            <Switch
              id="is_default"
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-label={S.defaultLabel}
              className="shrink-0"
            />
          )}
        />
      </div>

      {isEdit ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3">
          <Label htmlFor="is_active" className="cursor-pointer">
            {S.activeLabel}
          </Label>
          <Controller
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <Switch
                id="is_active"
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-label={S.activeLabel}
                className="shrink-0"
              />
            )}
          />
        </div>
      ) : null}

      <div className="space-y-1">
        <Label htmlFor="notes">{S.notesLabel}</Label>
        <Textarea
          id="notes"
          rows={3}
          maxLength={250}
          placeholder={S.notesPlaceholder}
          {...form.register('notes', { maxLength: { value: 250, message: S.notesTooLong } })}
        />
        <FieldError message={form.formState.errors.notes?.message ?? null} />
      </div>
    </>
  )
}
