import type { QCRecord } from '../types'

export const mockQCRecords: QCRecord[] = [
  // Inward QC — passed Grade A
  {
    id: 'qc-001',
    deviceId: 'dev-019',
    deviceBarcode: 'L-LEN-3005',
    qcType: 'INWARD',
    result: 'PASSED',
    grade: 'A',
    inspectedBy: 'Anita Desai',
    inspectedAt: '2026-03-15T16:00:00Z',
    notes: 'All tests passed. Excellent condition.',
  },
  {
    id: 'qc-002',
    deviceId: 'dev-021',
    deviceBarcode: 'L-DEL-1009',
    qcType: 'INWARD',
    result: 'PASSED',
    grade: 'A',
    inspectedBy: 'Anita Desai',
    inspectedAt: '2026-03-06T11:00:00Z',
    notes: 'Clean unit, no cosmetic issues.',
  },
  // Inward QC — passed Grade B
  {
    id: 'qc-003',
    deviceId: 'dev-022',
    deviceBarcode: 'L-HP-2006',
    qcType: 'INWARD',
    result: 'PASSED',
    grade: 'B',
    inspectedBy: 'Anita Desai',
    inspectedAt: '2026-03-15T10:00:00Z',
    notes: 'Minor cosmetic wear on palm rest. Functional A-grade but cosmetic B.',
  },
  // Inward QC — failed (sent back to repair)
  {
    id: 'qc-004',
    deviceId: 'dev-011',
    deviceBarcode: 'L-LEN-3003',
    qcType: 'INWARD',
    result: 'FAILED',
    failureReasons: ['Touchpad intermittent response', 'Keyboard backlight flickering'],
    inspectedBy: 'Anita Desai',
    inspectedAt: '2026-03-28T14:00:00Z',
    notes: 'Sent back for rework. Touchpad cable needs reseating.',
  },
  {
    id: 'qc-005',
    deviceId: 'dev-017',
    deviceBarcode: 'L-HP-2005',
    qcType: 'INWARD',
    result: 'FAILED',
    failureReasons: ['Hinge misaligned', 'Screen bezel gap on right side'],
    inspectedBy: 'Anita Desai',
    inspectedAt: '2026-03-18T11:00:00Z',
    notes: 'First QC failure. Hinge repair insufficient.',
  },
  // Inward QC — passed after rework
  {
    id: 'qc-006',
    deviceId: 'dev-023',
    deviceBarcode: 'L-LEN-3006',
    qcType: 'INWARD',
    result: 'PASSED',
    grade: 'A',
    inspectedBy: 'Anita Desai',
    inspectedAt: '2026-03-14T15:00:00Z',
    notes: 'Passed on first attempt.',
  },
  // ── Server (ASSEMBLY) inward QC ──
  // dev-srv-005: passed QC, awaiting rack assignment (READY_FOR_STOCK).
  {
    id: 'qc-011',
    deviceId: 'dev-srv-005',
    deviceBarcode: 'S-DEL-7005',
    qcType: 'INWARD',
    result: 'PASSED',
    grade: 'A',
    inspectedBy: 'Deepak Verma',
    inspectedAt: '2026-04-12T15:00:00Z',
    notes: 'All 12 component slots pass — CPU, RAM, SSD, PSU, NIC, RAID verified under load. Chassis cosmetics A-grade.',
  },
  // dev-srv-006: passed QC earlier, already racked (IN_STOCK).
  {
    id: 'qc-012',
    deviceId: 'dev-srv-006',
    deviceBarcode: 'S-DEL-7006',
    qcType: 'INWARD',
    result: 'PASSED',
    grade: 'A',
    inspectedBy: 'Deepak Verma',
    inspectedAt: '2026-03-28T14:00:00Z',
    notes: 'Full BOM verified and burn-in test passed. Stock-ready.',
  },
]
