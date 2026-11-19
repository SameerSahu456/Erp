import { useState } from "react"

import { FormPageShell } from "@/components/page-shells/FormPageShell"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState"
import { usePermission } from "@shared/rbac"

import { AgreementDefaultsCard } from "../../components/configuration/AgreementDefaultsCard"
import { BillingScheduleCard } from "../../components/configuration/BillingScheduleCard"
import { ManualBillingRunCard } from "../../components/configuration/ManualBillingRunCard"
import { SettingsChangeHistoryCard } from "../../components/configuration/SettingsChangeHistoryCard"
import { toScheduleDraft, type ScheduleDraft } from "../../components/configuration/configuration-helpers"
// import { ReturnPolicyCard } from "../../components/early-exit/ReturnPolicyCard"  // hidden with its card
// import { PoRenewalEmailCard } from "../../components/purchase-orders/PoRenewalEmailCard"  // hidden with its card
import { CONFIGURATION_STRINGS as S } from "../../components/configuration/configuration.strings";
import { RENTALS_COMMON_STRINGS as C } from "../../components/shared/common.strings"
import { useRentalSettings, useSaveRentalSettings } from "../../hooks/configuration/useRentalSettings"
import { rentalsCan } from "../../permissions"

function RentalConfigurationPage() {
  const query = useRentalSettings()
  const save = useSaveRentalSettings()
  // Null until touched; the form reads the server row until then, so no seeding effect.
  const [edited, setEdited] = useState<ScheduleDraft | null>(null)
  const { canAny } = usePermission()
  // Two authorities on one page. Switching scheduled billing off stops
  // invoicing every customer; running it once by hand raises today's
  // invoices. Without the first the schedule is read-only, without the
  // second the manual-run card is not shown.
  const canEditSettings = canAny(rentalsCan.editSettings)
  const canRunBilling = canAny(rentalsCan.runBilling)
  const settings = query.data

  // Error first: on a failed load `settings` is absent too, which used to
  // leave the page on its loading state for good.
  if (query.isError || !settings) {
    return (
      <FormPageShell title={S.configuration.title} subtitle={S.configuration.description} hideFooter>
        {query.isError ? (
          <div className="space-y-3">
            <LoadErrorState error={query.error} fallback={S.configuration.loadError} />
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              {C.retry}
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2" aria-label={S.configuration.loading}>
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        )}
      </FormPageShell>
    )
  }

  const draft = edited ?? toScheduleDraft(settings)
  const dirty = JSON.stringify(draft) !== JSON.stringify(toScheduleDraft(settings))

  return (
    // An edit FORM: FormPageShell owns the sticky Save/Cancel bar and the
    // unsaved-changes guard on the back arrow.
    <FormPageShell
      title={S.configuration.title}
      subtitle={S.configuration.description}
      isDirty={dirty}
      saving={save.isPending}
      canSave={dirty && canEditSettings}
      saveLabel={S.configuration.save}
      onSave={() => save.mutate(draft, { onSuccess: () => setEdited(null) })}
      onCancel={() => setEdited(null)}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <BillingScheduleCard
          settings={settings}
          draft={draft}
          onChange={setEdited}
          disabled={save.isPending}
          readOnly={!canEditSettings}
        />
        {canRunBilling ? <ManualBillingRunCard /> : null}
        {/* HIDDEN (commented out 2026-11-14, restore by uncommenting): PO renewal email + Rental returns cards */}
        {/* <PoRenewalEmailCard /> */}
        {/* <ReturnPolicyCard settings={settings} /> */}
        {/* Full width: spans both columns of the grid. */}
        <div className="lg:col-span-2">
          <AgreementDefaultsCard settings={settings} />
        </div>
        <SettingsChangeHistoryCard />
      </div>
    </FormPageShell>
  )
}

export { RentalConfigurationPage }
export default RentalConfigurationPage
