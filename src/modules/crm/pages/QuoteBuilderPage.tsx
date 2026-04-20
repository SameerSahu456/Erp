import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BOMQuoteBuilder } from '../components/BOMQuoteBuilder'
import { leads } from '../data/leads'
import { deals } from '../data/deals'
import { accounts } from '../data/accounts'

export default function QuoteBuilderPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const leadId = searchParams.get('leadId') ?? undefined
  const dealId = searchParams.get('dealId') ?? undefined
  const accountId = searchParams.get('accountId') ?? undefined

  const lead = leadId ? leads.find((l) => l.id === leadId) : undefined
  const deal = dealId ? deals.find((d) => d.id === dealId) : undefined
  const account = accountId ? accounts.find((a) => a.id === accountId) : undefined

  const accountName = account?.name ?? deal?.accountName ?? undefined

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">BOM Quote Builder</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Build server quotes with hierarchical BOM, inline pricing, and margin visibility
          </p>
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={() => navigate('/crm/quotes')}>
            <FileText className="size-4 mr-1.5" />
            All Quotes
          </Button>
        </div>
      </div>

      {/* BOM Builder */}
      <BOMQuoteBuilder
        leadId={leadId}
        leadName={lead?.name}
        dealId={dealId}
        dealName={deal?.name}
        accountId={accountId}
        accountName={accountName}
      />
    </div>
  )
}

export { QuoteBuilderPage }
