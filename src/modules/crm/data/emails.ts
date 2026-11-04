// Demo data for the Emails tab (Outlook conversations). In the real ERP these
// rows come from the backend's Microsoft Graph integration; here they are
// seeded in memory so the flow can be walked through end-to-end.

export type EmailDirection = 'outbound' | 'inbound'

export interface EmailAttachment {
  name: string
  size: number
  kind: 'quote-pdf' | 'file'
}

export interface EmailMessage {
  id: string
  direction: EmailDirection
  fromName: string
  fromAddress: string
  to: string[]
  cc: string[]
  subject: string
  body: string
  attachments: EmailAttachment[]
  sentAt: string
  sentBy?: string
  read: boolean
}

export interface EmailThread {
  id: string
  entityType: 'lead' | 'deal'
  entityId: string
  quoteId?: string
  subject: string
  participants: string[]
  messages: EmailMessage[]
}

export const SHARED_MAILBOX = 'quotes@comprint.co.in'

export const seedEmailThreads: EmailThread[] = [
  {
    id: 'ETH-001',
    entityType: 'deal',
    entityId: 'DEAL-001',
    quoteId: 'QT-001',
    subject: 'Quotation QT-2026-001 from Comprint — Tata Consultancy Services',
    participants: ['rajesh.sharma@tcs.com'],
    messages: [
      {
        id: 'EML-001',
        direction: 'outbound',
        fromName: 'Amit Patel',
        fromAddress: SHARED_MAILBOX,
        to: ['rajesh.sharma@tcs.com'],
        cc: [],
        subject: 'Quotation QT-2026-001 from Comprint — Tata Consultancy Services',
        body: 'Dear Rajesh Sharma,\n\nThank you for your interest. Please find attached our quotation QT-2026-001 for the Pune data center upgrade.\n\nKindly review and reply to this email with any questions.\n\nBest regards,\nAmit Patel\nComprint',
        attachments: [{ name: 'Comprint — Quotation - TCS-QT-2026-001-v2.pdf', size: 131072, kind: 'quote-pdf' }],
        sentAt: '2026-02-16T09:30:00+05:30',
        sentBy: 'Amit Patel',
        read: true,
      },
      {
        id: 'EML-002',
        direction: 'inbound',
        fromName: 'Rajesh Sharma',
        fromAddress: 'rajesh.sharma@tcs.com',
        to: [SHARED_MAILBOX],
        cc: [],
        subject: 'RE: Quotation QT-2026-001 from Comprint — Tata Consultancy Services',
        body: 'Thanks Amit, the pricing works for us. Can you confirm delivery within 6 weeks of PO? Our PO draft is attached.',
        attachments: [{ name: 'PO-draft-4471.pdf', size: 48213, kind: 'file' }],
        sentAt: '2026-02-17T14:05:00+05:30',
        read: true,
      },
      {
        id: 'EML-003',
        direction: 'outbound',
        fromName: 'Amit Patel',
        fromAddress: SHARED_MAILBOX,
        to: ['rajesh.sharma@tcs.com'],
        cc: [],
        subject: 'RE: Quotation QT-2026-001 from Comprint — Tata Consultancy Services',
        body: 'Confirmed — delivery within 6 weeks of PO. Thanks for the draft, our team will revert on the PO terms today.',
        attachments: [],
        sentAt: '2026-02-17T16:40:00+05:30',
        sentBy: 'Amit Patel',
        read: true,
      },
    ],
  },
]
