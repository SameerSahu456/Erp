import type { BillOfMaterials, DeviceComponent } from '@/modules/wms/types'
import { mockBOMs } from './boms'

// Expand a BOM into a flat list of DeviceComponent slots (one entry per unit of
// quantity). Optional items are still expanded so the inspector can mark them
// NOT_APPLICABLE rather than having to decide up front.
export function expandBOMToSlots(
  bom: BillOfMaterials,
  deviceId: string,
): DeviceComponent[] {
  const slots: DeviceComponent[] = []
  for (const item of bom.items) {
    for (let i = 1; i <= item.quantity; i += 1) {
      slots.push({
        slotId: `${deviceId}:${item.id}:${i}`,
        bomItemId: item.id,
        slotIndex: i,
        partId: item.partId,
        partName: item.partName,
        partSku: item.partSku,
        position: item.position,
        serialNumber: '',
        barcode: '',
      })
    }
  }
  return slots
}

// Active ASSEMBLY-type BOMs suitable for server / workstation inward builds.
export function getActiveAssemblyBOMs(): BillOfMaterials[] {
  return mockBOMs.filter((b) => b.type === 'ASSEMBLY' && b.status === 'Active')
}

export function findBOMById(bomId: string): BillOfMaterials | undefined {
  return mockBOMs.find((b) => b.id === bomId)
}
