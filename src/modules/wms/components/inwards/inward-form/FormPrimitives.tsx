import type { ReactNode } from 'react'
import { Check, type LucideIcon } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

/** Numbered step header (circle + title + description). */
export function SectionHeader({
  step,
  title,
  description,
}: {
  step: number
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <Typography variant="body-strong" tone="primary" asChild>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          {step}
        </span>
      </Typography>
      <div className="min-w-0">
        <Typography variant="card-title">{title}</Typography>
        <Typography variant="helper" tone="muted">
          {description}
        </Typography>
      </div>
    </div>
  )
}

/** Form field label with an optional required asterisk. */
export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <Label>
      {children}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </Label>
  )
}

/** Read-only label/value pair (used in the review summaries). */
export function DetailPair({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <Typography variant="helper" tone="muted">
        {label}
      </Typography>
      <Typography variant="body-strong" className="break-words">
        {value}
      </Typography>
    </div>
  )
}

/** A 2-up segmented control (Origin, Sales/Rental, Staff/Transfer all share it). */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { value: T; label: string; hint?: string; icon?: LucideIcon }[]
  value: T
  onSelect: (next: T) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:max-w-md">
      {options.map((opt) => {
        const selected = value === opt.value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              if (opt.value !== value) onSelect(opt.value)
            }}
            className={cn(
              'flex items-start justify-between gap-2 rounded-md border px-3 py-2.5 text-left transition-colors',
              selected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-input bg-card hover:bg-muted/60',
            )}
          >
            <span className="flex min-w-0 items-start gap-2">
              {Icon && <Icon className="mt-0.5 size-4 shrink-0" />}
              <span className="min-w-0">
                <Typography variant="body-strong">{opt.label}</Typography>
                {opt.hint && (
                  <Typography variant="helper" tone="muted" className="leading-snug">
                    {opt.hint}
                  </Typography>
                )}
              </span>
            </span>
            {selected && <Check className="mt-0.5 size-4 shrink-0" />}
          </button>
        )
      })}
    </div>
  )
}
