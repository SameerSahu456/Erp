// ── Repair ──
export type RepairType = 'L2' | 'L3' | 'DISPLAY' | 'BATTERY'

export interface RepairJob {
  id: string
  deviceId: string
  deviceBarcode: string
  repairType: RepairType
  assignedTo: string
  status: 'Assigned' | 'In Progress' | 'QC Passed' | 'Completed' | 'Failed'
  isRework: boolean
  reworkCount: number
  startedAt?: string
  completedAt?: string
  notes?: string
  issues?: string[]
  // Component-scoped repair (set when the job targets one slot of an ASSEMBLY device)
  componentSlotId?: string
  componentPartName?: string
}



// ── QC ──
export interface QCRecord {
  id: string
  deviceId: string
  deviceBarcode: string
  qcType: 'INWARD'
  result: 'PASSED' | 'FAILED'
  grade?: 'A' | 'B'
  failureReasons?: string[]
  inspectedBy: string
  inspectedAt: string
  notes?: string
}

