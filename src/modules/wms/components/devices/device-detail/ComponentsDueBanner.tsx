import { useState } from 'react'
import { CheckCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { ConfirmDialog } from '@/components/common/dialogs/ConfirmDialog'

import { useConfirmAllDeviceComponents } from '../../../hooks/devices/useDeviceContents'
import { COMPONENTS_CARD_STRINGS as S } from './components-card.strings'

/** "N components need checking" + the bulk confirm (inward-verification D3).
 *
 *  A bulk lot can carry a dozen parts per device, so ticking each RAM stick is
 *  the step that would otherwise get skipped. The confirm asks once, and the
 *  backend audits it as a bulk confirm. */
export function ComponentsDueBanner({
  deviceId,
  dueCount,
  canCheck,
}: {
  deviceId: string
  dueCount: number
  canCheck: boolean
}) {
  const [open, setOpen] = useState(false)
  const confirmAll = useConfirmAllDeviceComponents()
  if (dueCount === 0) return null

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2">
      <Typography variant="helper" tone="warning" asChild>
        <p className="min-w-0 flex-1">{S.card.dueBanner(dueCount)}</p>
      </Typography>
      {canCheck ? (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          disabled={confirmAll.isPending}
          onClick={() => setOpen(true)}
        >
          <CheckCheck className="size-3.5" data-icon="inline-start" />
          {S.card.confirmAll}
        </Button>
      ) : null}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={S.card.confirmAllTitle}
        description={S.card.confirmAllDescription(dueCount)}
        confirmLabel={S.card.confirmAllLabel}
        onConfirm={() => {
          confirmAll.mutate(deviceId)
          setOpen(false)
        }}
      />
    </div>
  )
}
