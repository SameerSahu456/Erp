import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePersistedState } from '@/hooks/use-persisted-state'
import {
  Building2,
  MapPin,
  User,
  ShieldCheck,
  FileText,
  CreditCard,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/common/StatusBadge'

import { mockCustomerRegistrations } from '@/modules/customers/data/customers'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

function CustomerApprovalsPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = usePersistedState<string>('customers-approvals:status', 'all')
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectCustomerId, setRejectCustomerId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [approveCustomerId, setApproveCustomerId] = useState<string | null>(null)

  const pendingCustomers = mockCustomerRegistrations.filter((c) => {
    const isPending = ['KYC Pending', 'Onboarding'].includes(c.status)
    if (!isPending) return false
    if (statusFilter === 'all') return true
    return c.status === statusFilter
  })

  function handleApprove(customerId: string) {
    setApproveCustomerId(customerId)
    setApproveDialogOpen(true)
  }

  function handleReject(customerId: string) {
    setRejectCustomerId(customerId)
    setRejectReason('')
    setRejectDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold">Customer Approvals</h2>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => { if (v !== null) setStatusFilter(v) }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pending</SelectItem>
              <SelectItem value="KYC Pending">KYC Pending</SelectItem>
              <SelectItem value="Onboarding">Onboarding</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {pendingCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-20">
          <ShieldCheck className="size-12 text-muted-foreground" />
          <h3 className="font-display text-lg font-semibold">No Pending Approvals</h3>
          <p className="text-sm text-muted-foreground">
            All customer registrations have been reviewed.
          </p>
          <Button variant="outline" render={<Link to="/customers" />}>
            Back to Customers
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pendingCustomers.map((customer) => {
            const kycPassed = customer.kycChecklist.filter((k) => k.status === 'Pass').length
            const kycTotal = customer.kycChecklist.length
            const docsVerified = customer.documents.filter((d) => d.status === 'Verified').length
            const docsTotal = customer.documents.length

            return (
              <Card key={customer.id} size="sm">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{customer.companyName}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{customer.customerCode}</p>
                    </div>
                    <StatusBadge
                      variant={customer.status === 'KYC Pending' ? 'warning' : 'info'}
                    >
                      {customer.status}
                    </StatusBadge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-3.5 text-muted-foreground" />
                      <Badge variant={customer.type === 'Company' ? 'secondary' : 'outline'} className="text-[10px]">
                        {customer.type}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="size-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{customer.billingCity}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="size-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{customer.accountManager}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-3.5 text-muted-foreground" />
                      <span className="text-sm">
                        KYC: {kycPassed}/{kycTotal} items passed
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <FileText className="size-3.5 text-muted-foreground" />
                      <span className="text-sm">
                        Documents: {docsVerified}/{docsTotal} verified
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CreditCard className="size-3.5 text-muted-foreground" />
                      <span className="text-sm">
                        Credit Limit: {formatCurrency(customer.creditLimit)}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex items-center gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    render={<Link to={`/customers/${customer.id}`} />}
                  >
                    Review
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleApprove(customer.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleReject(customer.id)}
                  >
                    Reject
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* Approve dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve Customer</DialogTitle>
            <DialogDescription>
              Approve &quot;{mockCustomerRegistrations.find((c) => c.id === approveCustomerId)?.companyName}&quot; as a registered customer?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => { setApproveDialogOpen(false); navigate('/customers') }}>
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Customer</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting &quot;{mockCustomerRegistrations.find((c) => c.id === rejectCustomerId)?.companyName}&quot;.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={() => { setRejectDialogOpen(false); navigate('/customers') }}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CustomerApprovalsPage
