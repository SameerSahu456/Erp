/**
 * Add or edit a third-party service section.
 *
 * This is the screen that makes the whole feature's promise real: a row here
 * produces a sidebar entry, a route, a queue page, a device card and a vendor
 * picker with no code change. Superuser-gated, because adding one changes what
 * every device page offers. State lives in `useServiceSectionForm`.
 */
import { Controller, type Control } from 'react-hook-form'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Typography } from '@/components/ui/typography'
import { FieldError } from '@/components/common/forms/FieldError'

import type { ServiceSection } from '../../api/service-jobs'
import type { ServiceSectionFormInput } from '../../schemas'
import { useServiceSectionForm } from '../../hooks/vendor-jobs/useServiceSectionForm'
import { OperationDialog } from '../shared/OperationDialog'
import { SuggestedItemsField } from './SuggestedItemsField'
import { SERVICE_SECTIONS_STRINGS as S } from './service-sections.strings'

const D = S.dialog

type BoolField = 'tracks_replacement' | 'applies_to_servers' | 'is_active'

interface ServiceSectionDialogProps {
  open: boolean
  /** null = create; a row = edit. */
  editing: ServiceSection | null
  onClose: () => void
}

function saveLabel(busy: boolean, isEdit: boolean) {
  if (busy) return D.saving
  return isEdit ? D.save : D.create
}

/** A labelled on/off row bound to one boolean form field. */
function SwitchRow({
  control,
  name,
  label,
  help,
}: {
  control: Control<ServiceSectionFormInput>
  name: BoolField
  label: string
  help?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Label htmlFor={name} className="cursor-pointer">
          {label}
        </Label>
        {help && (
          <Typography variant="helper" tone="muted" asChild>
            <span>{help}</span>
          </Typography>
        )}
      </div>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Switch id={name} checked={field.value} onCheckedChange={field.onChange} aria-label={label} className="shrink-0" />
        )}
      />
    </div>
  )
}

export function ServiceSectionDialog({ open, editing, onClose }: ServiceSectionDialogProps) {
  const { form, isEdit, busy, formError, close, submit } = useServiceSectionForm(editing, onClose)
  const errors = form.formState.errors

  return (
    <OperationDialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title={isEdit ? D.editTitle : D.createTitle}
      description={D.description}
      isDirty={form.formState.isDirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={busy}>
            {D.close}
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
            {saveLabel(busy, isEdit)}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="name" required>
            {D.nameLabel}
          </Label>
          <Input
            id="name"
            autoFocus
            placeholder={D.namePlaceholder}
            aria-invalid={!!errors.name || undefined}
            {...form.register('name')}
          />
          <FieldError message={errors.name?.message ?? null} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="code" required={!isEdit}>
            {D.codeLabel}
          </Label>
          <Input
            id="code"
            disabled={isEdit}
            placeholder={D.codePlaceholder}
            aria-invalid={!!errors.code || undefined}
            {...form.register('code')}
          />
          {/* Guidance OR the red error — never both. */}
          {errors.code ? (
            <FieldError message={errors.code.message ?? null} />
          ) : (
            <Typography variant="helper" tone="muted">
              {isEdit ? D.codeLocked : D.codeHelp}
            </Typography>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="device_status_label" required>
            {D.statusLabelLabel}
          </Label>
          <Input
            id="device_status_label"
            placeholder={D.statusLabelPlaceholder}
            aria-invalid={!!errors.device_status_label || undefined}
            {...form.register('device_status_label')}
          />
          <FieldError message={errors.device_status_label?.message ?? null} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="item_suggestions">{D.itemsLabel}</Label>
          <Controller
            control={form.control}
            name="item_suggestions"
            render={({ field }) => <SuggestedItemsField value={field.value} onChange={field.onChange} />}
          />
          <Typography variant="helper" tone="muted">
            {D.itemsHelp}
          </Typography>
        </div>

        <SwitchRow
          control={form.control}
          name="tracks_replacement"
          label={D.tracksReplacementLabel}
          help={D.tracksReplacementHelp}
        />
        <SwitchRow
          control={form.control}
          name="applies_to_servers"
          label={D.appliesToServersLabel}
          help={D.appliesToServersHelp}
        />
        {isEdit ? <SwitchRow control={form.control} name="is_active" label={D.activeLabel} /> : null}

        <FieldError message={formError} />
      </div>
    </OperationDialog>
  )
}
