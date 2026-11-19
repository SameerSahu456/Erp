import { AsyncSelect } from "@/components/ui/async-select";
import { partOptionDescription } from "../../lib/part-description"

import type { VariantListItem } from "../../api";
import { useVariantsListInfinite } from "../../hooks/variants/useVariants";
import { adjustmentItemLabel } from "../../lib/stock-adjustment-labels";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

const variantLabel = (v: VariantListItem) =>
  adjustmentItemLabel(v.sku_code, v.display_title || S.line.variantName(v.part_name, v.name));

/** Server-searched variant picker (§16.11) — active variants, SKU first. */
export function AdjustmentVariantPicker({
  id,
  value,
  label,
  onChange,
}: {
  id?: string;
  value: string;
  label: string;
  onChange: (id: string, label: string) => void;
}) {
  return (
    <AsyncSelect<VariantListItem>
      id={id}
      value={value ? { id: value, label } : null}
      onValueChange={(opt) => onChange(opt?.id ?? "", opt?.label ?? "")}
      useOptions={useVariantsListInfinite}
      toLabel={variantLabel}
      getDescription={partOptionDescription}
      placeholder={S.line.variantPlaceholder}
      searchPlaceholder={S.line.variantPlaceholder}
      className="w-full"
      clearable
      chevron="down"
      loadOnOpen
    />
  );
}
