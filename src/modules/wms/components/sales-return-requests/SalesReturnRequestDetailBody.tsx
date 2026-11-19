import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/feedback/EmptyState"
import { FormCardSkeleton } from "@/components/common/feedback/FormCardSkeleton"
import { DetailPageShell } from "@/components/page-shells"
import { isForbidden } from "@shared/api/envelope"
import { NoAccess } from "@/shared/components/feedback/NoAccess"

import { useSalesReturnRequestDetail } from "../../hooks/sales-return-requests/useSalesReturnRequestDetail"
import {
  SALES_RETURN_DOC_TYPES,
  SALES_RETURN_STATUS_LABEL,
  SALES_RETURN_STATUS_VARIANT,
  type SalesReturnStatus,
} from "../../constants/sales-return-status"
import { SALES_RETURN_REQUESTS_STRINGS as S } from "./sales-return-requests.strings"
import { LIST_ROUTE } from "./sales-return-request-form-helpers"
import {
  SalesReturnCancelReasonCallout,
  SalesReturnOverviewCard,
} from "./SalesReturnOverviewCard"
import { SalesReturnLogisticsCard } from "./SalesReturnLogisticsCard"
import { SalesReturnLinesCard } from "./SalesReturnLinesCard"
import { EntityDocumentsCard } from "../shared/EntityDocumentsCard"
import { SalesReturnDecisionDialogs } from "./SalesReturnDecisionDialogs"
import { SalesReturnLogisticsDialog } from "./SalesReturnLogisticsDialog"

export function SalesReturnRequestDetailBody() {
  const state = useSalesReturnRequestDetail()
  const { detailQuery, sret } = state

  if (detailQuery.isLoading) {
    return (
      <DetailPageShell title={S.detail.backToList} backHref={LIST_ROUTE}>
        <FormCardSkeleton />
      </DetailPageShell>
    )
  }

  if (isForbidden(detailQuery.error)) {
    // 403 — a no-access page, never the record or a generic load error.
    return (
      <DetailPageShell title={S.detail.backToList} backHref={LIST_ROUTE}>
        <NoAccess />
      </DetailPageShell>
    )
  }
  if (detailQuery.isError) {
    // A fetch failure is not a missing record (§12): offer a Retry.
    return (
      <DetailPageShell title={S.detail.error.title} backHref={LIST_ROUTE}>
        <EmptyState
          title={S.detail.error.title}
          description={S.detail.error.description}
          action={{
            label: S.detail.error.retry,
            onClick: () => void detailQuery.refetch(),
          }}
        />
      </DetailPageShell>
    )
  }
  if (!sret) {
    return (
      <DetailPageShell title={S.detail.notFound.title} backHref={LIST_ROUTE}>
        <EmptyState
          title={S.detail.notFound.title}
          description={S.detail.notFound.description}
        />
      </DetailPageShell>
    )
  }

  return (
    <DetailPageShell
      title={sret.request_number}
      // Customer + status in the header, like the Dispatch detail page, so
      // the page reads at a glance before any card.
      subtitle={sret.account_name ?? undefined}
      status={{
        label:
          SALES_RETURN_STATUS_LABEL[sret.status as SalesReturnStatus] ??
          sret.status,
        variant:
          SALES_RETURN_STATUS_VARIANT[sret.status as SalesReturnStatus] ??
          "neutral",
      }}
      backHref={LIST_ROUTE}
      actions={
        state.canCancel ? (
          <Button variant="outline" onClick={() => state.setCancelOpen(true)}>
            {S.detail.cancel.action}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {sret.cancel_reason && (
          <SalesReturnCancelReasonCallout cancelReason={sret.cancel_reason} />
        )}

        <SalesReturnOverviewCard sret={sret} />

        <SalesReturnLogisticsCard
          sret={sret}
          canEdit={state.logisticsEditable && state.isWarehouseUser}
          onEdit={state.openLogisticsEditor}
        />

        {sret.pickup_by === "customer" && (
          <EntityDocumentsCard
            entityType="sales_return_requests"
            entityId={sret.id}
            docTypes={SALES_RETURN_DOC_TYPES}
            title={S.detail.documents.title}
            uploadedSummary={S.detail.documents.uploaded}
            editable={state.isWarehouseUser}
          />
        )}

        <SalesReturnLinesCard {...state} sret={sret} />
      </div>

      <SalesReturnDecisionDialogs {...state} />

      <SalesReturnLogisticsDialog {...state} />
    </DetailPageShell>
  )
}
