import { Navigate, useNavigate, useParams } from "react-router-dom"

import { EmptyState } from "@/components/common/feedback/EmptyState"
import { asUuid } from "@shared/lib/validation"

import { InwardFormBody } from "../../components/inwards/InwardFormBody"
import { INWARDS_STRINGS } from "../../components/inwards/inwards.strings"
import { useGrnBatch } from "../../hooks/inwards/useInwards"

function InwardFormPage() {
  // Edit mode when an :id is present — reopen the draft to edit its line items.
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  // §11.1 — `:id` is untrusted. A malformed id keeps the batch query disabled
  // (empty id) and falls through to the edit-not-found guard below, so the
  // backend never sees a non-UUID it would answer with a 422.
  const validId = asUuid(id) ?? ""
  const { data: batch, isLoading, isError } = useGrnBatch(validId)

  if (isEdit && isLoading) {
    return <div className="h-64 w-full animate-pulse rounded-md bg-muted" />
  }
  if (isEdit && (isError || !batch)) {
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

  // A rental return is scanned box by box against the customer's units on
  // rent, so its draft is edited on the scan screen, not the line wizard.
  if (isEdit && batch?.inward_type === "rental_return") {
    return <Navigate to={`/wms/inward/${batch.id}/rental-scan`} replace />
  }

  return <InwardFormBody editBatch={isEdit ? batch : undefined} />
}

export default InwardFormPage
