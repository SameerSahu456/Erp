import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { QuoteBuilderPanel } from '../components/QuoteBuilderPanel'
import { deals } from '../data/deals'
import { accounts } from '../data/accounts'

export default function QuoteBuilderPage() {
  const navigate = useNavigate()
  const goBack = useNavigateBack('/crm/quotes')
  const [searchParams] = useSearchParams()

  const leadId = searchParams.get('leadId') ?? undefined
  const dealId = searchParams.get('dealId') ?? undefined
  const accountId = searchParams.get('accountId') ?? undefined

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
          aria-label="Back"
          onClick={goBack}
        >
          <ArrowLeft />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Quote Builder</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Add items by part number or enter descriptions &mdash; mix and match per line
          </p>
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={() => navigate('/crm/quotes')}>
            <FileText className="size-4 mr-1.5" />
            All Quotes
          </Button>
        </div>
      </div>

      {/* Quote Builder */}
      <QuoteBuilderPanel
        leadId={leadId}
        dealId={dealId}
        accountId={accountId}
        accountName={accountName}
      />
    </div>
  )
}

export { QuoteBuilderPage }
