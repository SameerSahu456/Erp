/**
 * Who takes the work, and how much of it.
 *
 * The engineer comes before the quantity (spec D16): their outstanding count is
 * the only capacity signal the system has, and it informs nothing once a number
 * has already been chosen.
 */
import { useMemo } from 'react'

import { AsyncSelect, makeStaticAsyncOptions } from '@/components/ui/async-select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { useNumberField } from '@/hooks/use-number-field'

import type { EligibleEngineer } from '../../api/work-assignments'

import { WORK_ASSIGNMENT_STRINGS as S } from './work-assignments.strings'

interface IssueStepAssigneeProps {
  engineers: EligibleEngineer[]
  isLoadingEngineers: boolean
  engineerId: string | null
  onEngineerChange: (userId: string) => void
  quantity: number
  onQuantityChange: (quantity: number) => void
  available: number
}

/** `{id,label}` row the engineer AsyncSelect renders + searches on. */
interface EngineerRow {
  id: string
  label: string
}

/** Show the team-assignment level (L1 / L2 / L3) in the picker so the
 *  stage-based filtering is visible; a missing level is omitted. ('display' was
 *  retired 2026-09 and backfilled to l3, so it can no longer appear.) */
function formatLevel(level: string | null | undefined): string | null {
  return level ? level.toUpperCase() : null
}

function engineerLabel(e: EligibleEngineer): string {
  const level = formatLevel(e.level)
  return `${e.full_name}${level ? ` · ${level}` : ''} · ${e.outstanding_count} ${S.issue.outstandingSuffix}`
}

export function IssueStepAssignee({
  engineers,
  isLoadingEngineers,
  engineerId,
  onEngineerChange,
  quantity,
  onQuantityChange,
  available,
}: IssueStepAssigneeProps) {
  const selected = engineers.find((e) => e.user_id === engineerId)

  // Shared number-field behaviour (shows 0 by default, clears on focus, strips
  // leading zeros); capped at the available count so it can't exceed capacity.
  const qtyField = useNumberField(quantity, onQuantityChange, { max: available })

  // §16.11 — the engineer list is API-backed, so it is the app-standard
  // searchable AsyncSelect. Already fetched, so makeStaticAsyncOptions adapts it
  // without another round-trip.
  const useEngineerOptions = useMemo(
    () =>
      makeStaticAsyncOptions<EngineerRow>(
        engineers.map((e) => ({ id: e.user_id, label: engineerLabel(e) })),
        (o) => o.label,
      ),
    [engineers],
  )

  // Two fields to a row, each filling its cell (§3.2). No card of its own —
  // the whole form lives in one box.
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wa-engineer" required>
          {S.issue.assignTo}
        </Label>
        <AsyncSelect<EngineerRow>
          id="wa-engineer"
          value={selected ? { id: selected.user_id, label: engineerLabel(selected) } : null}
          onValueChange={(opt) => opt && onEngineerChange(opt.id)}
          useOptions={useEngineerOptions}
          toLabel={(o) => o.label}
          placeholder={S.issue.engineerPlaceholder}
          searchPlaceholder={S.issue.engineerPlaceholder}
          clearable={false}
          className="w-full"
        />
        {engineers.length === 0 && !isLoadingEngineers ? (
          <Typography variant="helper" tone="muted">
            {S.issue.noEngineersHint}
          </Typography>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wa-qty" required>
          {S.issue.howMany}
        </Label>
        <Input {...qtyField} id="wa-qty" className="w-full" />
        <Typography variant="helper" tone="muted">
          {S.issue.ofAvailable(available)}
        </Typography>
      </div>
    </div>
  )
}
