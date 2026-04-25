import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  History,
  ArrowRight,
  Copy,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/common/StatusBadge'
import { FormPageShell } from '@/components/page'
import { QuoteBuilderPanel } from '../components/QuoteBuilderPanel'
import { quotes } from '../data/quotes'
import { leads } from '../data/leads'
import { deals } from '../data/deals'
import { accounts } from '../data/accounts'
import type { Quote } from '../types'
import { toast } from 'sonner'

const STATUS_VARIANTS: Record<Quote['status'], 'neutral' | 'info' | 'success' | 'error' | 'warning'> = {
  Draft: 'neutral',
  Sent: 'info',
  Accepted: 'success',
  Rejected: 'error',
  Expired: 'warning',
}

function QuoteFormPage() {
  const { id: quoteId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const existingQuote = quoteId ? quotes.find((q) => q.id === quoteId) : undefined
  const isEdit = !!existingQuote

  const paramLeadId = searchParams.get('leadId') ?? undefined
  const paramDealId = searchParams.get('dealId') ?? undefined
  const paramAccountId = searchParams.get('accountId') ?? existingQuote?.accountId ?? undefined
  const paramParentQuoteId = searchParams.get('parentQuoteId') ?? ''

  const prefilledLead = paramLeadId
    ? leads.find((l) => l.id === paramLeadId)
    : existingQuote?.leadId
      ? leads.find((l) => l.id === existingQuote.leadId)
      : undefined

  const prefilledDeal = paramDealId
    ? deals.find((d) => d.id === paramDealId)
    : undefined

  const parentQuote = paramParentQuoteId
    ? quotes.find((q) => q.id === paramParentQuoteId)
    : undefined

  const version = searchParams.get('version')
    ? Number(searchParams.get('version'))
    : existingQuote?.version ?? 1

  const status = existingQuote?.status ?? 'Draft'

  const resolvedAccountName = paramAccountId
    ? accounts.find((a) => a.id === paramAccountId)?.name
    : prefilledDeal?.accountName ?? undefined

  const backHref = '/crm/quotes'

  function handleAmendQuote() {
    const leadIdParam = existingQuote?.leadId ?? prefilledLead?.id ?? ''
    const nextVersion = (existingQuote?.version ?? 1) + 1
    navigate(`/crm/quotes/new?leadId=${leadIdParam}&parentQuoteId=${existingQuote?.id}&version=${nextVersion}`)
  }

  function handleConvertToSO() {
    navigate(`/crm/sales-orders/new?quoteId=${existingQuote?.id}`)
  }

  function handleDuplicateQuote() {
    toast.success('Quote duplicated as new draft')
    navigate('/crm/quotes/new')
  }


  return (
    <FormPageShell
      title={isEdit ? existingQuote.quoteNumber : 'Create Quote'}
      subtitle={
        isEdit
          ? `${resolvedAccountName ?? ''} — ${existingQuote?.lineItems?.length ?? 0} items`
          : 'Build a new quote — select items from inventory or add descriptions manually'
      }
      breadcrumbs={
        isEdit
          ? [
              { label: 'CRM' },
              { label: 'Quotes', href: '/crm/quotes' },
              { label: existingQuote.quoteNumber },
            ]
          : [
              { label: 'CRM' },
              { label: 'Quotes', href: '/crm/quotes' },
              { label: 'New Quote' },
            ]
      }
      status={isEdit ? { label: status, variant: STATUS_VARIANTS[status] } : undefined}
      backHref={backHref}
      hideFooter
      actions={
        <div className="flex items-center gap-2">
          {isEdit && (
            <>
              <Button variant="outline" size="sm" onClick={handleDuplicateQuote}>
                <Copy className="size-4 mr-1.5" />
                Duplicate
              </Button>
              <Button variant="outline" size="sm" onClick={handleAmendQuote}>
                <History className="size-4 mr-1.5" />
                Amend
              </Button>
              {existingQuote?.status === 'Accepted' && (
                <Button size="sm" onClick={handleConvertToSO}>
                  <ArrowRight className="size-4 mr-1.5" />
                  Convert to SO
                </Button>
              )}
            </>
          )}
        </div>
      }
    >
      {/* Lead/Deal & Version Info */}
      {(prefilledLead || prefilledDeal || version > 1) && (
        <div className="flex flex-wrap items-center gap-3">
          {prefilledLead && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-ui text-muted-foreground">Lead:</span>
              <StatusBadge variant="info">{prefilledLead.name} ({prefilledLead.company})</StatusBadge>
            </div>
          )}
          {prefilledDeal && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-ui text-muted-foreground">Deal:</span>
              <StatusBadge variant="info">{prefilledDeal.name}</StatusBadge>
            </div>
          )}
          <Badge variant="outline" className="gap-1">
            <History className="size-3" />
            Version {version}
          </Badge>
          {parentQuote && (
            <span className="text-xs text-muted-foreground">
              (amended from {parentQuote.quoteNumber})
            </span>
          )}
        </div>
      )}

      {/* Quote Builder */}
      <QuoteBuilderPanel
        leadId={paramLeadId}
        dealId={paramDealId}
        accountId={paramAccountId}
        accountName={resolvedAccountName}
      />
    </FormPageShell>
  )
}

export { QuoteFormPage }

export default QuoteFormPage
