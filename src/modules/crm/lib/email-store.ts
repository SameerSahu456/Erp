// In-memory store for the demo Emails tab. Mirrors what the real ERP keeps in
// quote_email_threads / quote_email_messages. State lives for the browser
// session; every page that shows a conversation subscribes through
// useEmailThreads so a send on the quote page shows up on the deal page too.

import { useSyncExternalStore } from 'react'
import {
  SHARED_MAILBOX,
  seedEmailThreads,
  type EmailAttachment,
  type EmailThread,
} from '../data/emails'

let threads: EmailThread[] = seedEmailThreads
const listeners = new Set<() => void>()
let counter = 100

function emit() {
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function nextId(prefix: string) {
  counter += 1
  return `${prefix}-${counter}`
}

export function useEmailThreads(): EmailThread[] {
  return useSyncExternalStore(subscribe, () => threads, () => threads)
}

export interface SendEmailInput {
  entityType: 'lead' | 'deal'
  entityId: string
  quoteId?: string
  to: string[]
  cc: string[]
  subject: string
  body: string
  attachments: EmailAttachment[]
  senderName: string
}

export function sendEmail(input: SendEmailInput): EmailThread {
  const now = new Date().toISOString()
  const thread: EmailThread = {
    id: nextId('ETH'),
    entityType: input.entityType,
    entityId: input.entityId,
    quoteId: input.quoteId,
    subject: input.subject,
    participants: [...input.to, ...input.cc],
    messages: [
      {
        id: nextId('EML'),
        direction: 'outbound',
        fromName: input.senderName,
        fromAddress: SHARED_MAILBOX,
        to: input.to,
        cc: input.cc,
        subject: input.subject,
        body: input.body,
        attachments: input.attachments,
        sentAt: now,
        sentBy: input.senderName,
        read: true,
      },
    ],
  }
  threads = [thread, ...threads]
  emit()
  return thread
}

export interface ReplyInput {
  body: string
  attachments: EmailAttachment[]
  senderName: string
}

export function replyToThread(threadId: string, input: ReplyInput): void {
  threads = threads.map((t) => {
    if (t.id !== threadId) return t
    const subject = t.subject.toLowerCase().startsWith('re:') ? t.subject : `RE: ${t.subject}`
    return {
      ...t,
      messages: [
        ...t.messages,
        {
          id: nextId('EML'),
          direction: 'outbound',
          fromName: input.senderName,
          fromAddress: SHARED_MAILBOX,
          to: t.participants,
          cc: [],
          subject,
          body: input.body,
          attachments: input.attachments,
          sentAt: new Date().toISOString(),
          sentBy: input.senderName,
          read: true,
        },
      ],
    }
  })
  emit()
}

const CANNED_REPLIES = [
  'Thanks for the details. The pricing looks fine — can you confirm the delivery timeline?',
  'Received, thank you. We will review internally and revert by Friday.',
  'Could you share the warranty terms for the servers as well?',
]

// Stands in for the backend's inbox sync: every thread in scope whose last
// message went out gets one customer reply. Returns how many arrived.
export function checkForReplies(predicate: (t: EmailThread) => boolean, contactName: string): number {
  let created = 0
  threads = threads.map((t) => {
    if (!predicate(t)) return t
    const last = t.messages[t.messages.length - 1]
    if (!last || last.direction !== 'outbound') return t
    created += 1
    const subject = t.subject.toLowerCase().startsWith('re:') ? t.subject : `RE: ${t.subject}`
    return {
      ...t,
      messages: [
        ...t.messages,
        {
          id: nextId('EML'),
          direction: 'inbound',
          fromName: contactName,
          fromAddress: t.participants[0] ?? 'customer@example.com',
          to: [SHARED_MAILBOX],
          cc: [],
          subject,
          body: CANNED_REPLIES[(created - 1) % CANNED_REPLIES.length] ?? 'Thanks for the details, we will revert shortly.',
          attachments: [],
          sentAt: new Date().toISOString(),
          read: false,
        },
      ],
    }
  })
  if (created > 0) emit()
  return created
}

export function markThreadRead(threadId: string): void {
  let changed = false
  threads = threads.map((t) => {
    if (t.id !== threadId || t.messages.every((m) => m.read)) return t
    changed = true
    return { ...t, messages: t.messages.map((m) => ({ ...m, read: true })) }
  })
  if (changed) emit()
}
