import {
  ArrowLeftRight,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  ShoppingCart,
  StickyNote,
  Ticket,
  User,
  Wrench,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EntityRef } from "@/components/common/display/EntityRef"
import { DetailTextBlock } from "@/components/common/display/DetailTextBlock"
import { cn } from "@/lib/utils"
import { formatIST_date } from "@shared/lib/date"
import type { ReplacementRequestWire } from "@modules/crm"

import {
  REPLACEMENT_MODE_LABEL,
  type ReplacementMode,
} from "../../constants/replacement-request-status"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"
import { DetailFact, FactGrid } from "../shared/section-primitives"

/** Overview — the facts an operator needs before acting on a line. */
export function ReplacementRequestOverviewCard({
  rr,
}: {
  rr: ReplacementRequestWire
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="size-4 text-primary" />
          {S.detail.sections.overview}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FactGrid>
          <DetailFact
            icon={ShoppingCart}
            label={S.detail.summary.salesOrder}
            value={
              rr.sales_order_number &&
              rr.entity_type === "sales_orders" ? (
                <EntityRef
                  kind="sales_order"
                  id={rr.entity_id}
                  value={rr.sales_order_number}
                >
                  {rr.sales_order_number}
                </EntityRef>
              ) : (
                rr.sales_order_number
              )
            }
          />
          <DetailFact
            icon={Building2}
            label={S.detail.summary.customer}
            value={rr.account_name}
          />
          <DetailFact
            icon={ArrowLeftRight}
            label={S.detail.summary.mode}
            value={REPLACEMENT_MODE_LABEL[rr.replacement_mode as ReplacementMode]}
          />
          <DetailFact
            icon={Boxes}
            label={S.detail.summary.units}
            value={String(rr.items?.length ?? 0)}
          />
          <DetailFact
            icon={CalendarDays}
            label={S.detail.summary.raised}
            value={formatIST_date(rr.created_at)}
          />
          <DetailFact
            icon={User}
            label={S.detail.summary.raisedBy}
            value={rr.created_by_name}
          />
          <DetailFact
            icon={Ticket}
            label={S.detail.summary.ticket}
            value={rr.external_ticket_no}
          />
          <DetailFact
            icon={CalendarDays}
            label={S.detail.summary.issueDate}
            value={rr.issue_date ? formatIST_date(rr.issue_date) : null}
          />
          <DetailFact icon={Wrench} label={S.detail.summary.engineer} value={rr.engineer_name} />
        </FactGrid>
        {/* Reason + details: side by side when both exist, full width
            when alone. Long text clamps with "... Show more". */}
        {(rr.reason || rr.description) && (
          <div className="grid items-start gap-3 border-t pt-4 md:grid-cols-2">
            {rr.reason && (
              <DetailTextBlock
                icon={FileText}
                label={S.detail.summary.reason}
                text={rr.reason}
                className={cn(!rr.description && "md:col-span-2")}
              />
            )}
            {rr.description && (
              <DetailTextBlock
                icon={StickyNote}
                label={S.detail.summary.description}
                text={rr.description}
                className={cn(!rr.reason && "md:col-span-2")}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
