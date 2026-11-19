import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UnsavedChangesDialog } from '@/components/common/dialogs/UnsavedChangesDialog'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { QuoteBuilderPanel } from '../../components/quotes/QuoteBuilderPanel'
import { QUOTES_STRINGS as S } from '../../components/quotes/quotes.strings'
import { deals } from '../../data/deals'
import { accounts } from '../../data/accounts'

export default function QuoteBuilderPage() {
  const navigate = useNavigate()
  const navigateBack = useNavigateBack('/crm/quotes')
  const [searchParams] = useSearchParams()
  const [panelDirty, setPanelDirty] = useState(false)
  const guard = useUnsavedChangesGuard({ isDirty: panelDirty })
  const goBack = () => guard.attempt(navigateBack)

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
          aria-label={S.builder.back}
          onClick={goBack}
        >
          <ArrowLeft />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{S.builder.pageTitle}</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {S.builder.pageSubtitle}
          </p>
        </div>
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => guard.attempt(() => navigate('/crm/quotes'))}
          >
            <FileText className="size-4 mr-1.5" />
            {S.builder.allQuotes}
          </Button>
        </div>
      </div>

      {/* Quote Builder */}
      <QuoteBuilderPanel
        leadId={leadId}
        dealId={dealId}
        accountId={accountId}
        accountName={accountName}
        onDirtyChange={setPanelDirty}
      />

      <UnsavedChangesDialog
        open={guard.dialogOpen}
        onOpenChange={guard.onDialogOpenChange}
        onConfirm={guard.onConfirmDiscard}
      />
    </div>
  )
}

export { QuoteBuilderPage }
