import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { CommentSection } from "@/components/common/views/CommentSection"
import { TimestampFooter } from "@/components/common/display/TimestampFooter"
import { DetailTabs } from "@/components/page-shells/DetailTabs"
import { EntityHeader } from "@/components/page-shells/EntityHeader"

import { MIDetailHeaderActions } from "../../components/material-inquiries/MIDetailHeaderActions"
import { MIRequestTab } from "../../components/material-inquiries/MIRequestTab"
import { MIResponsesTab } from "../../components/material-inquiries/MIResponsesTab"
import { MATERIAL_INQUIRIES_STRINGS as S } from "../../components/material-inquiries/material-inquiries.strings"
import {
  MATERIAL_INQUIRY_STATUS_LABELS,
  MATERIAL_INQUIRY_STATUS_VARIANT,
} from "../../constants/material-inquiry-status"
import { useMaterialInquiryDetail } from "../../hooks/material-inquiries/useMaterialInquiryDetail"

function MaterialInquiryDetailPage() {
  const detail = useMaterialInquiryDetail()
  const mi = detail.mi

  if (detail.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-sm text-muted-foreground">
          {S.detail.loading}
        </p>
      </div>
    )
  }

  if (detail.isError || !mi) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="font-display text-xl font-semibold">
          {S.detail.notFoundTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {detail.error instanceof Error
            ? detail.error.message
            : S.detail.notFoundDescription}
        </p>
        <Button variant="outline" render={<Link to="/crm/material-inquiries" />}>
          {S.detail.back}
        </Button>
      </div>
    )
  }

  const tabs = [
    { id: "request", label: S.detail.tabs.request, content: <MIRequestTab mi={mi} categoryNameById={detail.categoryNameById} /> },
    { id: "responses", label: S.detail.tabs.responses, content: <MIResponsesTab mi={mi} /> },
    {
      id: "comments",
      label: S.detail.tabs.comments,
      content: <CommentSection entityType="material_inquiry" entityId={mi.id} />,
    },
    /* Chat-style "Messages" tab — commented out; restore to swap the standard
       Comments tab above for the pinned-chat messaging layout.
    {
      id: "comments",
      label: S.detail.tabs.messages,
      content: (
        <CommentSection
          entityType="material_inquiry"
          entityId={mi.id}
          variant="chat"
          placeholder={S.detail.messagePlaceholder}
          noun={{
            singular: S.detail.messageNounSingular,
            plural: S.detail.messageNounPlural,
          }}
        />
      ),
    },
    */
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        sticky
        title={mi.enquiry_number}
        titleCopyable
        subtitle={mi.description ?? S.detail.noDescription}
        status={{
          label: MATERIAL_INQUIRY_STATUS_LABELS[mi.status] ?? mi.status,
          variant: MATERIAL_INQUIRY_STATUS_VARIANT[mi.status] ?? "neutral",
        }}
        backHref="/crm/material-inquiries"
        actions={<MIDetailHeaderActions mi={mi} detail={detail} />}
      />

      <DetailTabs cardContent tabs={tabs} defaultTab="request" />

      <TimestampFooter
        createdAt={mi.created_at}
        updatedAt={mi.updated_at}
      />
    </div>
  )
}

export { MaterialInquiryDetailPage }
export default MaterialInquiryDetailPage
