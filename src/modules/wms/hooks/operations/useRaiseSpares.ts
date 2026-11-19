/** Controller behind `RaiseSparesDialog`. */
import { useState } from 'react'

import { type AsyncSelectOption } from '@/components/ui/async-select'
import { type VariantListItem } from '@modules/ims'

import { RAISE_SPARES_DIALOG_STRINGS as S } from '../../components/operations/raise-spares-dialog.strings'
import { useDeviceInspection } from '../inspection/useInspection'
import { useDeviceQc } from '../qc/useQc'
import { useDeviceRepair } from '../repair/useRepair'
import { useCreateSpareRequests } from '../spares/useSpares'
import { useDiscardGuard } from './useDiscardGuard'

/** A requested spare: a picked IMS part or a free-text description (the manager picks the part later). */
export type RaisedSpareLine = {
  key: string
  variantId: string | null
  description: string | null
  label: string
  quantity: number
  notes: string
}

export type RaiseSparesStage = 'inspection' | 'repair' | 'qc'

export function spareVariantLabel(v: VariantListItem): string {
  return v.display_title || v.name || v.part_name || v.part_number || S.unnamedVariant
}

const newLine = (key: string, variantId: string | null, description: string | null, label: string): RaisedSpareLine => ({
  key,
  variantId,
  description,
  label,
  quantity: 1,
  notes: '',
})

export function useRaiseSpares(deviceId: string | null, stage: RaiseSparesStage, onClose: () => void) {
  const open = deviceId !== null
  // The active op of the relevant stage supplies source_operation_id.
  const inspectionOp = useDeviceInspection(deviceId ?? '', open && stage === 'inspection')
  const repairOp = useDeviceRepair(deviceId ?? '', open && stage === 'repair')
  const qcOp = useDeviceQc(deviceId ?? '', open && stage === 'qc')
  const opByStage = { inspection: inspectionOp.data, repair: repairOp.data, qc: qcOp.data }
  const op = opByStage[stage]

  const create = useCreateSpareRequests()
  const [picker, setPicker] = useState<AsyncSelectOption | null>(null)
  const [describing, setDescribing] = useState('')
  const [lines, setLines] = useState<RaisedSpareLine[]>([])

  const close = () => {
    setLines([])
    setPicker(null)
    setDescribing('')
    onClose()
  }
  // Prompt before discarding a spare that's been added or picked. A clean form
  // closes at once.
  const dirty = lines.length > 0 || picker !== null || describing.trim() !== ''
  const guard = useDiscardGuard(dirty, close)

  const addVariant = (v: VariantListItem) => {
    setLines((prev) =>
      prev.some((l) => l.variantId === v.id)
        ? prev
        : [...prev, newLine(`variant:${v.id}`, v.id, null, spareVariantLabel(v))],
    )
    setPicker(null)
  }
  const describedPart = describing.trim()
  const addDescription = () => {
    if (!describedPart) return
    setLines((prev) =>
      prev.some((l) => l.description?.toLowerCase() === describedPart.toLowerCase())
        ? prev
        : [...prev, newLine(`described:${crypto.randomUUID()}`, null, describedPart, describedPart)],
    )
    setDescribing('')
  }
  const patch = (key: string, p: Partial<RaisedSpareLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...p } : l)))
  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key))

  const qtyValid = lines.every((l) => l.quantity >= 1)
  const ready = !!deviceId && lines.length > 0 && qtyValid
  // First unmet DATA gate on the Request button (§0.9), for the why-tooltip.
  const blockReason = ((): string | null => {
    if (!deviceId) return null
    if (lines.length === 0) return S.blocked.noLines
    return qtyValid ? null : S.blocked.invalidQty
  })()

  const submit = () => {
    if (!deviceId || !ready) return
    create.mutate(
      {
        id: deviceId,
        body: {
          // One qty-1 request per unit, so each is its own Spares row.
          requests: lines.flatMap((l) =>
            Array.from({ length: l.quantity }, () => ({
              part_variant_id: l.variantId,
              description: l.description,
              quantity: 1,
              notes: l.notes.trim() || null,
            })),
          ),
          source_operation_id: op?.id ?? null,
        },
      },
      { onSuccess: close },
    )
  }

  return {
    open,
    picker,
    setPicker,
    describing,
    setDescribing,
    describedPart,
    lines,
    addVariant,
    addDescription,
    patch,
    removeLine,
    ready,
    blockReason,
    create,
    submit,
    guard,
  }
}
