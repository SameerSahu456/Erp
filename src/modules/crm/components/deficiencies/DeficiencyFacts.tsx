import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { Typography } from "@/components/ui/typography"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { formatINR } from "@/lib/currency"
import { formatIST_date } from "@shared/lib/date"

import type { CustomerDeficiencyWire } from "../../api"
import {
  DEFICIENCY_STATUS_LABEL,
  DEFICIENCY_STATUS_VARIANT,
  DEFICIENCY_TYPE_LABEL,
  type DeficiencyStatus,
  type DeficiencyType,
} from "../../constants/deficiency"
import { DEFICIENCIES_STRINGS as S } from "./deficiencies.strings"

const F = S.detail.facts
const money = (v: string | null) => (v ? formatINR(Number(v)) : F.none)

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <Typography variant="caption" tone="muted">
        {label}
      </Typography>
      <div className="min-w-0 truncate">{children}</div>
    </div>
  )
}

function Text({ value }: { value: string | null | undefined }) {
  return (
    <Typography variant="body" className="min-w-0 truncate">
      {value || F.none}
    </Typography>
  )
}

/** Everything known about one deficiency, and where it went. */
export function DeficiencyFacts({ row }: { row: CustomerDeficiencyWire }) {
  const status = row.status as DeficiencyStatus
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Fact label={F.type}>
        <Text value={DEFICIENCY_TYPE_LABEL[row.deficiency_type as DeficiencyType] ?? row.deficiency_type} />
      </Fact>
      <Fact label={F.status}>
        <StatusBadge variant={DEFICIENCY_STATUS_VARIANT[status] ?? "neutral"}>
          {DEFICIENCY_STATUS_LABEL[status] ?? row.status}
        </StatusBadge>
      </Fact>
      <Fact label={F.customer}>
        <Text value={row.account_name} />
      </Fact>
      <Fact label={F.serial}>
        <Text value={row.serial_number} />
      </Fact>
      <Fact label={F.order}>
        {row.sales_order_id ? (
          <Link to={`/crm/sales-orders/${row.sales_order_id}`} className="text-primary hover:underline">
            {row.order_number ?? F.order}
          </Link>
        ) : (
          <Text value={null} />
        )}
      </Fact>
      <Fact label={F.raised}>
        <Text value={formatIST_date(row.created_at)} />
      </Fact>
      <Fact label={F.suggested}>
        <Text value={money(row.suggested_amount)} />
      </Fact>
      <Fact label={F.proposed}>
        <Text value={money(row.proposed_amount)} />
      </Fact>
      <Fact label={F.chargeOrder}>
        {row.charge_order_id ? (
          <Link to={`/crm/sales-orders/${row.charge_order_id}`} className="text-primary hover:underline">
            {row.charge_order_number ?? F.chargeOrder}
          </Link>
        ) : (
          <Text value={null} />
        )}
      </Fact>
      <Fact label={F.waiverReason}>
        <Text value={row.waiver_reason} />
      </Fact>
      <Fact label={F.waiverDecision}>
        <Text value={row.waiver_decision_notes} />
      </Fact>
      <Fact label={F.recovered}>
        <Text value={row.recovered_notes} />
      </Fact>
      <div className="col-span-2 md:col-span-4">
        <Fact label={F.description}>
          <Typography variant="body" className="whitespace-pre-wrap">
            {row.description}
          </Typography>
        </Fact>
      </div>
    </div>
  )
}
