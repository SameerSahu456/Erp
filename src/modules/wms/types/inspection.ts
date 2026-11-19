// ── Inspection ──
export const INSPECTION_CHECKLIST_ITEMS = [
  { id: 'panel_a', label: 'Panel A (Top Cover)', group: 'Panels' },
  { id: 'panel_b', label: 'Panel B (Screen Bezel)', group: 'Panels' },
  { id: 'panel_c', label: 'Panel C (Keyboard Area)', group: 'Panels' },
  { id: 'panel_d', label: 'Panel D (Bottom Cover)', group: 'Panels' },
  { id: 'display_white', label: 'Display (White Spots)', group: 'Display' },
  { id: 'display_black', label: 'Display (Black Spots)', group: 'Display' },
  { id: 'display_scratch', label: 'Display (Scratches)', group: 'Display' },
  { id: 'keyboard', label: 'Keyboard', group: 'Input' },
  { id: 'touchpad', label: 'Touchpad', group: 'Input' },
  { id: 'mic', label: 'Microphone', group: 'Audio' },
  { id: 'speaker', label: 'Speaker', group: 'Audio' },
  { id: 'battery', label: 'Battery Health', group: 'Power' },
  { id: 'ram', label: 'RAM', group: 'Hardware' },
  { id: 'ssd', label: 'SSD', group: 'Hardware' },
  { id: 'hdd', label: 'HDD', group: 'Hardware' },
  { id: 'fan', label: 'Fan / Cleanliness', group: 'Hardware' },
  { id: 'usb', label: 'USB Ports', group: 'Ports' },
  { id: 'hdmi', label: 'HDMI Port', group: 'Ports' },
  { id: 'lan', label: 'LAN Port', group: 'Ports' },
  { id: 'headphone', label: 'Headphone Jack', group: 'Ports' },
] as const

// Server inspection checklist — generic line items so the same template covers
// every server config (we don't enumerate per-component part numbers because
// each chassis ships with a different BOM).
export const SERVER_INSPECTION_CHECKLIST_ITEMS = [
  { id: 'chassis_top', label: 'Chassis Top Cover', group: 'Chassis' },
  { id: 'chassis_front', label: 'Front Bezel', group: 'Chassis' },
  { id: 'chassis_rails', label: 'Rack Rails / Mounts', group: 'Chassis' },
  { id: 'psu_primary', label: 'Power Supply 1', group: 'Power' },
  { id: 'psu_redundant', label: 'Power Supply 2 (Redundant)', group: 'Power' },
  { id: 'power_leds', label: 'Power / Status LEDs', group: 'Power' },
  { id: 'cpu_primary', label: 'CPU 1', group: 'Compute' },
  { id: 'cpu_secondary', label: 'CPU 2', group: 'Compute' },
  { id: 'memory_modules', label: 'Memory Modules (DIMMs)', group: 'Memory' },
  { id: 'memory_ecc', label: 'ECC Errors', group: 'Memory' },
  { id: 'storage_drives', label: 'Drive Bays / Drives Detected', group: 'Storage' },
  { id: 'storage_raid', label: 'RAID Controller', group: 'Storage' },
  { id: 'storage_backplane', label: 'Backplane', group: 'Storage' },
  { id: 'fans_front', label: 'Front Fans', group: 'Cooling' },
  { id: 'fans_rear', label: 'Rear Fans', group: 'Cooling' },
  { id: 'heatsinks', label: 'Heatsinks Seated', group: 'Cooling' },
  { id: 'nic_onboard', label: 'Onboard NIC', group: 'Networking' },
  { id: 'nic_addon', label: 'Add-on NIC', group: 'Networking' },
  { id: 'mgmt_iface', label: 'Management Port (iDRAC / iLO / IPMI)', group: 'Networking' },
  { id: 'usb_ports', label: 'USB Ports', group: 'Ports' },
  { id: 'vga_port', label: 'VGA / Display Port', group: 'Ports' },
  { id: 'serial_port', label: 'Serial Port', group: 'Ports' },
] as const

export type InspectionResult = 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'SCRAP'

export interface InspectionCheckItem {
  itemId: string
  result: InspectionResult
  notes?: string
}

export interface InspectionRecord {
  id: string
  deviceId: string
  deviceBarcode: string
  inspectedBy: string
  inspectedAt: string
  checklist: InspectionCheckItem[]
  requiresRepair: boolean
  requiresPaint: boolean
  requiresSpares: boolean
  repairType?: ('L2' | 'L3' | 'DISPLAY' | 'BATTERY')[]
  paintPanels?: ('TOP_COVER' | 'BOTTOM_COVER')[]
  spareParts?: string[]
  overallNotes?: string
}

