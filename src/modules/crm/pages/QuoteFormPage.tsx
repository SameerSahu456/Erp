import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  History,
  ArrowRight,
  Copy,
  FileText,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EntityHeader } from '../components/EntityHeader'
import { QuoteBuilderPanel } from '../components/QuoteBuilderPanel'
import { quotes } from '../data/quotes'
import { leads } from '../data/leads'
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
  const paramParentQuoteId = searchParams.get('parentQuoteId') ?? ''

  const prefilledLead = paramLeadId
    ? leads.find((l) => l.id === paramLeadId)
    : existingQuote?.leadId
      ? leads.find((l) => l.id === existingQuote.leadId)
      : undefined

  const parentQuote = paramParentQuoteId
    ? quotes.find((q) => q.id === paramParentQuoteId)
    : undefined

  const version = searchParams.get('version')
    ? Number(searchParams.get('version'))
    : existingQuote?.version ?? 1

  const status = existingQuote?.status ?? 'Draft'
  const accountName = existingQuote?.accountId
    ? accounts.find((a) => a.id === existingQuote.accountId)?.name
    : undefined

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
    <div className="space-y-6">
      <EntityHeader
        title={isEdit ? existingQuote.quoteNumber : 'Create Quote'}
        subtitle={
          isEdit
            ? `${accountName ?? ''} — ${existingQuote?.lineItems?.length ?? 0} items`
            : 'Create a new quotation with advanced BOM configuration'
        }
        status={isEdit ? { label: status, variant: STATUS_VARIANTS[status] } : undefined}
        backHref={backHref}
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
      />

      {/* Lead & Version Info */}
      {(prefilledLead || version > 1) && (
        <div className="flex flex-wrap items-center gap-3">
          {prefilledLead && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-ui text-muted-foreground">Lead:</span>
              <StatusBadge variant="info">{prefilledLead.name} ({prefilledLead.company})</StatusBadge>
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

      {/* Quote Builder Card */}
      <Card className="border-t-4 border-t-primary/20">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="size-5 text-primary" />
              {isEdit ? 'Quote Details' : 'New Quote'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-primary/80 to-primary text-primary-foreground text-[10px] gap-1">
                <Sparkles className="size-3" />
                Advanced Builder
              </Badge>
              <Badge variant="outline" className="text-xs">
                {status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <QuoteBuilderPanel
            leadId={paramLeadId ?? existingQuote?.leadId}
            accountId={existingQuote?.accountId}
            accountName={accountName}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export { QuoteFormPage }

export default QuoteFormPage
