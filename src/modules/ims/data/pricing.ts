export interface PriceEntry {
  id: string
  partId: string
  partName: string
  sku: string
  categoryId: string
  categoryName: string
  oemId: string
  oemName: string
  variant: 'new' | 'refurbished'
  tag: string | null
  sellPrice: number
  currency: 'INR'
  updatedBy: string
  updatedAt: string
}

export const mockPricing: PriceEntry[] = [
  { id: 'price-001', partId: 'PART-001', partName: 'Dell Latitude 5540', sku: 'DL-LAT-5540', categoryId: 'cat-001', categoryName: 'Laptops', oemId: 'oem-001', oemName: 'Dell', variant: 'new', tag: null, sellPrice: 85000, currency: 'INR', updatedBy: 'Rahul Mehta', updatedAt: '2026-03-15T00:00:00Z' },
  { id: 'price-002', partId: 'PART-001', partName: 'Dell Latitude 5540', sku: 'DL-LAT-5540', categoryId: 'cat-001', categoryName: 'Laptops', oemId: 'oem-001', oemName: 'Dell', variant: 'new', tag: 'Box Pack', sellPrice: 89000, currency: 'INR', updatedBy: 'Rahul Mehta', updatedAt: '2026-03-15T00:00:00Z' },
  { id: 'price-003', partId: 'PART-001', partName: 'Dell Latitude 5540', sku: 'DL-LAT-5540', categoryId: 'cat-001', categoryName: 'Laptops', oemId: 'oem-001', oemName: 'Dell', variant: 'new', tag: 'NP', sellPrice: 72000, currency: 'INR', updatedBy: 'Sarah Khan', updatedAt: '2026-02-20T00:00:00Z' },
  { id: 'price-004', partId: 'PART-001', partName: 'Dell Latitude 5540', sku: 'DL-LAT-5540', categoryId: 'cat-001', categoryName: 'Laptops', oemId: 'oem-001', oemName: 'Dell', variant: 'refurbished', tag: null, sellPrice: 55000, currency: 'INR', updatedBy: 'Rahul Mehta', updatedAt: '2026-03-10T00:00:00Z' },
  { id: 'price-005', partId: 'PART-001', partName: 'Dell Latitude 5540', sku: 'DL-LAT-5540', categoryId: 'cat-001', categoryName: 'Laptops', oemId: 'oem-001', oemName: 'Dell', variant: 'refurbished', tag: 'NPL', sellPrice: 48000, currency: 'INR', updatedBy: 'Rahul Mehta', updatedAt: '2026-03-10T00:00:00Z' },
  { id: 'price-006', partId: 'PART-002', partName: 'HP EliteBook 860 G10', sku: 'HP-EB-860G10', categoryId: 'cat-001', categoryName: 'Laptops', oemId: 'oem-002', oemName: 'HP', variant: 'new', tag: null, sellPrice: 92000, currency: 'INR', updatedBy: 'Rahul Mehta', updatedAt: '2026-02-25T00:00:00Z' },
  { id: 'price-007', partId: 'PART-002', partName: 'HP EliteBook 860 G10', sku: 'HP-EB-860G10', categoryId: 'cat-001', categoryName: 'Laptops', oemId: 'oem-002', oemName: 'HP', variant: 'refurbished', tag: null, sellPrice: 62000, currency: 'INR', updatedBy: 'Rahul Mehta', updatedAt: '2026-02-25T00:00:00Z' },
  { id: 'price-008', partId: 'PART-003', partName: 'Dell PowerEdge R750', sku: 'DEL-SRV-R750', categoryId: 'cat-003', categoryName: 'Servers', oemId: 'oem-001', oemName: 'Dell', variant: 'new', tag: null, sellPrice: 385000, currency: 'INR', updatedBy: 'Vikram Singh', updatedAt: '2026-03-01T00:00:00Z' },
  { id: 'price-009', partId: 'PART-003', partName: 'Dell PowerEdge R750', sku: 'DEL-SRV-R750', categoryId: 'cat-003', categoryName: 'Servers', oemId: 'oem-001', oemName: 'Dell', variant: 'refurbished', tag: null, sellPrice: 245000, currency: 'INR', updatedBy: 'Priya Deshmukh', updatedAt: '2026-02-15T00:00:00Z' },
  { id: 'price-010', partId: 'PART-004', partName: 'Cisco Catalyst 9300-48P', sku: 'CISCO-C9300-48P', categoryId: 'cat-005', categoryName: 'Networking', oemId: 'oem-004', oemName: 'Cisco', variant: 'new', tag: null, sellPrice: 320000, currency: 'INR', updatedBy: 'Vikram Singh', updatedAt: '2026-03-05T00:00:00Z' },
  { id: 'price-011', partId: 'PART-004', partName: 'Cisco Catalyst 9300-48P', sku: 'CISCO-C9300-48P', categoryId: 'cat-005', categoryName: 'Networking', oemId: 'oem-004', oemName: 'Cisco', variant: 'refurbished', tag: null, sellPrice: 215000, currency: 'INR', updatedBy: 'Vikram Singh', updatedAt: '2026-02-28T00:00:00Z' },
  { id: 'price-012', partId: 'PART-005', partName: 'Samsung 870 EVO 512GB', sku: 'SAM-SSD-870EVO', categoryId: 'cat-004', categoryName: 'Storage', oemId: 'oem-005', oemName: 'Samsung', variant: 'new', tag: null, sellPrice: 4500, currency: 'INR', updatedBy: 'Priya Sharma', updatedAt: '2026-03-12T00:00:00Z' },
  { id: 'price-013', partId: 'PART-005', partName: 'Samsung 870 EVO 512GB', sku: 'SAM-SSD-870EVO', categoryId: 'cat-004', categoryName: 'Storage', oemId: 'oem-005', oemName: 'Samsung', variant: 'new', tag: 'NBI', sellPrice: 4200, currency: 'INR', updatedBy: 'Priya Sharma', updatedAt: '2026-03-12T00:00:00Z' },
  { id: 'price-014', partId: 'PART-006', partName: 'APC Smart-UPS 3000VA', sku: 'APC-UPS-3000', categoryId: 'cat-008', categoryName: 'UPS & Power', oemId: 'oem-009', oemName: 'APC', variant: 'new', tag: null, sellPrice: 48000, currency: 'INR', updatedBy: 'Rahul Mehta', updatedAt: '2026-02-18T00:00:00Z' },
  { id: 'price-015', partId: 'PART-006', partName: 'APC Smart-UPS 3000VA', sku: 'APC-UPS-3000', categoryId: 'cat-008', categoryName: 'UPS & Power', oemId: 'oem-009', oemName: 'APC', variant: 'refurbished', tag: null, sellPrice: 32000, currency: 'INR', updatedBy: 'Rahul Mehta', updatedAt: '2026-02-18T00:00:00Z' },
]
