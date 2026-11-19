import { Typography } from "@/components/ui/typography";
import { AsyncSelect, type AsyncSelectOption } from "@/components/ui/async-select";
import { CategoryPicker } from "@/components/common/pickers/CategoryPicker";

import { useOEMOptions } from "../../hooks/oems/useOEMs";
import { STOCK_STRINGS } from "./stock.strings";

const F = STOCK_STRINGS.filters;
// BMT's "no filter" sentinel for a custom renderFilter control.
const ALL = "__all__";
const TRIGGER_CLASS = "h-9 rounded-[7px] border-input bg-card px-[10px] shadow-xs";

interface FilterProps {
  value: string | undefined;
  onChange: (next: string) => void;
}

/** Active categories only — a retired category is no stock-filter choice. */
export function StockCategoryFilter({ value, onChange }: FilterProps) {
  return (
    <div className="w-[190px]">
      <Typography asChild variant="body-sm">
        <CategoryPicker
          value={value ?? ""}
          onChange={(id) => onChange(id || ALL)}
          placeholder={F.allCategory}
          allowAll
          shape="short"
          isActive
          className={TRIGGER_CLASS}
          clearable
        />
      </Typography>
    </div>
  );
}

/** §16.11 API-backed OEM dropdown: infinite query + debounced server search. */
export function StockOemFilter({
  onChange,
  option,
  onOptionChange,
}: Omit<FilterProps, "value"> & {
  option: AsyncSelectOption | null;
  onOptionChange: (o: AsyncSelectOption | null) => void;
}) {
  return (
    <div className="w-[190px]">
      <Typography asChild variant="body-sm">
        <AsyncSelect
          value={option}
          onValueChange={(opt) => {
            onOptionChange(opt);
            onChange(opt?.id ?? ALL);
          }}
          useOptions={useOEMOptions}
          toLabel={(o) => o.name}
          placeholder={F.allOems}
          searchPlaceholder={F.searchOems}
          className={`${TRIGGER_CLASS} w-full`}
          clearable
          chevron="down"
        />
      </Typography>
    </div>
  );
}
