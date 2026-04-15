import type { RelatedPart } from '@/modules/wms/types'

export const mockRelatedParts: RelatedPart[] = [
  // Dell Latitude 5540 replacements
  {
    id: 'RP-001',
    partId: 'PART-001',        // Dell Latitude 5540
    relatedPartId: 'PART-002', // HP EliteBook 840 G8
    relationType: 'ALTERNATIVE',
    notes: 'Same segment 14" business laptop, similar specs',
    priority: 1,
    isActive: true,
  },
  {
    id: 'RP-002',
    partId: 'PART-001',        // Dell Latitude 5540
    relatedPartId: 'PART-003', // Lenovo ThinkPad T14 Gen 4
    relationType: 'ALTERNATIVE',
    notes: 'Same segment 14" business laptop, AMD platform',
    priority: 2,
    isActive: true,
  },
  {
    id: 'RP-003',
    partId: 'PART-001',        // Dell Latitude 5540
    relatedPartId: 'PART-017', // Lenovo X1 Carbon
    relationType: 'UPGRADE',
    notes: 'Premium ultrabook upgrade path',
    priority: 3,
    isActive: true,
  },
  {
    id: 'RP-004',
    partId: 'PART-001',        // Dell Latitude 5540
    relatedPartId: 'PART-018', // HP ProBook 450 G9
    relationType: 'DOWNGRADE',
    notes: 'Budget alternative, 15.6" form factor',
    priority: 4,
    isActive: true,
  },
  // HP EliteBook 840 G8 replacements
  {
    id: 'RP-005',
    partId: 'PART-002',
    relatedPartId: 'PART-001',
    relationType: 'ALTERNATIVE',
    notes: 'Dell equivalent in same segment',
    priority: 1,
    isActive: true,
  },
  {
    id: 'RP-006',
    partId: 'PART-002',
    relatedPartId: 'PART-003',
    relationType: 'ALTERNATIVE',
    notes: 'Lenovo equivalent in same segment',
    priority: 2,
    isActive: true,
  },
  // Dell PowerEdge R750xs replacements
  {
    id: 'RP-007',
    partId: 'PART-007',        // Dell R750xs
    relatedPartId: 'PART-009', // HP DL380 Gen10+
    relationType: 'ALTERNATIVE',
    notes: 'HP equivalent 2U rack server',
    priority: 1,
    isActive: true,
  },
  {
    id: 'RP-008',
    partId: 'PART-007',        // Dell R750xs
    relatedPartId: 'PART-008', // Dell R650xs
    relationType: 'DOWNGRADE',
    notes: '1U version, lower spec but same Dell platform',
    priority: 2,
    isActive: true,
  },
  // Dell R650xs ↔ R750xs
  {
    id: 'RP-009',
    partId: 'PART-008',
    relatedPartId: 'PART-007',
    relationType: 'UPGRADE',
    notes: '2U version with more expansion slots',
    priority: 1,
    isActive: true,
  },
  // Dell OptiPlex ↔ HP ProDesk
  {
    id: 'RP-010',
    partId: 'PART-005',        // Dell OptiPlex 7010
    relatedPartId: 'PART-006', // HP ProDesk 400 G9
    relationType: 'ALTERNATIVE',
    notes: 'HP equivalent desktop, lower spec but compatible',
    priority: 1,
    isActive: true,
  },
  {
    id: 'RP-011',
    partId: 'PART-006',
    relatedPartId: 'PART-005',
    relationType: 'UPGRADE',
    notes: 'Dell higher-spec desktop alternative',
    priority: 1,
    isActive: true,
  },
  // Monitors
  {
    id: 'RP-012',
    partId: 'PART-014',        // Dell P2422H 24"
    relatedPartId: 'PART-015', // Dell U2723QE 27"
    relationType: 'UPGRADE',
    notes: '4K upgrade option',
    priority: 1,
    isActive: true,
  },
  {
    id: 'RP-013',
    partId: 'PART-015',
    relatedPartId: 'PART-014',
    relationType: 'DOWNGRADE',
    notes: 'FHD budget option',
    priority: 1,
    isActive: true,
  },
  // Switches
  {
    id: 'RP-014',
    partId: 'PART-012',        // Cisco 9200L
    relatedPartId: 'PART-020', // Cisco 9300
    relationType: 'UPGRADE',
    notes: 'Higher-tier Catalyst switch for distribution layer',
    priority: 1,
    isActive: true,
  },
  // Servers ↔ compatible accessories
  {
    id: 'RP-015',
    partId: 'PART-007',        // Dell R750xs
    relatedPartId: 'PART-016', // APC UPS
    relationType: 'COMPATIBLE',
    notes: 'Recommended UPS for rack server deployments',
    priority: 1,
    isActive: true,
  },
]
