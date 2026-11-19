import { Button } from '@/components/ui/button'

import { ClosedWonWizardBody } from '../../components/close-won/ClosedWonWizardBody'
import { CLOSE_WON_STRINGS } from '../../components/close-won/close-won.strings'
import { useClosedWonWizard } from '../../hooks/close-won/useClosedWonWizard'

function ClosedWonPage() {
  const f = useClosedWonWizard()
  const { entityLoading, entity, isLead, isDemo, goBack } = f

  if (entityLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="size-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <p className="text-sm text-muted-foreground">
          {CLOSE_WON_STRINGS.page.loading(
            isLead
              ? CLOSE_WON_STRINGS.page.entityLead
              : isDemo
                ? CLOSE_WON_STRINGS.page.entityDemo
                : CLOSE_WON_STRINGS.page.entityDeal,
          )}
        </p>
      </div>
    )
  }

  if (!entity) {
    const label = isLead
      ? CLOSE_WON_STRINGS.page.notFoundLead
      : isDemo
        ? CLOSE_WON_STRINGS.page.notFoundDemo
        : CLOSE_WON_STRINGS.page.notFoundDeal
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="font-display text-xl font-semibold">{CLOSE_WON_STRINGS.page.notFound(label)}</h2>
        <Button variant="outline" onClick={goBack}>{CLOSE_WON_STRINGS.page.goBack}</Button>
      </div>
    )
  }

  return <ClosedWonWizardBody f={f} />
}

export default ClosedWonPage
