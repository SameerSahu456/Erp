import type { ReturnRecord } from '../types'

export const mockReturnRecords: ReturnRecord[] = [
  // RET-2026-001: QC_FAILED from OUT-2026-003, 1 device, action: Repair, status: Received
  {
    id: 'ret-001',
    returnNumber: 'RET-2026-001',
    outwardId: 'out-003',
    outwardNumber: 'OUT-2026-003',
    reason: 'QC_FAILED',
    devices: [
      {
        deviceId: 'dev-025',
        barcode: 'L-HP-2008',
        model: 'EliteBook 840 G8',
        reason: 'Battery health below threshold during outward QC',
        action: 'Repair',
      },
    ],
    status: 'Received',
    returnedBy: 'Amit Patel',
    receivedBy: 'Rajesh Kumar',
    createdAt: '2026-04-02T14:00:00Z',
    notes: 'Device failed outward QC. Sent to battery replacement queue.',
  },

  // RET-2026-002: CUSTOMER_RETURN from OUT-2026-008, 1 device, action: Pending, status: Initiated
  {
    id: 'ret-002',
    returnNumber: 'RET-2026-002',
    outwardId: 'out-008',
    outwardNumber: 'OUT-2026-008',
    reason: 'CUSTOMER_RETURN',
    devices: [
      {
        deviceId: 'dev-046',
        barcode: 'L-LEN-3014',
        model: 'ThinkPad T14',
        reason: 'Display flickering issue reported by customer after delivery',
        action: 'Pending',
      },
    ],
    status: 'Initiated',
    returnedBy: 'Ajay Kapoor',
    createdAt: '2026-02-25T11:00:00Z',
    notes: 'Customer reported display flickering within 5 days of delivery. Return pickup scheduled.',
  },

  // RET-2026-003: DAMAGE_IN_TRANSIT from old outward, 2 devices, action: Repair+Scrap, status: Resolved
  {
    id: 'ret-003',
    returnNumber: 'RET-2026-003',
    outwardId: 'out-old-099',
    outwardNumber: 'OUT-2025-099',
    reason: 'DAMAGE_IN_TRANSIT',
    devices: [
      {
        deviceId: 'dev-old-101',
        barcode: 'L-DEL-0901',
        model: 'Latitude 5530',
        reason: 'Cracked display panel - packaging damage during transit',
        action: 'Repair',
      },
      {
        deviceId: 'dev-old-102',
        barcode: 'L-HP-1901',
        model: 'ProBook 440 G9',
        reason: 'Severe physical damage - motherboard cracked, unrepairable',
        action: 'Scrap',
      },
    ],
    status: 'Resolved',
    returnedBy: 'Transport team',
    receivedBy: 'Rajesh Kumar',
    createdAt: '2025-12-10T16:00:00Z',
    notes: 'Transit damage claim filed with transporter. 1 device repaired and restocked, 1 scrapped.',
  },
]
