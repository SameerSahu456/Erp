import { PackageX } from 'lucide-react'

import { Typography } from '@/components/ui/typography'
import { EntityRef } from '@/components/common/display/EntityRef'
import type { EntityKind } from '@shared/lib/entityRoutes'

import type { DeviceDossier } from '../../../api'
import {
  SALES_RETURN_REASON_LABEL,
  type SalesReturnReason,
} from '../../../constants/sales-return-status'
import {
  RETURN_REASON_LABELS,
  type ReturnReasonCode,
} from '../../purchase-returns/purchase-returns.strings'
import { DEVICES_STRINGS } from '../devices.strings'

type LivePurchaseReturn = NonNullable<DeviceDossier['live_purchase_return']>
type LiveSalesReturn = NonNullable<DeviceDossier['live_sales_return']>

const isReturnReasonCode = (code: string): code is ReturnReasonCode =>
  Object.prototype.hasOwnProperty.call(RETURN_REASON_LABELS, code)
const isSalesReturnReason = (code: string): code is SalesReturnReason =>
  Object.prototype.hasOwnProperty.call(SALES_RETURN_REASON_LABEL, code)

interface LiveReturnBannerProps {
  title: string
  kind: EntityKind
  id: string
  number: string
  reason: string
  notes?: string | null
}

/** A return document this unit is tied to, with why — so the operator holding
 *  the device sees the reason and can jump to the return. */
function LiveReturnBanner({ title, kind, id, number, reason, notes }: LiveReturnBannerProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-warning bg-warning-soft px-4 py-3">
      <PackageX className="size-4 shrink-0 text-warning" aria-hidden />
      <Typography variant="body">{title}</Typography>
      <EntityRef kind={kind} id={id} value={number}>
        {number}
      </EntityRef>
      <Typography variant="body" tone="muted" className="min-w-0 break-words">
        {DEVICES_STRINGS.liveReturn.reasonLabel}: {reason}
        {notes ? ` — ${notes}` : ''}
      </Typography>
    </div>
  )
}

/** The OPEN purchase return this unit sits in — an operator who finds the
 *  device blocked sees why. */
export function PurchaseReturnBanner({ liveReturn }: { liveReturn: LivePurchaseReturn }) {
  const code = liveReturn.reason_code
  return (
    <LiveReturnBanner
      title={DEVICES_STRINGS.liveReturn.bannerTitle}
      kind="purchase_return"
      id={liveReturn.id}
      number={liveReturn.pret_number}
      reason={isReturnReasonCode(code) ? RETURN_REASON_LABELS[code] : code}
      notes={liveReturn.reason_notes}
    />
  )
}

/** The sales return this unit came back on — the engineer working it sees why
 *  the customer sent it back. */
export function SalesReturnBanner({ liveReturn }: { liveReturn: LiveSalesReturn }) {
  const code = liveReturn.reason
  return (
    <LiveReturnBanner
      title={DEVICES_STRINGS.liveReturn.salesBannerTitle}
      kind="sales_return"
      id={liveReturn.id}
      number={liveReturn.request_number}
      reason={isSalesReturnReason(code) ? SALES_RETURN_REASON_LABEL[code] : code}
      notes={liveReturn.notes}
    />
  )
}
