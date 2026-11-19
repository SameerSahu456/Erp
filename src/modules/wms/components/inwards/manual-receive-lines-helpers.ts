// Manual-receive line state + pure builders. Kept out of ManualReceiveLines.tsx
// so that file exports only its component (react-refresh/only-export-components).
import type { GrnDraftLine } from '../../api'

/** A manually entered unit (on-call flows): tracked → one serial, else a quantity. */
export interface ManualReceiveLine {
  key: string
  variantId: string | null
  partId: string // resolves is_tracking via the part
  label: string
  tracked: boolean | undefined // resolved from the part once loaded
  serial: string
  qty: number
}

export type ManualReceiveState = ManualReceiveLine[]
export const emptyManualState = (): ManualReceiveState => []

export const makeLine = (): ManualReceiveLine => ({
  key: crypto.randomUUID(),
  variantId: null,
  partId: '',
  label: '',
  tracked: undefined,
  serial: '',
  qty: 1,
})

function lineUnits(l: ManualReceiveLine): number {
  if (!l.variantId) return 0
  if (l.tracked === true) return l.serial.trim() ? 1 : 0
  return Math.max(0, l.qty)
}

/** Units the operator has entered. */
export function manualUnitCount(state: ManualReceiveState): number {
  return state.reduce((sum, l) => sum + lineUnits(l), 0)
}

/** Build the atomic lines: tracked → a serial unit; non-tracked → a quantity. */
export function buildManualLines(state: ManualReceiveState): GrnDraftLine[] {
  const out: GrnDraftLine[] = []
  for (const l of state) {
    if (!l.variantId) continue
    if (l.tracked === true) {
      if (!l.serial.trim()) continue
      out.push({
        receive: { part_variant_id: l.variantId, units: [{ manufacturer_serial: l.serial.trim() }] },
      })
    } else {
      if (l.qty <= 0) continue
      out.push({ receive: { part_variant_id: l.variantId, quantity: l.qty } })
    }
  }
  return out
}
