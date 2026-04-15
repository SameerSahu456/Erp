import type { CourierPartner } from '../types'

export const mockCourierPartners: CourierPartner[] = [
  {
    id: 'CP-001',
    name: 'Comprint Logistics',
    type: 'Own Vehicle',
    contactPerson: 'Raju Driver',
    phone: '9876543210',
  },
  {
    id: 'CP-002',
    name: 'Delhivery',
    type: 'Courier',
    contactPerson: 'Support',
    phone: '1800-123-456',
    trackingUrlPattern: 'https://track.delhivery.com/{tracking}',
  },
  {
    id: 'CP-003',
    name: 'Blue Dart',
    type: 'Courier',
    contactPerson: 'Hub Manager',
    phone: '1800-233-456',
    trackingUrlPattern: 'https://bluedart.com/track/{tracking}',
  },
  {
    id: 'CP-004',
    name: 'DTDC Express',
    type: 'Courier',
    contactPerson: 'Support',
    phone: '1800-111-456',
  },
  {
    id: 'CP-005',
    name: 'VRL Logistics',
    type: 'Transporter',
    contactPerson: 'Suresh K',
    phone: '9845123456',
  },
  {
    id: 'CP-006',
    name: 'Customer Pickup',
    type: 'Customer Pickup',
    contactPerson: '-',
    phone: '-',
  },
]
