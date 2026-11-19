import { Link } from "react-router-dom"
import {
  Building2,
  Calendar,
  FlaskConical,
  Mail,
  Package,
  Phone,
  Send,
  Tag as TagIcon,
  User,
} from "lucide-react"

import { formatIST_date } from "@shared/lib/date"

import { InfoRow, SectionCard } from "./SoDetailPrimitives"
import type { SalesOrderWire, SOOrderableType, SOOrderType } from "../../../api"
import { useDemoRequest } from "../../../hooks/demo-requests/useDemoRequests"
import type { SalesOrderDetailController } from "../../../hooks/sales-orders/useSalesOrderDetail"
import { SO_ORDER_TYPE_LABELS, SO_ORDERABLE_LABELS } from "../../../constants/so-status"
import { SALES_ORDERS_STRINGS as S } from "../sales-orders.strings"

// Shown only when the SO was converted from a demo — links to that demo, where
// the material issue + dispatch that fulfilled these units live.
function DemoSourceRow({ demoRequestId }: { demoRequestId: string }) {
  const demoQuery = useDemoRequest(demoRequestId)
  return (
    <InfoRow icon={FlaskConical} label={S.detail.info.demoRequest}>
      <Link to={`/crm/demo-requests/${demoRequestId}`} className="text-primary hover:underline">
        <span className="tabular-nums">{demoQuery.data?.demo_number ?? "…"}</span>
      </Link>
    </InfoRow>
  )
}

// Path prefix per orderable_type — used to link back to the source entity
// from the "Source" InfoRow. Keep in lockstep with the route module (router.tsx).
const ORDERABLE_HREF: Record<SOOrderableType, string> = {
  lead: "/crm/leads",
  deal: "/crm/deals",
  account: "/crm/accounts",
}

export function SoInfoSections({
  so,
  detail,
}: {
  so: SalesOrderWire
  detail: SalesOrderDetailController
}) {
  const { accountQuery, contactQuery, sourceCode, sourceLoading } = detail

  // Attribution names come embedded on the SO itself (`submitted_by_detail` /
  // `created_by_detail`) — the detail response resolves them server-side. This
  // replaced a `useUser(so.submitted_by_id)` call, which cost an extra request
  // and rendered "Loading…" in the row until it returned.

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <SectionCard title={S.detail.sections.orderInformation}>
        <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          <InfoRow icon={Building2} label={S.detail.info.companyName}>
            {accountQuery.data ? (
              <Link
                to={`/crm/accounts/${so.account_id}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {accountQuery.data.name}
              </Link>
            ) : (
              <span className="text-muted-foreground">
                {accountQuery.isLoading ? S.detail.info.loading : "—"}
              </span>
            )}
          </InfoRow>
          <InfoRow icon={Calendar} label={S.detail.info.saleDate}>
            {formatIST_date(so.created_at)}
          </InfoRow>
          <InfoRow icon={Package} label={S.detail.info.orderType}>
            <span>
              {so.order_type?.[0]
                ? SO_ORDER_TYPE_LABELS[so.order_type[0] as SOOrderType] ??
                  so.order_type[0]
                : "—"}
            </span>
          </InfoRow>
          {so.submitted_at && (
            <InfoRow icon={Send} label={S.detail.info.submitted}>
              {formatIST_date(so.submitted_at)}
            </InfoRow>
          )}
          {so.submitted_by_id && (
            <InfoRow icon={User} label={S.detail.info.submittedBy}>
              {so.submitted_by_detail?.name ?? "—"}
            </InfoRow>
          )}
          {/* Created By has no `submitted_at`-style guard — every SO has a
              creator, so the row always renders. */}
          <InfoRow icon={User} label={S.detail.info.createdBy}>
            {so.created_by_detail?.name ?? "—"}
          </InfoRow>
        </dl>
      </SectionCard>

      <SectionCard title={S.detail.sections.contactInformation}>
        <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          <InfoRow icon={User} label={S.detail.info.contactName}>
            {contactQuery.data ? (
              <Link
                to={`/crm/contacts/${so.contact_id}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {contactQuery.data.name}
              </Link>
            ) : (
              <span className="text-muted-foreground">
                {contactQuery.isLoading ? S.detail.info.loading : "—"}
              </span>
            )}
          </InfoRow>
          <InfoRow icon={Phone} label={S.detail.info.contactNumber}>
            {contactQuery.data?.phone ? (
              <a
                href={`tel:${contactQuery.data.phone}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {contactQuery.data.phone}
              </a>
            ) : (
              "—"
            )}
          </InfoRow>
          <InfoRow icon={Mail} label={S.detail.info.email}>
            {contactQuery.data?.email ? (
              <a
                href={`mailto:${contactQuery.data.email}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {contactQuery.data.email}
              </a>
            ) : (
              "—"
            )}
          </InfoRow>
          <InfoRow icon={TagIcon} label={S.detail.info.source}>
            <Link
              to={`${ORDERABLE_HREF[so.orderable_type]}/${so.orderable_id}`}
              className="text-primary hover:underline"
              title={S.list.openOrderable(`${SO_ORDERABLE_LABELS[so.orderable_type]} ${sourceCode ?? ""}`.trim())}
            >
              <span className="tabular-nums">
                {sourceCode ?? (sourceLoading ? "…" : SO_ORDERABLE_LABELS[so.orderable_type])}
              </span>
            </Link>
          </InfoRow>
          {so.source_demo_request_id ? (
            <DemoSourceRow demoRequestId={so.source_demo_request_id} />
          ) : null}
        </dl>
      </SectionCard>
    </div>
  )
}
