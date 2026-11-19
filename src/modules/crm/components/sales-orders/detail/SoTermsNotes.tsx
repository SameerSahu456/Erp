import { SectionCard } from "./SoDetailPrimitives"
import type { SalesOrderWire } from "../../../api"
import { SALES_ORDERS_STRINGS as S } from "../sales-orders.strings"

export function SoTermsNotes({ so }: { so: SalesOrderWire }) {
  if (
    !so.payment_terms &&
    !so.warranty &&
    !so.delivery &&
    !so.terms_conditions &&
    !so.notes
  ) {
    return null
  }

  return (
    <SectionCard title={S.detail.sections.termsNotes}>
      <div className="space-y-4">
        {so.payment_terms && (
          <div>
            <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              {S.detail.terms.paymentTerms}
            </h4>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {so.payment_terms}
            </p>
          </div>
        )}
        {so.warranty && (
          <div>
            <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              {S.detail.terms.warranty}
            </h4>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {so.warranty}
            </p>
          </div>
        )}
        {so.delivery && (
          <div>
            <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              {S.detail.terms.delivery}
            </h4>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {so.delivery}
            </p>
          </div>
        )}
        {so.terms_conditions && (
          <div>
            <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              {S.detail.terms.termsConditions}
            </h4>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {so.terms_conditions}
            </p>
          </div>
        )}
        {so.notes && (
          <div>
            <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              {S.detail.terms.notes}
            </h4>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {so.notes}
            </p>
          </div>
        )}
      </div>
    </SectionCard>
  )
}
