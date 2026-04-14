import type { IMSCategory } from '@/modules/wms/types'

export const mockCategories: IMSCategory[] = [
  {
    id: 'cat-001',
    name: 'Laptops',
    partCount: 45,
    subcategories: [
      { id: 'cat-001-01', name: 'Business Laptops', parentId: 'cat-001', partCount: 22 },
      { id: 'cat-001-02', name: 'Gaming Laptops', parentId: 'cat-001', partCount: 12 },
      { id: 'cat-001-03', name: 'Ultrabooks', parentId: 'cat-001', partCount: 11 },
    ],
  },
  {
    id: 'cat-002',
    name: 'Desktops',
    partCount: 28,
    subcategories: [
      { id: 'cat-002-01', name: 'Tower PCs', parentId: 'cat-002', partCount: 18 },
      { id: 'cat-002-02', name: 'All-in-One', parentId: 'cat-002', partCount: 10 },
    ],
  },
  {
    id: 'cat-003',
    name: 'Servers',
    partCount: 15,
    subcategories: [
      { id: 'cat-003-01', name: 'Rack Servers', parentId: 'cat-003', partCount: 9 },
      { id: 'cat-003-02', name: 'Tower Servers', parentId: 'cat-003', partCount: 6 },
    ],
  },
  {
    id: 'cat-004',
    name: 'Storage',
    partCount: 12,
    subcategories: [
      { id: 'cat-004-01', name: 'NAS', parentId: 'cat-004', partCount: 7 },
      { id: 'cat-004-02', name: 'SAN', parentId: 'cat-004', partCount: 5 },
    ],
  },
  {
    id: 'cat-005',
    name: 'Networking',
    partCount: 18,
    subcategories: [
      { id: 'cat-005-01', name: 'Switches', parentId: 'cat-005', partCount: 10 },
      { id: 'cat-005-02', name: 'Firewalls', parentId: 'cat-005', partCount: 8 },
    ],
  },
  {
    id: 'cat-006',
    name: 'Monitors',
    partCount: 25,
  },
  {
    id: 'cat-007',
    name: 'Printers',
    partCount: 14,
  },
  {
    id: 'cat-008',
    name: 'UPS & Power',
    partCount: 8,
  },
]
