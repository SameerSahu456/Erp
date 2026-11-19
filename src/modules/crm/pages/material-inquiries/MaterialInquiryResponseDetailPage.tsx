import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { TimestampFooter } from "@/components/common/display/TimestampFooter"
import { EntityHeader } from "@/components/page-shells/EntityHeader"

import { MIResponseCoverageCard } from "../../components/material-inquiries/MIResponseCoverageCard"
import { MIResponseHeroStats } from "../../components/material-inquiries/MIResponseHeroStats"
import { MIResponseOfferDecisionCards } from "../../components/material-inquiries/MIResponseOfferDecisionCards"
import { MIResponseSidebar } from "../../components/material-inquiries/MIResponseSidebar"
import { MATERIAL_INQUIRIES_STRINGS as S } from "../../components/material-inquiries/material-inquiries.strings"
import {
  MI_RESPONSE_PM_STATUS_LABELS,
  MI_RESPONSE_PM_STATUS_VARIANT,
} from "../../constants/mi-response-status"
import { useMIResponseDetail } from "../../hooks/material-inquiries/useMIResponseDetail"

function MaterialInquiryResponseDetailPage() {
  const detail = useMIResponseDetail()
  const { response, backHref } = detail

  if (detail.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-sm text-muted-foreground">{S.responseDetail.loading}</p>
      </div>
    )
  }

  // The full-view endpoint requires backend PROCUREMENT_READ; a sales user
  // without it gets a 403.
  if (detail.isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="font-display text-xl font-semibold">
          {S.responseDetail.loadErrorTitle}
        </h2>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {detail.error instanceof Error
            ? detail.error.message
            : S.responseDetail.loadErrorDescription}
        </p>
        <Button variant="outline" render={<Link to={backHref} />}>
          {S.responseDetail.back}
        </Button>
      </div>
    )
  }

  if (!response) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="font-display text-xl font-semibold">{S.responseDetail.notFoundTitle}</h2>
        <p className="text-sm text-muted-foreground">
          {S.responseDetail.notFoundDescription}
        </p>
        <Button variant="outline" render={<Link to={backHref} />}>
          {S.responseDetail.back}
        </Button>
      </div>
    )
  }

  const status = response.pm_status

  return (
    <div className="space-y-6">
      <EntityHeader
        title={S.responseDetail.title(response.vendor.name)}
        subtitle={S.responseDetail.subtitle(response.vendor.code)}
        backHref={backHref}
        status={{
          label: MI_RESPONSE_PM_STATUS_LABELS[status] ?? status,
          variant: MI_RESPONSE_PM_STATUS_VARIANT[status] ?? "neutral",
        }}
      />

      <MIResponseHeroStats
        response={response}
        item={detail.item}
        qtyRequested={detail.qtyRequested}
        totalCost={detail.totalCost}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column — details */}
        <div className="space-y-4 lg:col-span-2">
          {detail.item && <MIResponseCoverageCard detail={detail} response={response} />}
          <MIResponseOfferDecisionCards detail={detail} response={response} />
        </div>

        {/* Right column — context */}
        <MIResponseSidebar detail={detail} response={response} />
      </div>

      <TimestampFooter
        createdAt={response.created_at}
        updatedAt={response.updated_at}
      />
    </div>
  )
}

export { MaterialInquiryResponseDetailPage }
export default MaterialInquiryResponseDetailPage
