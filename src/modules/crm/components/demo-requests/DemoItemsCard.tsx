/**
 * The "Demo items" card — part search + line table. Fully controlled: the
 * parent owns the `DraftLine[]` state and passes `value` / `onChange`.
 *
 * Shared by `DemoRequestFormPage` (standalone) and `ClosedWonDemoForm`
 * (Closed Won → Demo Request branch).
 */
import { Package } from 'lucide-react'
import { partOptionDescription } from '@modules/ims'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { FieldError } from '@/components/common/forms/FieldError'
import { AsyncSelect } from '@/components/ui/async-select'
import { Typography } from '@/components/ui/typography'
import { useVariantsListInfinite, type VariantListItem } from '@/modules/ims'

import { variantConditionLabel } from '../../constants/variant-condition'
import { type DraftLine } from './demo-items'
import { DEMO_REQUESTS_STRINGS as S, EN_IN_LOCALE, formatRupees } from './demo-requests.strings'
import { useDemoLines } from './useDemoLines'
import { DemoLineRow } from './DemoLineRow'

export function DemoItemsCard({
  value,
  onChange,
  error,
}: {
  value: DraftLine[]
  onChange: (next: DraftLine[]) => void
  error?: string
}) {
  const lines = value
  const { addVariant, updateLine, removeLine, totals } = useDemoLines(
    lines,
    onChange,
  )
  const { totalQty, totalAmount } = totals

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet/10 text-violet">
            <Package className="size-4" strokeWidth={2} />
          </span>
          <div>
            <CardTitle>{S.form.items.title}</CardTitle>
            <CardDescription>
              {S.form.items.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-4">
        {/* Search bar */}
        <AsyncSelect<VariantListItem>
          value={null}
          onValueChange={() => {}}
          onItemPick={addVariant}
          useOptions={useVariantsListInfinite}
          toLabel={(variant) => variant.part_number}
          getDescription={partOptionDescription}
          placeholder={S.form.items.searchPlaceholder}
          searchPlaceholder={S.form.items.searchInputPlaceholder}
          clearable={false}
          loadOnOpen
          renderItem={(variant) => (
            <div className="min-w-0">
              <Typography variant="body-strong" truncate asChild>
                <div>{variant.part_name}</div>
              </Typography>
              <Typography variant="helper" truncate asChild>
                <div>
                  {variantConditionLabel(variant.condition)} ·{' '}
                  {variant.available_stock_qty} {S.form.items.availableSuffix} ·{' '}
                  {variant.part_number} · {variant.oem_name} ·{' '}
                  {variant.category_name}
                  {variant.sell_price
                    ? ` · ₹${Number(variant.sell_price).toLocaleString(EN_IN_LOCALE)}`
                    : ''}
                </div>
              </Typography>
            </div>
          )}
        />

        {/* Lines */}
        {lines.length === 0 ? (
          <div
            className={`rounded-md border ${error ? 'border-destructive/60 bg-destructive/5' : 'border-dashed bg-muted/20'} px-4 py-8 text-center`}
          >
            <Package className="mx-auto size-6 text-muted-foreground/60" />
            <Typography variant="body" tone="muted" className="mt-2">{S.form.items.empty}</Typography>
            <Typography variant="helper" className="mt-0.5" asChild>
              <p>{S.form.items.emptyHint}</p>
            </Typography>
            <FieldError id="demo-items-error" message={error} className="mt-2" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{S.form.items.partColumn}</th>
                  {/* Brand/OEM + Condition — the two PM-routing dimensions the
                      line sends. Read-only: a demo line is always variant-backed,
                      so the variant IS the answer (the Sales Order form locks
                      these same two pickers on a catalog row for the same
                      reason). */}
                  <th className="w-40 px-3 py-2 text-left font-medium">{S.form.items.oemColumn}</th>
                  <th className="w-32 px-3 py-2 text-left font-medium">
                    {S.form.items.conditionColumn}
                  </th>
                  <th className="w-24 px-3 py-2 text-right font-medium">{S.form.items.qtyColumn}</th>
                  <th className="w-36 px-3 py-2 text-right font-medium">
                    {S.form.items.unitPriceColumn}
                  </th>
                  <th className="w-20 px-3 py-2 text-right font-medium">
                    {S.form.items.taxColumn}
                  </th>
                  <th className="w-32 px-3 py-2 text-right font-medium">
                    {S.form.items.amountColumn}
                  </th>
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {lines.map((line) => (
                  <DemoLineRow
                    key={line.id}
                    line={line}
                    onChangeLine={(patch) => updateLine(line.id, patch)}
                    onRemoveLine={() => removeLine(line.id)}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30">
                  {/* Part + Brand/OEM + Condition + Qty — bumped from 2 when the
                      two routing columns were added; a stale colSpan here shifts
                      the Total label out from under the Amount column. */}
                  <td
                    className="px-3 py-2 text-xs text-muted-foreground"
                    colSpan={4}
                  >
                    {S.form.items.footerSummary(totalQty, lines.length)}
                  </td>
                  <td
                    className="px-3 py-2 text-right text-xs text-muted-foreground"
                    colSpan={2}
                  >
                    {S.form.items.totalLabel}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {formatRupees(totalAmount)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
