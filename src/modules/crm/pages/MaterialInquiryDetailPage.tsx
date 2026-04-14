import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Pencil, Plus, CalendarDays, Package, IndianRupee, Users, Clock } from 'lucide-react'

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
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { EntityHeader } from '../components/EntityHeader'
import { DetailTabs } from '../components/DetailTabs'
import { CommentSection } from '../components/CommentSection'
import { materialInquiries } from '../data/material-inquiries'
import { mockComments } from '../data/comments'
import type { MaterialInquiryResponse } from '../types'

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

function MaterialInquiryDetailPage() {
  const { id: miId } = useParams<{ id: string }>()

  const mi = materialInquiries.find((m) => m.id === miId)
  const [responses, setResponses] = useState<MaterialInquiryResponse[]>(mi?.responses ?? [])
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

  // Calculate response summary
  const totalQtyRequested = mi.items.reduce((sum, item) => sum + item.qtyRequested, 0)
  const totalQtyFulfilled = responses.reduce((sum, r) => sum + r.qtyAvailable, 0)
  const fulfillmentPct = totalQtyRequested > 0 ? Math.round((totalQtyFulfilled / totalQtyRequested) * 100) : 0
  const totalResponseValue = responses.reduce((sum, r) => sum + r.qtyAvailable * r.pricePerUnit, 0)
  const avgPrice = totalQtyFulfilled > 0 ? Math.round(totalResponseValue / totalQtyFulfilled) : 0

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

  // Request tab
  const requestContent = (
    <div className="space-y-6">
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

      {mi.items.map((item) => {
        const itemResponses = responses.filter((r) => r.inquiryItemId === item.id)
        return (
          <div key={item.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold">{item.item}</h4>
              <Badge variant="secondary">{item.category}</Badge>
              <span className="text-xs text-muted-foreground">
                (Requested: {item.qtyRequested} units)
              </span>
            </div>

            {itemResponses.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {itemResponses.map((response, idx) => (
                  <Card key={response.id} size="sm">
                    <CardHeader>
                      <CardTitle className="text-xs">
                        Response Part {idx + 1}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Qty Available</dt>
                          <dd className="font-medium">{response.qtyAvailable}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Price/Unit</dt>
                          <dd className="font-medium">{formatCurrency(response.pricePerUnit)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Available Date</dt>
                          <dd>{formatDate(response.availableDate)}</dd>
                        </div>
                        {response.notes && (
                          <div>
                            <dt className="text-muted-foreground">Notes</dt>
                            <dd className="mt-0.5 text-xs">{response.notes}</dd>
                          </div>
                        )}
                        <div className="flex justify-between border-t pt-2">
                          <dt className="text-muted-foreground">Responded By</dt>
                          <dd className="text-xs">{response.respondedBy}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Date</dt>
                          <dd className="text-xs">{formatDate(response.respondedAt)}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="text-sm text-muted-foreground">Awaiting procurement response</p>
              </div>
            )}
          </div>
        )
      })}

      {/* Total Summary */}
      {responses.length > 0 && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Response Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Total Qty Covered</dt>
                <dd className="mt-1 text-lg font-semibold">{totalQtyFulfilled}</dd>
              </div>
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Weighted Avg Price</dt>
                <dd className="mt-1 text-lg font-semibold">{formatCurrency(avgPrice)}</dd>
              </div>
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Fulfillment</dt>
                <dd className="mt-1 text-lg font-semibold">{fulfillmentPct}%</dd>
              </div>
              <div>
                <dt className="text-xs font-ui text-muted-foreground">Total Value</dt>
                <dd className="mt-1 text-lg font-semibold">{formatCurrency(totalResponseValue)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column - 2/3 */}
        <div className="lg:col-span-2">
          <DetailTabs tabs={tabs} defaultTab="request" />
        </div>

        {/* Right column - 1/3 */}
        <div className="space-y-4">
          {/* Request Summary */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Request Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-xs font-ui text-muted-foreground">
                    <Package className="size-3.5" />
                    Total Items
                  </dt>
                  <dd className="text-sm font-medium">{mi.items.length}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-xs font-ui text-muted-foreground">
                    <Package className="size-3.5" />
                    Total Qty
                  </dt>
                  <dd className="text-sm font-medium">{totalQtyRequested}</dd>
                </div>
                {mi.clientBudget && (
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1.5 text-xs font-ui text-muted-foreground">
                      <IndianRupee className="size-3.5" />
                      Client Budget
                    </dt>
                    <dd className="text-sm font-medium">{formatCurrency(mi.clientBudget)}</dd>
                  </div>
                )}
                {mi.clientTimeline && (
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1.5 text-xs font-ui text-muted-foreground">
                      <Clock className="size-3.5" />
                      Timeline
                    </dt>
                    <dd className="text-sm">{mi.clientTimeline}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-xs font-ui text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    Created
                  </dt>
                  <dd className="text-sm">{formatDate(mi.createdAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Response Summary */}
          {responses.length > 0 && (
            <Card size="sm">
              <CardHeader>
                <CardTitle>Response Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex items-center justify-between">
                    <dt className="text-xs font-ui text-muted-foreground">Qty Fulfilled</dt>
                    <dd className="text-sm font-medium">
                      {totalQtyFulfilled} / {totalQtyRequested}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-xs font-ui text-muted-foreground">Avg Price/Unit</dt>
                    <dd className="text-sm font-medium">{formatCurrency(avgPrice)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-xs font-ui text-muted-foreground">Fulfillment</dt>
                    <dd className="text-sm font-medium">{fulfillmentPct}%</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Team */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Team</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-xs font-ui text-muted-foreground">
                    <Users className="size-3.5" />
                    Requested By
                  </dt>
                  <dd className="text-sm">{mi.requestedBy}</dd>
                </div>
                {mi.assignedTo && (
                  <div className="flex items-center justify-between">
                    <dt className="text-xs font-ui text-muted-foreground">Assigned To</dt>
                    <dd className="text-sm">{mi.assignedTo}</dd>
                  </div>
                )}
                {mi.productManagerNotified && (
                  <div className="flex items-center justify-between">
                    <dt className="text-xs font-ui text-muted-foreground">PM Notified</dt>
                    <dd className="text-sm">{mi.productManagerNotified}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export { MaterialInquiryDetailPage }

export default MaterialInquiryDetailPage
