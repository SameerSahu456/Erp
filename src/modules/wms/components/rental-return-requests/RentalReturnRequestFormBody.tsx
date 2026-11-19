import { FormPageShell } from "@/components/page-shells"
import { useNavigateBack } from "@/hooks/use-navigate-back"

import { RentalReturnCustomerCard } from "./RentalReturnCustomerCard"
import {
  RentalReturnLogisticsCard,
  RentalReturnReasonCard,
} from "./RentalReturnDetailsCards"
import { RentalReturnUnitsCard } from "./RentalReturnUnitsCard"
import { RENTAL_RETURN_REQUESTS_STRINGS as S } from "./rental-return-requests.strings"
import { LIST_ROUTE } from "./rental-return-request-detail-helpers"
import { useRentalReturnForm } from "../../hooks/rental-return-requests/useRentalReturnForm"

/**
 * Raise a rental return for specific units, as a sales return is raised:
 * customer → order → tick the units coming back. Each ticked unit is its
 * own request line pinned to that unit, and inward receives only those
 * (a same-model unit on the same order line may stand in); anything else
 * is held for review.
 */
export function RentalReturnRequestFormBody() {
  // Cancel / back return to where the operator came from (§10).
  const navigateBack = useNavigateBack(LIST_ROUTE)
  const state = useRentalReturnForm()
  const { form, selectedCount } = state

  return (
    <FormPageShell
      title={S.form.title}
      subtitle={S.form.subtitle}
      backHref={LIST_ROUTE}
      guard={state.guard}
      onCancel={navigateBack}
      onSave={() => void state.submit()}
      saveLabel={S.form.submit}
      saving={state.saving}
      canSave={selectedCount > 0}
      footerLeft={selectedCount > 0 ? S.form.unitsStep.selectedCount(selectedCount) : undefined}
    >
      <div className="space-y-6">
        <RentalReturnCustomerCard
          form={form}
          account={state.account}
          pickAccount={state.pickAccount}
          orders={state.orders}
          orderId={state.orderId}
          pickOrder={state.pickOrder}
        />
        <RentalReturnUnitsCard
          form={form}
          orderId={state.orderId}
          units={state.units}
          unitsQuery={state.unitsQuery}
          selected={state.selected}
          selectedCount={selectedCount}
          toggleUnit={state.toggleUnit}
          setManyUnits={state.setManyUnits}
          lockedUnit={state.lockedUnit}
          unlockUnits={state.unlockUnits}
        />
        <RentalReturnReasonCard form={form} />
        <RentalReturnLogisticsCard form={form} returnDateFloor={state.returnDateFloor} />
      </div>
    </FormPageShell>
  )
}
