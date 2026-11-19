import { FormPageShell } from "@/components/page-shells"

import { useSalesReturnRequestForm } from "../../hooks/sales-return-requests/useSalesReturnRequestForm"
import { SALES_RETURN_REQUESTS_STRINGS as S } from "./sales-return-requests.strings"
import { LIST_ROUTE } from "./sales-return-request-form-helpers"
import { SalesReturnOrderSection } from "./SalesReturnOrderSection"
import { SalesReturnUnitsSection } from "./SalesReturnUnitsSection"
import { SalesReturnLogisticsSection } from "./SalesReturnLogisticsSection"

export function SalesReturnRequestFormBody() {
  const state = useSalesReturnRequestForm()
  const { guard, navigateBack, submit, createMutation, selectedUnits } = state

  return (
    <FormPageShell
      title={S.form.title}
      subtitle={S.form.subtitle}
      backHref={LIST_ROUTE}
      guard={guard}
      onCancel={navigateBack}
      onSave={() => void submit()}
      saveLabel={
        selectedUnits.length > 0
          ? S.form.raiseButton(selectedUnits.length)
          : S.form.submit
      }
      saving={createMutation.isPending}
      canSave={selectedUnits.length > 0}
    >
      {/* Titled cards in the Purchase Return form's grammar (icon + title). */}
      <div className="-mt-2 space-y-4">
        <SalesReturnOrderSection {...state} />

        <SalesReturnUnitsSection {...state} />

        {/* Logistics — warehouse-only. A CRM raiser never sees this section;
            the warehouse fills it later on the detail page. */}
        {state.canSeeLogistics && <SalesReturnLogisticsSection {...state} />}
      </div>
    </FormPageShell>
  )
}
