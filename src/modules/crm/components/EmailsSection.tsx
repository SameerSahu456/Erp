import { useEffect, useRef, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, FileText, Mail, Paperclip, RefreshCw, Send, X } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'

import { SHARED_MAILBOX, type EmailAttachment, type EmailMessage, type EmailThread } from '../data/emails'
import { checkForReplies, markThreadRead, replyToThread, sendEmail, useEmailThreads } from '../lib/email-store'
import type { Quote } from '../types'

// Emails tab / panel: Outlook conversations about a lead, deal or quote.
// Demo-only — sends and replies are stored in memory (see lib/email-store),
// "Check for replies" simulates the customer answering.
//
// Mirrors the production feature: compose pre-filled from the record's
// contact, attach any of the record's quotes as PDFs plus uploaded files,
// threads with sent / received messages, and a reply box per thread.

export interface EmailsSectionProps {
  entityType: 'lead' | 'deal'
  entityId: string
  /** Quote page: only this quote's threads; new emails are anchored to it. */
  quoteId?: string
  contact?: { name: string; email: string }
  accountName?: string
  quoteOptions: Quote[]
  /** Controlled compose dialog (header button on the quote page). */
  composeOpen?: boolean
  onComposeOpenChange?: (open: boolean) => void
  className?: string
}

const MAX_FILE_BYTES = 3 * 1024 * 1024
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function splitAddresses(raw: string): string[] {
  const out: string[] = []
  for (const part of raw.split(/[,;\n]/)) {
    const a = part.trim().toLowerCase()
    if (a && !out.includes(a)) out.push(a)
  }
  return out
}

function quotePdfAttachment(q: Quote): EmailAttachment {
  return { name: `Comprint — Quotation - ${q.accountName}-${q.quoteNumber}-v${q.version}.pdf`, size: 131072, kind: 'quote-pdf' }
}

function AttachmentChips({ items, onRemove }: { items: EmailAttachment[]; onRemove?: (idx: number) => void }) {
  if (items.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((a, idx) => (
        <li key={`${a.name}-${idx}`} className="flex min-w-0 max-w-full items-center gap-1.5 rounded-md border border-input bg-muted/40 py-1 pl-2 pr-1 text-xs">
          {a.kind === 'quote-pdf' ? <FileText className="size-3.5 shrink-0 text-primary" /> : <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />}
          <span className="min-w-0 truncate">{a.name}</span>
          <span className="shrink-0 text-muted-foreground">{formatSize(a.size)}</span>
          {onRemove ? (
            <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remove ${a.name}`} onClick={() => onRemove(idx)}>
              <X className="size-3" />
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

interface AttachmentControlsProps {
  quoteOptions: Quote[]
  selectedQuoteIds: string[]
  onQuoteToggle: (id: string, checked: boolean) => void
  files: EmailAttachment[]
  onFilesChange: (files: EmailAttachment[]) => void
  disabled?: boolean
}

function AttachmentControls({ quoteOptions, selectedQuoteIds, onQuoteToggle, files, onFilesChange, disabled }: AttachmentControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const offered = quoteOptions.filter((q) => q.status !== 'Rejected' && q.status !== 'Expired')

  function handlePick(list: FileList | null) {
    if (!list) return
    const next = [...files]
    for (const f of Array.from(list)) {
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`${f.name} is larger than 3 MB`)
        continue
      }
      if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push({ name: f.name, size: f.size, kind: 'file' })
    }
    onFilesChange(next)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      {offered.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Attach quote PDFs</p>
          <ul className="space-y-1.5">
            {offered.map((q) => (
              <li key={q.id}>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={selectedQuoteIds.includes(q.id)} onCheckedChange={(v) => onQuoteToggle(q.id, v === true)} disabled={disabled} />
                  <span className="min-w-0 truncate">{q.quoteNumber} · v{q.version} · {q.status}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={disabled}>
            <Paperclip className="size-4" />
            Attach files
          </Button>
          <span className="text-xs text-muted-foreground">Up to 3 MB per file.</span>
          <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handlePick(e.target.files)} disabled={disabled} />
        </div>
        <AttachmentChips items={files} onRemove={(idx) => onFilesChange(files.filter((_, i) => i !== idx))} />
      </div>
    </div>
  )
}

export function EmailsSection({
  entityType,
  entityId,
  quoteId,
  contact,
  accountName,
  quoteOptions,
  composeOpen,
  onComposeOpenChange,
  className,
}: EmailsSectionProps) {
  const { user } = useAuth()
  const allThreads = useEmailThreads()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = composeOpen ?? internalOpen
  const setOpen = onComposeOpenChange ?? setInternalOpen

  const inScope = (t: EmailThread) =>
    quoteId ? t.quoteId === quoteId : t.entityType === entityType && t.entityId === entityId
  const threads = allThreads.filter(inScope)
  const anchorQuote = quoteId ? quoteOptions.find((q) => q.id === quoteId) : undefined

  function handleCheckReplies() {
    const created = checkForReplies(inScope, contact?.name ?? 'Customer')
    toast.success(created === 0 ? 'No new replies' : `${created} new ${created === 1 ? 'reply' : 'replies'}`)
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="size-4 shrink-0" />
            Emails
          </CardTitle>
          <p className="text-sm text-muted-foreground">Conversation with the customer about this {quoteId ? 'quote' : entityType}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCheckReplies}>
            <RefreshCw className="size-4" />
            Check for replies
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Mail className="size-4" />
            Send by Email
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
              <Mail className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No emails yet</p>
            <p className="text-sm text-muted-foreground">Send the {quoteId ? 'quote' : 'first email'} and every reply will show up here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {threads.map((t) => (
              <ThreadView key={t.id} thread={t} quoteOptions={quoteOptions} senderName={user.name} />
            ))}
          </div>
        )}
      </CardContent>
      <ComposeDialog
        open={open}
        onOpenChange={setOpen}
        entityType={entityType}
        entityId={entityId}
        anchorQuote={anchorQuote}
        contact={contact}
        accountName={accountName}
        quoteOptions={quoteOptions}
        senderName={user.name}
      />
    </Card>
  )
}

interface ComposeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: 'lead' | 'deal'
  entityId: string
  anchorQuote?: Quote
  contact?: { name: string; email: string }
  accountName?: string
  quoteOptions: Quote[]
  senderName: string
}

function ComposeDialog({ open, onOpenChange, entityType, entityId, anchorQuote, contact, accountName, quoteOptions, senderName }: ComposeDialogProps) {
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [quoteIds, setQuoteIds] = useState<string[]>([])
  const [files, setFiles] = useState<EmailAttachment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [seeded, setSeeded] = useState(false)

  // Pre-fill from the record's contact each time the dialog opens.
  if (open && !seeded) {
    setSeeded(true)
    setError(null)
    setTo(contact?.email ?? '')
    setCc('')
    const label = accountName ? ` — ${accountName}` : ''
    setSubject(anchorQuote ? `Quotation ${anchorQuote.quoteNumber} from Comprint${label}` : `Comprint${label}`)
    setBody(
      `Dear ${contact?.name ?? 'Sir/Madam'},\n\n` +
        (anchorQuote
          ? `Thank you for your interest. Please find attached our quotation ${anchorQuote.quoteNumber}${accountName ? ` for ${accountName}` : ''}.\n\nKindly review the attached document and reply to this email with any questions or to confirm — we will get back to you promptly.`
          : `Thank you for your interest${accountName ? ` for ${accountName}` : ''}. Please find the details attached.\n\nReply to this email with any questions — we will get back to you promptly.`) +
        `\n\nBest regards,\n${senderName}\nComprint`,
    )
    setQuoteIds(anchorQuote ? [anchorQuote.id] : [])
    setFiles([])
  }
  if (!open && seeded) setSeeded(false)

  function handleSend() {
    const toList = splitAddresses(to)
    const ccList = splitAddresses(cc)
    if (toList.length === 0) return setError('Add at least one recipient')
    const bad = [...toList, ...ccList].find((a) => !EMAIL_RE.test(a))
    if (bad) return setError(`“${bad}” is not a valid email address`)
    if (!subject.trim()) return setError('Subject is required')
    if (!body.trim()) return setError('Write a message before sending')
    const attachments: EmailAttachment[] = [
      ...quoteOptions.filter((q) => quoteIds.includes(q.id)).map(quotePdfAttachment),
      ...files,
    ]
    sendEmail({
      entityType,
      entityId,
      quoteId: anchorQuote?.id ?? quoteIds[0],
      to: toList,
      cc: ccList,
      subject: subject.trim(),
      body,
      attachments,
      senderName,
    })
    toast.success(`Email sent to ${toList.join(', ')}`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{anchorQuote ? `Email ${anchorQuote.quoteNumber}` : 'New email'}</DialogTitle>
          <DialogDescription>
            {anchorQuote ? 'The quote PDF is attached and customer replies appear on this quote.' : 'Attach quote PDFs or files. Customer replies appear on this record.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email-to">To</Label>
            <Input id="email-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="customer@example.com, another@example.com" />
            <p className="text-xs text-muted-foreground">Separate several addresses with commas.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-cc">Cc</Label>
            <Input id="email-cc" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="customer@example.com, another@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-subject">Subject</Label>
            <Input id="email-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-body">Message</Label>
            <Textarea id="email-body" value={body} onChange={(e) => setBody(e.target.value)} rows={9} />
          </div>
          <AttachmentControls
            quoteOptions={quoteOptions}
            selectedQuoteIds={quoteIds}
            onQuoteToggle={(id, checked) => setQuoteIds((s) => (checked ? [...s, id] : s.filter((x) => x !== id)))}
            files={files}
            onFilesChange={setFiles}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="text-right text-xs text-muted-foreground">
            <div>Sent from {SHARED_MAILBOX}</div>
            <div>Replies go to {SHARED_MAILBOX}</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend}>
            <Send className="size-4" />
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ThreadView({ thread, quoteOptions, senderName }: { thread: EmailThread; quoteOptions: Quote[]; senderName: string }) {
  const [reply, setReply] = useState('')
  const [quoteIds, setQuoteIds] = useState<string[]>([])
  const [files, setFiles] = useState<EmailAttachment[]>([])
  const [error, setError] = useState<string | null>(null)
  const unread = thread.messages.filter((m) => m.direction === 'inbound' && !m.read).length

  // Opening the page counts as reading the thread (after the badge paints).
  useEffect(() => {
    if (unread === 0) return
    const t = window.setTimeout(() => markThreadRead(thread.id), 1500)
    return () => window.clearTimeout(t)
  }, [unread, thread.id])

  function handleReply() {
    if (!reply.trim()) return setError('Write a reply before sending')
    setError(null)
    replyToThread(thread.id, {
      body: reply,
      attachments: [...quoteOptions.filter((q) => quoteIds.includes(q.id)).map(quotePdfAttachment), ...files],
      senderName,
    })
    setReply('')
    setQuoteIds([])
    setFiles([])
    toast.success('Reply sent')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-base font-semibold">{thread.subject}</h4>
          <p className="truncate text-sm text-muted-foreground">With {thread.participants.join(', ')}</p>
        </div>
        {unread > 0 ? <Badge variant="info">{unread} unread</Badge> : null}
      </div>
      <div className="space-y-3">
        {thread.messages.map((m) => (
          <MessageCard key={m.id} message={m} />
        ))}
      </div>
      <div className="space-y-3 rounded-md border border-input bg-muted/30 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Reply</p>
          <p className="min-w-0 truncate text-xs text-muted-foreground">Reply to {thread.participants.join(', ')}</p>
        </div>
        <Textarea value={reply} onChange={(e) => { setReply(e.target.value); if (error) setError(null) }} placeholder="Write your reply…" rows={4} className="bg-card" />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <AttachmentControls
          quoteOptions={quoteOptions}
          selectedQuoteIds={quoteIds}
          onQuoteToggle={(id, checked) => setQuoteIds((s) => (checked ? [...s, id] : s.filter((x) => x !== id)))}
          files={files}
          onFilesChange={setFiles}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleReply}>
            <ArrowUpRight className="size-4" />
            Send reply
          </Button>
        </div>
      </div>
      <Separator />
    </div>
  )
}

function MessageCard({ message }: { message: EmailMessage }) {
  const inbound = message.direction === 'inbound'
  return (
    <div className={inbound ? 'rounded-md border border-input bg-card p-3' : 'rounded-md border border-primary/20 bg-accent/40 p-3'}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge variant={inbound ? 'success-soft' : 'primary-soft'} className="gap-1">
            {inbound ? <ArrowDownLeft className="size-3" /> : <ArrowUpRight className="size-3" />}
            {inbound ? 'Received' : 'Sent'}
          </Badge>
          <span className="min-w-0 truncate text-sm font-medium">{message.fromName} &lt;{message.fromAddress}&gt;</span>
          {!inbound && message.sentBy ? <span className="text-xs text-muted-foreground">by {message.sentBy}</span> : null}
          {inbound && !message.read ? <Badge variant="info">1 unread</Badge> : null}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{formatWhen(message.sentAt)}</span>
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">To: {message.to.join(', ')}</p>
      {message.cc.length > 0 ? <p className="truncate text-xs text-muted-foreground">Cc: {message.cc.join(', ')}</p> : null}
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{message.body}</p>
      {message.attachments.length > 0 ? (
        <div className="mt-2">
          <AttachmentChips items={message.attachments} />
        </div>
      ) : null}
    </div>
  )
}
