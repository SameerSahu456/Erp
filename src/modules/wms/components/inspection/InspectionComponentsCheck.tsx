import { Link, useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { useStockItemComponents } from '@modules/ims'

import { isDueForCheck } from '../../constants/component-check-state'
import { deviceDetailPath } from '../devices/device-detail/helpers'
import { INSPECTION_STRINGS } from './inspection.strings'

const S = INSPECTION_STRINGS.completeDialog.components

/** One line in the inspection dialog while parts inside the device still need
 *  checking (inward-verification D3). Inspection can't complete until each is
 *  marked Present / Missing on the device's Components card, so the message
 *  says where; opened from the Inspection list, it links to the device. */
export function InspectionComponentsCheck({ deviceId }: { deviceId: string }) {
  const { pathname } = useLocation()
  const query = useStockItemComponents(deviceId)
  const dueCount = (query.data?.current_components ?? []).filter(isDueForCheck).length
  if (dueCount === 0) return null
  const onDevicePage = pathname.startsWith(deviceDetailPath(deviceId))

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2">
      <Typography variant="helper" tone="warning" asChild>
        <p className="min-w-0 flex-1">{S.pending(dueCount)}</p>
      </Typography>
      {onDevicePage ? null : (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          render={<Link to={deviceDetailPath(deviceId, 'inspection')} />}
        >
          {S.openDevice}
        </Button>
      )}
    </div>
  )
}
