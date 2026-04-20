// Server BOM Catalog — hierarchical component catalog for datacenter quotes

export interface CatalogItem {
  sku: string
  name: string
  cost: number
  price: number
  qty: number
  condition: 'new' | 'refurb'
  desc?: string
  socket?: string
  memGen?: string
  bay?: string
  specs?: Record<string, string>
}

export interface BOMSection {
  key: string
  label: string
  required?: boolean
  perServer?: boolean
}

export const SERVER_CATALOG: Record<string, CatalogItem[]> = {
  servers: [
    { sku: 'SRV-R740-2U', name: 'Dell PowerEdge R740 · 2U Rack', cost: 185000, price: 245000, qty: 1, desc: '2U · dual socket · 24 DIMM slots', socket: 'LGA4677', memGen: 'DDR5', bay: 'NVMe/SAS', condition: 'new' },
    { sku: 'SRV-R740-2U-R', name: 'Dell PowerEdge R740 · Refurbished', cost: 98000, price: 138000, qty: 1, desc: '2U · dual socket · OEM refurbished · 1yr warranty', socket: 'LGA4677', memGen: 'DDR5', bay: 'NVMe/SAS', condition: 'refurb' },
    { sku: 'SRV-R640-1U', name: 'Dell PowerEdge R640 · 1U Rack', cost: 142000, price: 189000, qty: 1, desc: '1U · dual socket · 24 DIMM slots', socket: 'LGA4677', memGen: 'DDR5', bay: 'NVMe/SAS', condition: 'new' },
    { sku: 'SRV-HPE-DL380', name: 'HPE ProLiant DL380 Gen11', cost: 198000, price: 268000, qty: 1, desc: '2U · dual Xeon · 8 NVMe bays', socket: 'LGA4677', memGen: 'DDR5', bay: 'NVMe/SAS', condition: 'new' },
    { sku: 'SRV-HPE-DL380-R', name: 'HPE ProLiant DL380 Gen10 · Refurbished', cost: 94000, price: 134000, qty: 1, desc: '2U · OEM refurbished · tested · 1yr warranty', socket: 'LGA4677', memGen: 'DDR5', bay: 'NVMe/SAS', condition: 'refurb' },
    { sku: 'SRV-BL-M750', name: 'HPE Synergy 480 Blade', cost: 165000, price: 224000, qty: 1, desc: 'Full-height blade · Xeon Scalable', socket: 'LGA4677', memGen: 'DDR5', bay: 'NVMe', condition: 'new' },
  ],
  cpu: [
    { sku: 'CPU-GOLD-6430', name: 'Intel Xeon Gold 6430', cost: 142000, price: 188000, qty: 2, condition: 'new', specs: { cores: '32C/64T', clock: '2.1 GHz', tdp: '270W', socket: 'LGA4677' } },
    { sku: 'CPU-GOLD-6430-R', name: 'Intel Xeon Gold 6430 · Refurbished', cost: 88000, price: 124000, qty: 2, condition: 'refurb', specs: { cores: '32C/64T', clock: '2.1 GHz', tdp: '270W', socket: 'LGA4677' } },
    { sku: 'CPU-GOLD-6448Y', name: 'Intel Xeon Gold 6448Y', cost: 168000, price: 224000, qty: 2, condition: 'new', specs: { cores: '32C/64T', clock: '2.1 GHz', tdp: '225W', socket: 'LGA4677' } },
    { sku: 'CPU-SIL-4410', name: 'Intel Xeon Silver 4410Y', cost: 68000, price: 94000, qty: 2, condition: 'new', specs: { cores: '12C/24T', clock: '2.0 GHz', tdp: '150W', socket: 'LGA4677' } },
    { sku: 'CPU-SIL-4410-R', name: 'Intel Xeon Silver 4410Y · Refurbished', cost: 42000, price: 58000, qty: 2, condition: 'refurb', specs: { cores: '12C/24T', clock: '2.0 GHz', tdp: '150W', socket: 'LGA4677' } },
    { sku: 'CPU-SIL-4416', name: 'Intel Xeon Silver 4416+', cost: 82000, price: 112000, qty: 2, condition: 'new', specs: { cores: '20C/40T', clock: '2.0 GHz', tdp: '165W', socket: 'LGA4677' } },
    { sku: 'CPU-PLAT-8468', name: 'Intel Xeon Platinum 8468', cost: 285000, price: 368000, qty: 2, condition: 'new', specs: { cores: '48C/96T', clock: '2.1 GHz', tdp: '350W', socket: 'LGA4677' } },
    { sku: 'CPU-EPYC-9354', name: 'AMD EPYC 9354', cost: 156000, price: 212000, qty: 2, condition: 'new', specs: { cores: '32C/64T', clock: '3.25 GHz', tdp: '280W', socket: 'SP5' } },
  ],
  ram: [
    { sku: 'RAM-128G-4800', name: '128GB DDR5-4800 ECC RDIMM', cost: 38500, price: 51200, qty: 8, condition: 'new', specs: { cap: '128 GB', speed: '4800 MT/s', gen: 'DDR5' } },
    { sku: 'RAM-64G-4800', name: '64GB DDR5-4800 ECC RDIMM', cost: 18500, price: 24800, qty: 8, condition: 'new', specs: { cap: '64 GB', speed: '4800 MT/s', gen: 'DDR5' } },
    { sku: 'RAM-64G-4800-R', name: '64GB DDR5-4800 ECC · Refurbished', cost: 11200, price: 15400, qty: 8, condition: 'refurb', specs: { cap: '64 GB', speed: '4800 MT/s', gen: 'DDR5' } },
    { sku: 'RAM-32G-4800', name: '32GB DDR5-4800 ECC RDIMM', cost: 9800, price: 13200, qty: 16, condition: 'new', specs: { cap: '32 GB', speed: '4800 MT/s', gen: 'DDR5' } },
    { sku: 'RAM-16G-4800', name: '16GB DDR5-4800 ECC RDIMM', cost: 5400, price: 7200, qty: 16, condition: 'new', specs: { cap: '16 GB', speed: '4800 MT/s', gen: 'DDR5' } },
  ],
  storage: [
    { sku: 'SSD-NVME-7.68', name: '7.68TB NVMe Gen4 Enterprise SSD', cost: 62000, price: 84800, qty: 4, condition: 'new', specs: { cap: '7.68 TB', iface: 'NVMe Gen4', endur: '3 DWPD' } },
    { sku: 'SSD-NVME-3.84', name: '3.84TB NVMe Gen4 Enterprise SSD', cost: 32000, price: 44800, qty: 4, condition: 'new', specs: { cap: '3.84 TB', iface: 'NVMe Gen4', endur: '3 DWPD' } },
    { sku: 'SSD-NVME-3.84-R', name: '3.84TB NVMe Gen4 · Refurbished', cost: 19000, price: 27400, qty: 4, condition: 'refurb', specs: { cap: '3.84 TB', iface: 'NVMe Gen4', endur: '2 DWPD' } },
    { sku: 'SSD-NVME-1.92', name: '1.92TB NVMe Gen4 Enterprise SSD', cost: 18800, price: 26400, qty: 4, condition: 'new', specs: { cap: '1.92 TB', iface: 'NVMe Gen4', endur: '3 DWPD' } },
    { sku: 'SSD-SAS-1.92', name: '1.92TB SAS SSD RI', cost: 18500, price: 26000, qty: 4, condition: 'new', specs: { cap: '1.92 TB', iface: 'SAS 12G', endur: '1 DWPD' } },
    { sku: 'HDD-SAS-18T', name: '18TB SAS 7.2K Nearline', cost: 24800, price: 32400, qty: 2, condition: 'new', specs: { cap: '18 TB', iface: 'SAS 12G', endur: 'Nearline' } },
    { sku: 'HDD-SAS-18T-R', name: '18TB SAS · Refurbished (Tested)', cost: 14200, price: 19600, qty: 2, condition: 'refurb', specs: { cap: '18 TB', iface: 'SAS 12G', endur: 'Nearline' } },
  ],
  network: [
    { sku: 'NIC-10G-DP', name: 'Intel X710 10GbE Dual Port', cost: 24000, price: 32500, qty: 1, condition: 'new', specs: { speed: '10 GbE', ports: '2×SFP+' } },
    { sku: 'NIC-25G-DP', name: 'Mellanox ConnectX-6 25GbE Dual Port', cost: 42000, price: 56500, qty: 1, condition: 'new', specs: { speed: '25 GbE', ports: '2×SFP28' } },
    { sku: 'NIC-25G-DP-R', name: 'Mellanox ConnectX-6 25GbE · Refurbished', cost: 24500, price: 34000, qty: 1, condition: 'refurb', specs: { speed: '25 GbE', ports: '2×SFP28' } },
    { sku: 'NIC-100G-QP', name: 'NVIDIA ConnectX-7 100GbE QSFP', cost: 128000, price: 168000, qty: 1, condition: 'new', specs: { speed: '100 GbE', ports: '2×QSFP28' } },
  ],
  power: [
    { sku: 'PSU-800-PLAT', name: '800W Platinum PSU (Redundant)', cost: 11500, price: 15800, qty: 2, condition: 'new', specs: { watts: '800W', rating: '80+ Platinum' } },
    { sku: 'PSU-1100-PLAT', name: '1100W Platinum PSU (Redundant)', cost: 14500, price: 19800, qty: 2, condition: 'new', specs: { watts: '1100W', rating: '80+ Platinum' } },
    { sku: 'PSU-1600-TIT', name: '1600W Titanium PSU (Redundant)', cost: 19800, price: 26400, qty: 2, condition: 'new', specs: { watts: '1600W', rating: '80+ Titanium' } },
  ],
  services: [
    { sku: 'SVC-INST', name: 'On-site installation & commissioning', cost: 35000, price: 68000, qty: 1, condition: 'new' },
    { sku: 'SVC-AMC-3Y', name: '3-Year Comprehensive AMC (24×7 NBD)', cost: 82000, price: 148000, qty: 1, condition: 'new' },
    { sku: 'SVC-MIGRATION', name: 'Data migration services (per TB)', cost: 1200, price: 2400, qty: 10, condition: 'new' },
  ],
  rack: [
    { sku: 'RACK-42U', name: '42U Server Rack (800×1200)', cost: 48000, price: 72000, qty: 1, condition: 'new' },
    { sku: 'PDU-32A-MON', name: '32A Monitored PDU (Dual Feed)', cost: 28000, price: 42000, qty: 2, condition: 'new' },
  ],
  network_sw: [
    { sku: 'SW-ARUBA-6300', name: 'Aruba CX 6300M 48-port 1/10G', cost: 285000, price: 382000, qty: 1, condition: 'new' },
    { sku: 'SW-ARUBA-6300-R', name: 'Aruba CX 6300M · Refurbished', cost: 148000, price: 212000, qty: 1, condition: 'refurb' },
    { sku: 'SW-MIKRO-CRS', name: 'MikroTik CRS326 24-port Gig', cost: 38000, price: 54000, qty: 1, condition: 'new' },
  ],
}

export const BOM_SECTIONS: BOMSection[] = [
  { key: 'servers', label: 'Compute (Servers & Blades)', required: true },
  { key: 'cpu', label: 'CPU', required: true, perServer: true },
  { key: 'ram', label: 'Memory (RAM)', required: true, perServer: true },
  { key: 'storage', label: 'Storage', required: true, perServer: true },
  { key: 'network', label: 'Network Cards', perServer: true },
  { key: 'power', label: 'Power Supplies', perServer: true },
  { key: 'network_sw', label: 'Switching / Network' },
  { key: 'rack', label: 'Rack & Power Distribution' },
  { key: 'services', label: 'Services & AMC' },
]

export function fmtINR(n: number): string {
  return '₹' + new Intl.NumberFormat('en-IN').format(n)
}

export function marginPct(cost: number, price: number): number {
  if (!price) return 0
  return Math.round(((price - cost) / price) * 100)
}

export function marginClass(pct: number): string {
  if (pct >= 30) return 'hi'
  if (pct >= 18) return 'mid'
  return 'lo'
}

export function stockFor(sku: string): number {
  if (!sku) return 0
  let h = 0
  for (let i = 0; i < sku.length; i++) {
    h = ((h << 5) - h + sku.charCodeAt(i)) | 0
  }
  h = Math.abs(h)
  if (sku.startsWith('SVC-')) return 999
  if (h % 13 === 0) return 0
  return (h % 42) + 2
}

export function sectionForSku(sku: string): string {
  for (const [key, items] of Object.entries(SERVER_CATALOG)) {
    if (items.find((x) => x.sku === sku)) return key
  }
  return 'services'
}
