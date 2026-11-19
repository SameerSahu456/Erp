import { AsyncSelect } from "@/components/ui/async-select"
import { Label } from "@/components/ui/label"
import { FieldError } from "@/components/common/forms/FieldError"
import { useVariantsListInfinite, type VariantListItem, partOptionDescription } from "@modules/ims"

import type { ReplacementUnitSelection } from "./replacement-request-form.schema"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"

const U = S.form.units

/** "The same part" on a unit migrated with no dispatch record: its order line
 *  names no catalog part, so the operator says which part it is — that part
 *  ships again, at the unit's current rent. */
export function LegacyUnitPartField({
  pick,
  error,
  onPatch,
}: {
  pick: ReplacementUnitSelection
  error: string | undefined
  onPatch: (patch: Partial<ReplacementUnitSelection>) => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label required>{U.legacyPartLabel}</Label>
      {/* An API-backed picker (§16.11). */}
      <AsyncSelect<VariantListItem>
        value={
          pick.replacedVariantId
            ? { id: pick.replacedVariantId, label: pick.replacedVariantLabel ?? "" }
            : null
        }
        onValueChange={(next) =>
          onPatch({ replacedVariantId: next?.id ?? null, replacedVariantLabel: next?.label })
        }
        useOptions={useVariantsListInfinite}
        toLabel={(v) => v.display_title}
        getDescription={partOptionDescription}
        placeholder={U.legacyPartPlaceholder}
        searchPlaceholder={U.substituteSearchPlaceholder}
        searchable
        className="w-full"
      />
      <FieldError message={error} />
    </div>
  )
}
