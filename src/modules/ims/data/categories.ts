import type { IMSCategory } from '@/modules/wms/types'

export const mockCategories: IMSCategory[] = [
  {
    id: 'cat-001',
    name: 'Laptops',
    partCount: 45,
    subcategories: [
      {
        id: 'cat-001-01',
        name: 'Business Laptops',
        parentId: 'cat-001',
        partCount: 20,
        subcategories: [
          { id: 'cat-001-01-01', name: 'Dell Latitude Series', parentId: 'cat-001-01', partCount: 8 },
          { id: 'cat-001-01-02', name: 'HP EliteBook Series', parentId: 'cat-001-01', partCount: 7 },
          { id: 'cat-001-01-03', name: 'Lenovo ThinkPad Series', parentId: 'cat-001-01', partCount: 5 },
        ],
      },
      {
        id: 'cat-001-02',
        name: 'Gaming Laptops',
        parentId: 'cat-001',
        partCount: 10,
        subcategories: [
          { id: 'cat-001-02-01', name: 'ASUS ROG Series', parentId: 'cat-001-02', partCount: 5 },
          { id: 'cat-001-02-02', name: 'MSI Series', parentId: 'cat-001-02', partCount: 5 },
        ],
      },
      {
        id: 'cat-001-03',
        name: 'Ultrabooks',
        parentId: 'cat-001',
        partCount: 15,
        subcategories: [
          { id: 'cat-001-03-01', name: 'Dell XPS Series', parentId: 'cat-001-03', partCount: 5 },
          { id: 'cat-001-03-02', name: 'Apple MacBook Series', parentId: 'cat-001-03', partCount: 5 },
          { id: 'cat-001-03-03', name: 'Lenovo Yoga Series', parentId: 'cat-001-03', partCount: 5 },
        ],
      },
    ],
  },
  {
    id: 'cat-002',
    name: 'Desktops',
    partCount: 20,
    subcategories: [
      {
        id: 'cat-002-01',
        name: 'Tower PCs',
        parentId: 'cat-002',
        partCount: 12,
        subcategories: [
          { id: 'cat-002-01-01', name: 'Dell OptiPlex Series', parentId: 'cat-002-01', partCount: 6 },
          { id: 'cat-002-01-02', name: 'HP ProDesk Series', parentId: 'cat-002-01', partCount: 6 },
        ],
      },
      {
        id: 'cat-002-02',
        name: 'All-in-One',
        parentId: 'cat-002',
        partCount: 8,
        subcategories: [
          { id: 'cat-002-02-01', name: 'HP EliteOne Series', parentId: 'cat-002-02', partCount: 4 },
          { id: 'cat-002-02-02', name: 'Lenovo IdeaCentre', parentId: 'cat-002-02', partCount: 4 },
        ],
      },
    ],
  },
  {
    id: 'cat-003',
    name: 'Servers',
    partCount: 25,
    subcategories: [
      {
        id: 'cat-003-01',
        name: 'Rack Servers',
        parentId: 'cat-003',
        partCount: 15,
        subcategories: [
          { id: 'cat-003-01-01', name: 'Dell PowerEdge R-Series', parentId: 'cat-003-01', partCount: 8 },
          { id: 'cat-003-01-02', name: 'HP ProLiant DL-Series', parentId: 'cat-003-01', partCount: 7 },
        ],
      },
      {
        id: 'cat-003-02',
        name: 'Tower Servers',
        parentId: 'cat-003',
        partCount: 10,
        subcategories: [
          { id: 'cat-003-02-01', name: 'Dell PowerEdge T-Series', parentId: 'cat-003-02', partCount: 5 },
          { id: 'cat-003-02-02', name: 'HP ProLiant ML-Series', parentId: 'cat-003-02', partCount: 5 },
        ],
      },
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
