import { useNavigate, useParams } from "react-router-dom"

import { EmptyState } from "@/components/common/feedback/EmptyState"
import { asUuid } from "@shared/lib/validation"

import { RentalScanBody } from "../../components/inwards/rental-scan/RentalScanBody"
import { INWARDS_STRINGS } from "../../components/inwards/inwards.strings"

function RentalScanPage() {
  const navigate = useNavigate()
  // §11.1 — `:id` is untrusted; a malformed one never reaches the API.
  const id = asUuid(useParams().id)
  if (!id) {
    return (
      <EmptyState
        title={INWARDS_STRINGS.batchNotFound.title}
        description={INWARDS_STRINGS.batchNotFound.description}
        action={{
          label: INWARDS_STRINGS.batchNotFound.backToInward,
          onClick: () => navigate("/wms/inward"),
        }}
      />
    )
  }
  return <RentalScanBody batchId={id} />
}

export default RentalScanPage
