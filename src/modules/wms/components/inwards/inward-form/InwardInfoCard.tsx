import { Check } from 'lucide-react'

import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

import { INWARDS_STRINGS } from '../inwards.strings'
import { SectionHeader, FieldLabel, SegmentedToggle } from './FormPrimitives'
import { TYPE_GROUPS } from './config'
import { InwardSourceBox } from './InwardSourceBox'
import type { InwardForm } from './useInwardForm'

/** Step-1 "Inward Info" card: the inward-type grid, the transfer sub-type
 *  toggle, and the source box. Locked (read-only) in edit mode via the parent
 *  fieldset. */
export function InwardInfoCard({ f }: { f: InwardForm }) {
  const { inwardType, setInwardType, resetForType, isInternalTransfer } = f
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          step={1}
          title={INWARDS_STRINGS.inwardInfo.sectionTitle}
          description={INWARDS_STRINGS.inwardInfo.sectionDescription}
        />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <FieldLabel required>{INWARDS_STRINGS.inwardInfo.typeFieldLabel}</FieldLabel>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {TYPE_GROUPS.map((g) => {
              const Icon = g.icon
              const selected = g.types.includes(inwardType)
              return (
                <button
                  key={g.key}
                  type="button"
                  aria-pressed={selected}
                  disabled={g.disabled}
                  onClick={() => {
                    if (g.types.includes(inwardType)) return
                    setInwardType(g.types[0])
                    resetForType()
                  }}
                  className={cn(
                    'relative flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors disabled:pointer-events-none disabled:opacity-50',
                    selected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border hover:border-primary/40 hover:bg-muted/40',
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <Icon className={cn('size-4', selected ? 'text-primary' : 'text-muted-foreground')} />
                    {selected && <Check className="size-3.5 text-primary" />}
                  </div>
                  <div className="min-w-0">
                    <Typography variant="body-strong" className={selected ? 'text-primary' : undefined}>
                      {g.label}
                    </Typography>
                    <Typography variant="helper" tone="muted" className="mt-0.5 leading-snug">
                      {g.description}
                    </Typography>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* The sales/rental sub-type toggle was removed 2026-08-17. A sale
            return is now received against a Sales Return Request, and a
            request carries no `sellable_type` to split on — the toggle
            filtered a list of orders the picker no longer shows. Rental
            returns return here when the request's `entity_type` seam opens
            to `rental_contracts`. */}
        {isInternalTransfer && (
          <div className="space-y-2">
            <FieldLabel required>{INWARDS_STRINGS.inwardInfo.transferTypeFieldLabel}</FieldLabel>
            <SegmentedToggle
              value={inwardType}
              onSelect={(v) => {
                setInwardType(v)
                resetForType()
              }}
              options={[
                {
                  value: 'staff_return',
                  label: INWARDS_STRINGS.inwardInfo.transferStaffReturnLabel,
                  hint: INWARDS_STRINGS.inwardInfo.transferStaffReturnHint,
                },
                {
                  value: 'warehouse_transfer_inward',
                  label: INWARDS_STRINGS.inwardInfo.transferWarehouseTransferLabel,
                  hint: INWARDS_STRINGS.inwardInfo.transferWarehouseTransferHint,
                },
              ]}
            />
          </div>
        )}

        <InwardSourceBox f={f} />
      </CardContent>
    </Card>
  )
}
