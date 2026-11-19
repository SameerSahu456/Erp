import { useMemo } from 'react'

import type { VariantListItem } from '@/modules/ims'

import { demoLinesTotals, draftLineFromVariant, type DraftLine } from './demo-items'

// Line-mutation handlers for the "Demo items" card, extracted so `DemoItemsCard`
// stays a thin presenter (Coding-guideline §17 — no business logic in
// components). Fully controlled: callers pass the `DraftLine[]` and an
// `onChange`; this returns the add/update/remove handlers plus the totals.
// (BOM-component handlers were removed with the mock-backed BOM expander —
// see the note in demo-items.ts.)
export function useDemoLines(lines: DraftLine[], onChange: (next: DraftLine[]) => void) {
  function addVariant(variant: VariantListItem) {
    const existing = lines.find((l) => l.variantId === variant.id)
    if (existing) {
      onChange(lines.map((l) => (l.id === existing.id ? { ...l, qty: l.qty + 1 } : l)))
      return
    }
    onChange([...lines, draftLineFromVariant(variant)])
  }

  function updateLine(id: string, patch: Partial<DraftLine>) {
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function removeLine(id: string) {
    onChange(lines.filter((l) => l.id !== id))
  }

  const totals = useMemo(() => demoLinesTotals(lines), [lines])

  return {
    addVariant,
    updateLine,
    removeLine,
    totals,
  }
}
