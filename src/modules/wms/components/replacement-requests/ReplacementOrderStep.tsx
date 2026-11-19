import { Label } from "@/components/ui/label"
import { Typography } from "@/components/ui/typography"
import { AsyncSelect } from "@/components/ui/async-select"
import { FieldError } from "@/components/common/forms/FieldError"

import {
  useEligibleOrderOptions,
  type EligibleOrderOption,
} from "../../hooks/replacement-requests/useReplacementOrderOptions"
import type { ReplacementRequestFormState } from "../../hooks/replacement-requests/useReplacementRequestForm"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"
import { SectionCard } from "../shared/section-primitives"
import { sourceOptionDescription } from "../shared/source-option-description";
import { SourceOptionTitle } from "../shared/SourceOptionTitle";

/** 1 — Sales order */
export function ReplacementOrderStep({
  form,
}: {
  form: ReplacementRequestFormState
}) {
  return (
    <SectionCard
      step={1}
      title={S.form.order.title}
      description={S.form.order.sectionDescription}
    >
      {/* A standalone API-backed picker sits at `sm:max-w-md`, not the
          full card width (PAGE-UI §3.2). */}
      <div id="rr-field-order" className="flex w-full flex-col gap-1.5 sm:max-w-md">
        <Label required>{S.form.order.label}</Label>
        <AsyncSelect<EligibleOrderOption>
          value={form.order}
          onValueChange={form.changeOrder}
          useOptions={useEligibleOrderOptions}
          toLabel={(row) => row.so_number}
          // The order, then who it is for and what is out with them (same
          // second line as the Material Issue picker); replaceable units on
          // the right.
          renderItem={(row) => (
            <SourceOptionTitle
              number={row.so_number}
              isRental={row.is_rental}
              aside={
                <Typography variant="caption" tone="muted" numeric className="shrink-0">
                  {S.form.order.unitsEligible(row.eligible_units_count)}
                </Typography>
              }
            />
          )}
          // Who it is for and what is out with them — same second line as
          // the Material Issue picker.
          getDescription={(row) =>
            sourceOptionDescription({
              who: row.account_name,
              partsSummary: row.parts_summary,
            })
          }
          placeholder={S.form.order.placeholder}
          searchPlaceholder={S.form.order.searchPlaceholder}
          searchable
          // Fetch only when the dropdown opens, not on form load.
          loadOnOpen
          className="w-full"
        />
        <Typography variant="helper" tone="muted">
          {S.form.order.helper}
        </Typography>
        <FieldError message={form.errors.salesOrderId?.message} />
      </div>
    </SectionCard>
  )
}
