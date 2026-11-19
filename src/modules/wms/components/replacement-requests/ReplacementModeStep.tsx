import { Controller } from "react-hook-form"
import { RotateCcw, Truck } from "lucide-react"

import type { ReplacementRequestFormState } from "../../hooks/replacement-requests/useReplacementRequestForm"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"
import { SectionCard, SegmentedToggle } from "../shared/section-primitives"

/** 3 — How it is handled */
export function ReplacementModeStep({
  form,
}: {
  form: ReplacementRequestFormState
}) {
  return (
    <SectionCard
      step={3}
      title={S.form.mode.title}
      description={S.form.mode.sectionDescription}
    >
      <Controller
        control={form.control}
        name="replacementMode"
        render={({ field }) => (
          <SegmentedToggle
            value={field.value}
            onSelect={(next) => field.onChange(next)}
            options={[
              {
                value: "normal",
                label: S.form.mode.normal,
                hint: S.form.mode.normalDesc,
                icon: RotateCcw,
              },
              {
                value: "advance",
                label: S.form.mode.advance,
                hint: form.partComesIn
                  ? S.form.mode.advanceUnavailable
                  : S.form.mode.advanceDesc,
                icon: Truck,
                disabled: form.partComesIn,
              },
            ]}
          />
        )}
      />
    </SectionCard>
  )
}
