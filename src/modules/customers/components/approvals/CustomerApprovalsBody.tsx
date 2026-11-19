import { Link } from 'react-router-dom'
import { Building2, MapPin, User, ShieldCheck, FileText, CreditCard } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Typography } from "@/components/ui/typography"
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { PageHeader } from '@/components/page-shells'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/common/display/StatusBadge'

import { mockCustomerRegistrations } from '@/modules/customers/data/customers'
import { formatINRCompact } from "@/lib/currency";
import type { CustomerApprovalsController } from "../../hooks/approvals/useCustomerApprovals"
import { APPROVALS_STRINGS } from './approvals.strings'

export function CustomerApprovalsBody({ f }: { f: CustomerApprovalsController }) {
  const {
    navigate,
    statusFilter,
    setStatusFilter,
    rejectDialogOpen,
    setRejectDialogOpen,
    rejectCustomerId,
    rejectReason,
    setRejectReason,
    approveDialogOpen,
    setApproveDialogOpen,
    approveCustomerId,
    pendingCustomers,
    handleApprove,
    handleReject,
  } = f

  return (
    <div className="space-y-6">
      <PageHeader
        title={APPROVALS_STRINGS.page.title}
        subtitle={APPROVALS_STRINGS.page.subtitle}
        breadcrumbs={[
          { label: APPROVALS_STRINGS.page.breadcrumbs.customers, href: '/customers' },
          { label: APPROVALS_STRINGS.page.breadcrumbs.approvals },
        ]}
        actions={
          <Select value={statusFilter} onValueChange={(v) => { if (v !== null) setStatusFilter(v) }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={APPROVALS_STRINGS.filter.placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{APPROVALS_STRINGS.filter.all}</SelectItem>
              <SelectItem value="KYC Pending">{APPROVALS_STRINGS.filter.kycPending}</SelectItem>
              <SelectItem value="Onboarding">{APPROVALS_STRINGS.filter.onboarding}</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {pendingCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-20">
          <ShieldCheck className="size-12 text-muted-foreground" />
          <h3 className="font-display text-lg font-semibold">{APPROVALS_STRINGS.empty.heading}</h3>
          <Typography variant="body" tone="muted">
            {APPROVALS_STRINGS.empty.description}
          </Typography>
          <Button variant="outline" render={<Link to="/customers" />}>
            {APPROVALS_STRINGS.empty.backToCustomers}
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
                      <Typography variant="helper" className="mt-0.5" asChild><p>{customer.customerCode}</p></Typography>
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
                      <Typography variant="body" tone="muted" asChild><span>{customer.billingCity}</span></Typography>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="size-3.5 text-muted-foreground" />
                      <Typography variant="body" tone="muted" asChild><span>{customer.accountManager}</span></Typography>
                    </div>

                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-3.5 text-muted-foreground" />
                      <Typography variant="body" asChild>
                        <span>
                          {APPROVALS_STRINGS.card.kycPassed(kycPassed, kycTotal)}
                        </span>
                      </Typography>
                    </div>

                    <div className="flex items-center gap-2">
                      <FileText className="size-3.5 text-muted-foreground" />
                      <Typography variant="body" asChild>
                        <span>
                          {APPROVALS_STRINGS.card.docsVerified(docsVerified, docsTotal)}
                        </span>
                      </Typography>
                    </div>

                    <div className="flex items-center gap-2">
                      <CreditCard className="size-3.5 text-muted-foreground" />
                      <Typography variant="body" asChild>
                        <span>
                          {APPROVALS_STRINGS.card.creditLimit(formatINRCompact(customer.creditLimit))}
                        </span>
                      </Typography>
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
                    {APPROVALS_STRINGS.card.review}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleApprove(customer.id)}
                  >
                    {APPROVALS_STRINGS.card.approve}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleReject(customer.id)}
                  >
                    {APPROVALS_STRINGS.card.reject}
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
            <DialogTitle>{APPROVALS_STRINGS.approveDialog.title}</DialogTitle>
            <DialogDescription>
              {APPROVALS_STRINGS.approveDialog.description(
                mockCustomerRegistrations.find((c) => c.id === approveCustomerId)?.companyName ?? ''
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              {APPROVALS_STRINGS.approveDialog.cancel}
            </Button>
            <Button onClick={() => { setApproveDialogOpen(false); navigate('/customers') }}>
              {APPROVALS_STRINGS.approveDialog.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{APPROVALS_STRINGS.rejectDialog.title}</DialogTitle>
            <DialogDescription>
              {APPROVALS_STRINGS.rejectDialog.description(
                mockCustomerRegistrations.find((c) => c.id === rejectCustomerId)?.companyName ?? ''
              )}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={APPROVALS_STRINGS.rejectDialog.reasonPlaceholder}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {APPROVALS_STRINGS.rejectDialog.cancel}
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={() => { setRejectDialogOpen(false); navigate('/customers') }}
            >
              {APPROVALS_STRINGS.rejectDialog.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
