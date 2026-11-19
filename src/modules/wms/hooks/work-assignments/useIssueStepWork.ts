import { useMemo } from 'react'

import { makeStaticAsyncOptions } from '@/components/ui/async-select'

import type { EligibleGrnGroup } from '../../api/work-assignments'
import type { WorkSelection } from '../../components/work-assignments/IssueStepWork'
import {
  ALL_GRNS,
  ALL_PARTS,
  grnPickLabel,
  grnRows,
  mergeGrnLines,
  partLabel,
  partPickLabel,
  type GrnLine,
  type GrnRow,
  type PartRow,
} from '../../components/work-assignments/issue-step-work-helpers'
import { WORK_ASSIGNMENT_STRINGS as S } from '../../components/work-assignments/work-assignments.strings'

/** Scope, labels and dropdown option sources for `IssueStepWork`. */
export function useIssueStepWork(groups: EligibleGrnGroup[], selected: WorkSelection | null) {
  const group = groups.find((g) => g.grn_batch_id && g.grn_batch_id === selected?.grnBatchId)
  // A selection with no grnBatchId is the "All GRNs" row, not "nothing picked".
  const grnValue = selected ? (selected.grnBatchId ?? ALL_GRNS) : undefined

  const totalWaiting = useMemo(
    () => groups.reduce((sum, g) => sum + (g.pending_count ?? 0), 0),
    [groups],
  )

  // The part list behind "All GRNs".
  const mergedLines = useMemo<GrnLine[]>(() => mergeGrnLines(groups), [groups])

  // Memoised, not a bare conditional: it feeds the part-options useMemo below,
  // and `group.lines ?? []` would hand it a fresh array on every render.
  const scopeLines = useMemo<GrnLine[]>(
    () => (group ? (group.lines ?? []) : mergedLines),
    [group, mergedLines],
  )
  const scopeCount = group ? group.pending_count : totalWaiting

  const grnLabel = selected ? grnPickLabel(group, totalWaiting) : null
  const selectedLine = scopeLines.find((l) => l.part_variant_id === selected?.partVariantId)
  const partLabelText = selected ? partPickLabel(selected.partVariantId, selectedLine, scopeCount ?? 0) : null

  // §16.11 — both lists rode in on the eligible-summary response, so
  // makeStaticAsyncOptions gives them the searchable AsyncSelect without another
  // round-trip; each rebuilds when its source changes (never the empty pre-load list).
  const useGrnOptions = useMemo(
    () => makeStaticAsyncOptions<GrnRow>(grnRows(groups, totalWaiting), (r) => r.label),
    [groups, totalWaiting],
  )

  const partRows = useMemo<PartRow[]>(() => {
    if (!selected) return []
    const all: PartRow = {
      id: ALL_PARTS,
      label: `${S.issue.allParts} · ${scopeCount ?? 0}`,
      line: null,
    }
    const lines = scopeLines.map<PartRow>((line) => ({
      id: line.part_variant_id,
      label: `${partLabel(line.oem_name, line.part_number, line.variant_name)} · ${line.pending_count}`,
      line,
    }))
    return [all, ...lines]
  }, [selected, scopeLines, scopeCount])

  const usePartOptions = useMemo(
    () => makeStaticAsyncOptions<PartRow>(partRows, (r) => r.label),
    [partRows],
  )

  return {
    group,
    grnValue,
    grnLabel,
    totalWaiting,
    scopeCount,
    partLabelText,
    useGrnOptions,
    usePartOptions,
  }
}
