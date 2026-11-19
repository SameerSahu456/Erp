import { AsyncSelect } from "@/components/ui/async-select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FieldError } from "@/components/common/forms/FieldError"
import { useNumberField } from "@/hooks/use-number-field"
import { useVariantsListInfinite, type VariantListItem, partOptionDescription } from "@modules/ims"

import type { ReplacementUnitSelection } from "./replacement-request-form.schema"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"

const U = S.form.units

/** "A different part": the substitute and its rate. */
export function ReplacementSubstituteFields({
  pick,
  error,
  onPatch,
}: {
  pick: ReplacementUnitSelection
  error: string | undefined
  onPatch: (patch: Partial<ReplacementUnitSelection>) => void
}) {
  const rateField = useNumberField(
    pick.replacementRate ?? 0,
    (n) => onPatch({ replacementRate: n }),
    { decimal: true },
  )
  return (
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label required>{U.substituteLabel}</Label>
                {/* An API-backed picker (§16.11). */}
                <AsyncSelect<VariantListItem>
                  value={
                    pick.replacementVariantId
                      ? { id: pick.replacementVariantId, label: pick.replacementVariantLabel ?? "" }
                      : null
                  }
                  onValueChange={(next) =>
                    onPatch({
                      replacementVariantId: next?.id,
                      replacementVariantLabel: next?.label,
                    })
                  }
                  useOptions={useVariantsListInfinite}
                  toLabel={(v) => v.display_title}
                  getDescription={partOptionDescription}
                  placeholder={U.substitutePlaceholder}
                  searchPlaceholder={U.substituteSearchPlaceholder}
                  searchable
                  className="w-full"
                />
                <FieldError message={error} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label required>{U.rateLabel}</Label>
                {/* Money input — numeric, right-aligned (§3.2). */}
                <Input {...rateField} className="w-full text-right" />
              </div>
            </div>
  )
}
