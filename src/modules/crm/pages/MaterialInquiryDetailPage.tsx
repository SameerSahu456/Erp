import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Pencil, Plus, Package, Clock, CheckCircle2, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { EntityHeader } from '../components/EntityHeader'
import { DetailTabs } from '../components/DetailTabs'
import { CommentSection } from '../components/CommentSection'
import { MessageThread } from '../components/MessageThread'
import { materialInquiries } from '../data/material-inquiries'
import { mockComments } from '../data/comments'
import type { MaterialInquiryResponse, MaterialInquiryMessage } from '../types'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function getMIStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Draft': return 'neutral'
    case 'Submitted': return 'info'
    case 'Partially Responded': return 'warning'
    case 'Fully Responded': return 'success'
    case 'Closed': return 'neutral'
    default: return 'neutral'
  }
}

function PMDecisionBadge({ status }: { status: 'Pending' | 'Approved' | 'Rejected' }) {
  if (status === 'Approved') {
    return (
      <StatusBadge variant="success">
        <CheckCircle2 className="mr-1 size-3" />
        Approved
      </StatusBadge>
    )
  }
  if (status === 'Rejected') {
    return (
      <StatusBadge variant="error">
        <XCircle className="mr-1 size-3" />
        Rejected
      </StatusBadge>
    )
  }
  return (
    <StatusBadge variant="warning">
      <Clock className="mr-1 size-3" />
      Pending PM
    </StatusBadge>
  )
}

function MaterialInquiryDetailPage() {
  const { id: miId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const mi = materialInquiries.find((m) => m.id === miId)
  const [responses, setResponses] = useState<MaterialInquiryResponse[]>(mi?.responses ?? [])
  const [messages, setMessages] = useState<MaterialInquiryMessage[]>(mi?.messages ?? [])
  const [responseDialogOpen, setResponseDialogOpen] = useState(false)
  const [responseItemId, setResponseItemId] = useState('')
  const [responseQty, setResponseQty] = useState('')
  const [responsePrice, setResponsePrice] = useState('')
  const [responseDate, setResponseDate] = useState('')
  const [responseNotes, setResponseNotes] = useState('')

  if (!mi) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="font-display text-xl font-semibold">Material Inquiry not found</h2>
        <p className="text-sm text-muted-foreground">
          The inquiry you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Button variant="outline" render={<Link to="/crm/material-inquiries" />}>
          Back to Material Inquiries
        </Button>
      </div>
    )
  }

  const commentCount = mockComments.filter(
    (c) => c.entityType === 'material_inquiry' && c.entityId === mi.id
  ).length

  function handleAddResponse() {
    if (!responseItemId || !responseQty || !responsePrice || !responseDate) return

    const newResponse: MaterialInquiryResponse = {
      id: `MIR-${Date.now()}`,
      inquiryItemId: responseItemId,
      qtyAvailable: Number(responseQty),
      pricePerUnit: Number(responsePrice),
      availableDate: responseDate,
      notes: responseNotes || undefined,
      respondedBy: 'Amar Daxini',
      respondedAt: new Date().toISOString(),
    }

    setResponses((prev) => [...prev, newResponse])
    setResponseDialogOpen(false)
    setResponseItemId('')
    setResponseQty('')
    setResponsePrice('')
    setResponseDate('')
    setResponseNotes('')
  }

  function handleSendMessage(content: string) {
    const newMsg: MaterialInquiryMessage = {
      id: `MSG-${Date.now()}`,
      content,
      user: 'Amit Patel',
      role: 'sales',
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, newMsg])
  }

  // Request tab
  const requestContent = (
    <div className="space-y-6">
      {/* Request Description */}
      {mi.description && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Request Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{mi.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Linked Lead/Deal */}
      {(mi.leadId || mi.dealId) && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Linked Entity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mi.leadId && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-ui text-muted-foreground">Lead:</span>
                  <Link
                    to={`/crm/leads/${mi.leadId}`}
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {mi.leadName}
                  </Link>
                </div>
              )}
              {mi.dealId && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-ui text-muted-foreground">Deal:</span>
                  <Link
                    to={`/crm/deals/${mi.dealId}`}
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {mi.dealName}
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Budget & Timeline */}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Client Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {mi.clientBudget && (
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Overall Budget</dt>
                <dd className="mt-1 text-sm font-medium">{formatCurrency(mi.clientBudget)}</dd>
              </div>
            )}
            {mi.clientTimeline && (
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Timeline</dt>
                <dd className="mt-1 text-sm">{mi.clientTimeline}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Items Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Inquiry Items</h3>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Qty Requested</TableHead>
                <TableHead className="text-right">Client Budget/Unit</TableHead>
                <TableHead>Client Timeline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mi.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.item}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{item.qtyRequested}</TableCell>
                  <TableCell className="text-right">
                    {item.clientBudgetPerUnit ? formatCurrency(item.clientBudgetPerUnit) : '-'}
                  </TableCell>
                  <TableCell>{item.clientTimeline ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Notes */}
      {mi.notes && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{mi.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )

  // Responses tab
  const responsesContent = (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="size-3.5" data-icon="inline-start" />
            Add Response
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Procurement Response</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="font-ui">Inquiry Item</Label>
                <Select value={responseItemId} onValueChange={(val) => { if (val) setResponseItemId(val) }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {mi.items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-ui">Qty Available</Label>
                  <Input
                    type="number"
                    min={1}
                    value={responseQty}
                    onChange={(e) => setResponseQty(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-ui">Price/Unit (&#8377;)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={responsePrice}
                    onChange={(e) => setResponsePrice(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="font-ui">Available Date</Label>
                <Input
                  type="date"
                  value={responseDate}
                  onChange={(e) => setResponseDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-ui">Notes</Label>
                <Textarea
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Sourcing notes, lead times, etc."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResponseDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddResponse}
                disabled={!responseItemId || !responseQty || !responsePrice || !responseDate}
              >
                Add Response
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {(() => {
        const itemsWithoutResponse = mi.items.filter(
          (it) => !responses.some((r) => r.inquiryItemId === it.id),
        )
        const approvedCount = responses.filter((r) => r.pmStatus === 'Approved').length
        const rejectedCount = responses.filter((r) => r.pmStatus === 'Rejected').length
        const pendingCount = responses.filter(
          (r) => !r.pmStatus || r.pmStatus === 'Pending',
        ).length

        return (
          <>
            {/* Items still awaiting procurement */}
            {itemsWithoutResponse.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                    <Clock className="size-3.5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                      Awaiting procurement response
                      <span className="ml-1 font-normal text-amber-700/80 dark:text-amber-300/80">
                        · {itemsWithoutResponse.length} item
                        {itemsWithoutResponse.length !== 1 ? 's' : ''}
                      </span>
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {itemsWithoutResponse.map((it) => (
                        <span
                          key={it.id}
                          className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-white px-2 py-0.5 text-[11px] text-foreground/80 dark:border-amber-900/40 dark:bg-amber-950/40"
                        >
                          <Package className="size-3 text-amber-600" />
                          {it.item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {responses.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/10 py-12 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
                  <Clock className="size-4" />
                </span>
                <p className="text-sm italic text-muted-foreground">
                  No procurement responses yet
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                {/* List header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold tracking-tight">
                      Procurement Responses
                    </h4>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/70">
                      {responses.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-medium">
                    {approvedCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        {approvedCount} approved
                      </span>
                    )}
                    {pendingCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-status-warning-text">
                        <span className="size-1.5 rounded-full bg-amber-500" />
                        {pendingCount} pending
                      </span>
                    )}
                    {rejectedCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <span className="size-1.5 rounded-full bg-destructive" />
                        {rejectedCount} rejected
                      </span>
                    )}
                  </div>
                </div>

                {/* Unified list */}
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-transparent hover:bg-transparent">
                      <TableHead className="w-14 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Sr. No
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Item
                      </TableHead>
                      <TableHead className="w-20 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Qty
                      </TableHead>
                      <TableHead className="w-32 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Price
                      </TableHead>
                      <TableHead className="w-32 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Total
                      </TableHead>
                      <TableHead className="w-36 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Approved By
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((r, idx) => {
                      const item = mi.items.find((i) => i.id === r.inquiryItemId)
                      const status = r.pmStatus ?? 'Pending'
                      const accentBorder =
                        status === 'Approved'
                          ? 'before:bg-emerald-500'
                          : status === 'Rejected'
                          ? 'before:bg-destructive'
                          : 'before:bg-transparent'
                      return (
                        <TableRow
                          key={r.id}
                          className={`group relative cursor-pointer transition-colors hover:bg-muted/30 before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] ${accentBorder}`}
                          onClick={() =>
                            navigate(`/crm/material-inquiries/${mi.id}/responses/${r.id}`)
                          }
                        >
                          <TableCell className="text-xs font-semibold tabular-nums text-muted-foreground">
                            {String(idx + 1).padStart(2, '0')}
                          </TableCell>
                          <TableCell>
                            {item ? (
                              <div className="flex items-start gap-2.5">
                                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                  <Package className="size-3.5" />
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold leading-tight text-foreground">
                                    {item.item}
                                  </p>
                                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    {item.category}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs italic text-muted-foreground">
                                Item not found
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold tabular-nums">
                            {r.qtyAvailable}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {formatCurrency(r.pricePerUnit)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold tabular-nums">
                            {formatCurrency(r.qtyAvailable * r.pricePerUnit)}
                          </TableCell>
                          <TableCell>
                            <PMDecisionBadge status={status} />
                          </TableCell>
                          <TableCell className="text-xs">
                            {status === 'Approved' && r.pmActionedBy ? (
                              <>
                                <div className="font-medium text-foreground/80">
                                  {r.pmActionedBy}
                                </div>
                                {r.pmActionedAt && (
                                  <div className="text-[10px] text-muted-foreground">
                                    {formatDate(r.pmActionedAt)}
                                  </div>
                                )}
                              </>
                            ) : status === 'Rejected' && r.pmActionedBy ? (
                              <span className="text-muted-foreground">
                                Rejected by {r.pmActionedBy}
                              </span>
                            ) : (
                              <span className="italic text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )
      })()}
    </div>
  )

  // Messages tab
  const messagesContent = (
    <MessageThread
      messages={messages}
      onSendMessage={handleSendMessage}
      currentUser="Amit Patel"
      currentRole="sales"
    />
  )

  // Comments tab
  const commentsContent = (
    <CommentSection entityType="material_inquiry" entityId={mi.id} />
  )

  const tabs = [
    { id: 'request', label: 'Request', content: requestContent },
    {
      id: 'responses',
      label: 'Responses',
      count: responses.length,
      content: responsesContent,
    },
    {
      id: 'messages',
      label: 'Messages',
      count: messages.length,
      content: messagesContent,
    },
    {
      id: 'comments',
      label: 'Comments',
      count: commentCount,
      content: commentsContent,
    },
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        title={mi.inquiryNumber}
        subtitle={`Requested by ${mi.requestedBy}`}
        status={{ label: mi.status, variant: getMIStatusVariant(mi.status) }}
        backHref="/crm/material-inquiries"
        actions={
          <Button
            variant="outline"
            size="sm"
            render={<Link to={`/crm/material-inquiries/${mi.id}/edit`} />}
          >
            <Pencil className="size-3.5" data-icon="inline-start" />
            Edit
          </Button>
        }
      />

      <DetailTabs cardContent tabs={tabs} defaultTab="request" />
    </div>
  )
}

export { MaterialInquiryDetailPage }

export default MaterialInquiryDetailPage
