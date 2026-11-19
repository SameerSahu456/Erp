import { WORKFLOW_LABELS } from '../deviceLabels'
import { humanize } from './helpers'
import { WORKFLOW_HISTORY_CARD_STRINGS as S } from './workflow-history-card.strings'
import { entityRef, joinNodes, str } from './workflow-event-nodes'
import type { EventDescriber } from './workflow-event-types'

// ── Purchase return ──
const returnRaised: EventDescriber = ({ md }) => {
  const reason = str(md.reason_notes) ?? humanize(str(md.reason_code) ?? '')
  const pret = str(md.pret_number)
  return {
    title: S.titles.raisedForVendorReturn,
    description: joinNodes([
      pret ? entityRef('purchase_return', str(md.purchase_return_id), pret) : null,
      str(md.vendor_name),
      reason,
    ]),
  }
}

const returnCancelled: EventDescriber = ({ md }) => {
  const restored = str(md.restored_to)
  // A disposition means procurement had already decided and then
  // rejected it — a different story from a warehouse mis-tick.
  const title = str(md.disposition) ? S.titles.returnRejected : S.titles.returnCancelled
  const pret = str(md.pret_number)
  if (restored) {
    return { title, description: S.details.backTo(WORKFLOW_LABELS[restored] ?? humanize(restored)) }
  }
  return {
    title,
    description: pret ? entityRef('purchase_return', str(md.purchase_return_id), pret) : undefined,
  }
}

const returnDispatched: EventDescriber = ({ md }) => {
  const pret = str(md.pret_number)
  return {
    title: S.titles.returnedToVendor,
    description: joinNodes([
      pret ? entityRef('purchase_return', str(md.purchase_return_id), pret) : null,
      str(md.vendor_name),
      str(md.awb_number),
    ]),
  }
}

// The vendor consignment was cancelled after dispatch; the unit is back
// on our dock, waiting to ship again.
const returnRecalled: EventDescriber = ({ md }) => {
  const pret = str(md.pret_number)
  return {
    title: S.titles.recalledFromVendor,
    description: joinNodes([
      pret ? entityRef('purchase_return', str(md.purchase_return_id), pret) : null,
      str(md.vendor_name),
    ]),
  }
}

// ── Replacement return (inward provenance) ──
const replacementReturned: EventDescriber = ({ md }) => {
  // Where it came from: order + customer, then GRN, then the reason.
  const from = [str(md.sales_order_number), str(md.account_name)].filter(Boolean).join(' · ')
  const rr = str(md.request_number)
  const grn = str(md.grn_number)
  const trail = joinNodes(
    [
      rr ? entityRef('replacement', str(md.replacement_request_id), rr) : null,
      grn ? entityRef('grn', str(md.grn_batch_id), grn) : null,
    ],
    ' · ',
  )
  return {
    title: from ? S.titles.returnedFrom(from) : S.titles.returnedOnReplacement,
    description: joinNodes([trail, str(md.reason)], ' — '),
  }
}

// ── Replacement requested (for this unit or a part inside it) ──
function replacementLineText(line: Record<string, unknown>): string {
  const part = str(line.part_name) ?? (str(line.target) === 'unit' ? S.details.wholeUnit : '—')
  const decision = str(line.replacement_decision) ?? ''
  const substitute = str(line.replacement_part_name)
  const outcome =
    decision === 'different_part' && substitute
      ? S.details.replaceWith(substitute)
      : (S.details.replacementOutcome[decision] ?? humanize(decision))
  const swap = str(line.swap_location)
  const where =
    swap === 'on_site'
      ? S.details.replacementWhere.on_site
      : swap === 'in_house'
        ? (S.details.replacementWhere[str(line.in_house_return) ?? 'device'] ?? null)
        : null
  return S.details.replacementLine(part, outcome, where)
}

const CLOSED_REQUEST_STATUSES = new Set(['cancelled', 'rejected', 'completed'])

const replacementRequested: EventDescriber = ({ md }) => {
  const rr = str(md.request_number)
  const lines = Array.isArray(md.lines) ? (md.lines as Record<string, unknown>[]) : []
  const status = str(md.request_status)
  return {
    title: S.titles.replacementRequested,
    description: joinNodes([
      rr ? entityRef('replacement', str(md.replacement_request_id), rr) : null,
      lines.map(replacementLineText).join('; ') || null,
      status && CLOSED_REQUEST_STATUSES.has(status) ? S.details.requestStatus(status) : null,
    ]),
    note: str(md.reason) ? S.details.reason(str(md.reason) as string) : undefined,
  }
}

// ── Non-replacement customer returns (sale / demo / staff) ──
const CUSTOMER_RETURN_TITLE: Record<string, string> = {
  sale_returned: S.titles.returnedOnSale,
  demo_returned: S.titles.returnedOnDemo,
}

// The arrival that opens the unit's next workflow cycle. Names the
// return type and links the sales return (when the batch names one) and
// the GRN it came back on. EntityRef only opens the return for a viewer
// who can read it.
const customerReturned: EventDescriber = ({ e, md }) => {
  const sret = str(md.request_number)
  const grn = str(md.grn_number)
  return {
    title: CUSTOMER_RETURN_TITLE[e.event_type] ?? S.titles.returnedOnStaff,
    description: joinNodes([
      sret ? entityRef('sales_return', str(md.sales_return_request_id), sret) : null,
      grn ? entityRef('grn', str(md.grn_batch_id), grn) : null,
    ]),
  }
}

/** Vendor (purchase) returns, replacement returns and customer returns. */
export const RETURN_DESCRIBERS: Record<string, EventDescriber> = {
  return_raised: returnRaised,
  return_cancelled: returnCancelled,
  return_dispatched: returnDispatched,
  return_recalled: returnRecalled,
  replacement_returned: replacementReturned,
  replacement_requested: replacementRequested,
  sale_returned: customerReturned,
  demo_returned: customerReturned,
  staff_returned: customerReturned,
}
