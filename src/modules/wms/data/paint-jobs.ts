import type { PaintJob } from '../types'

export const PAINT_VENDORS: { id: string; name: string; contact: string }[] = [
  { id: 'pv-01', name: 'Mumbai Paint Shop', contact: '+91 98765 43210' },
  { id: 'pv-02', name: 'Bangalore AutoPaint', contact: '+91 98700 12345' },
  { id: 'pv-03', name: 'Chennai Coat & Paint', contact: '+91 98123 45678' },
  { id: 'pv-04', name: 'Delhi Refinish Studio', contact: '+91 98998 00011' },
]

export const mockPaintJobs: PaintJob[] = [
  {
    id: 'paint-001',
    deviceId: 'dev-015',
    deviceBarcode: 'L-LEN-3004',
    panelType: 'TOP_COVER',
    status: 'IN_PAINT',
    assignedTo: 'Ravi Deshmukh',
    startedAt: '2026-03-22T09:00:00Z',
  },
  {
    id: 'paint-002',
    deviceId: 'dev-006',
    deviceBarcode: 'L-HP-2002',
    panelType: 'TOP_COVER',
    status: 'AWAITING_PAINT',
  },
  {
    id: 'paint-003',
    deviceId: 'dev-006',
    deviceBarcode: 'L-HP-2002',
    panelType: 'BOTTOM_COVER',
    status: 'AWAITING_PAINT',
  },
  {
    id: 'paint-004',
    deviceId: 'dev-017',
    deviceBarcode: 'L-HP-2005',
    panelType: 'TOP_COVER',
    status: 'COLLECTED',
    assignedTo: 'Ravi Deshmukh',
    startedAt: '2026-03-10T09:00:00Z',
    completedAt: '2026-03-13T16:00:00Z',
  },
  {
    id: 'paint-005',
    deviceId: 'dev-011',
    deviceBarcode: 'L-LEN-3003',
    panelType: 'TOP_COVER',
    status: 'READY_FOR_COLLECTION',
    assignedTo: 'Ravi Deshmukh',
    startedAt: '2026-03-25T09:00:00Z',
    completedAt: '2026-03-28T14:00:00Z',
  },
  {
    id: 'paint-006',
    deviceId: 'dev-030',
    deviceBarcode: 'L-HP-2008',
    panelType: 'TOP_COVER',
    status: 'AWAITING_PAINT',
  },
]
