import { Check } from 'lucide-react'

import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

import { STEPS } from './config'
import type { InwardForm } from './useInwardForm'

/** The two-segment wizard step tabs (Inward Details / Line Items). */
export function InwardStepTabs({ f }: { f: InwardForm }) {
  const { step, setStep, reachable } = f
  return (
    <div className="grid w-full grid-cols-2 gap-1 rounded-lg border border-border bg-muted/40 p-1">
      {STEPS.map((s, i) => {
        const active = i === step
        const done = i < step
        const ok = reachable(i)
        return (
          <button
            key={s.id}
            type="button"
            disabled={!ok}
            onClick={() => ok && setStep(i)}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 transition-colors',
              active
                ? 'bg-card text-foreground shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.06)]'
                : 'text-muted-foreground hover:text-foreground',
              !ok && 'cursor-not-allowed opacity-50 hover:text-muted-foreground',
            )}
          >
            <Typography variant="badge" tone="inherit" asChild>
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full',
                  active && 'bg-primary text-primary-foreground',
                  !active && done && 'bg-primary/15 text-primary',
                  !active && !done && 'bg-muted-foreground/15 text-muted-foreground',
                )}
              >
                {done ? <Check className="size-3" /> : i + 1}
              </span>
            </Typography>
            <Typography variant="body-strong" truncate className="min-w-0">
              {s.label}
            </Typography>
          </button>
        )
      })}
    </div>
  )
}
