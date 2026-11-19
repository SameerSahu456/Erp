import { Typography } from "@/components/ui/typography";
import { AsyncSelect, type AsyncSelectOption } from "@/components/ui/async-select";
import { CategoryPicker } from "@/components/common/pickers/CategoryPicker";

import { useOEMOptions } from "../../hooks/oems/useOEMs";
import { PARTS_STRINGS } from "./parts.strings";

const P = PARTS_STRINGS.list.filterPlaceholders;
// BMT's "no filter" sentinel for a custom renderFilter control.
const ALL = "__all__";
const TRIGGER_CLASS = "h-9 rounded-[7px] border-input bg-card px-[10px] shadow-xs";

interface FilterProps {
  value: string | undefined;
  onChange: (next: string) => void;
}

/** Active categories only — a retired category is no filter choice. */
export function PartsCategoryFilter({ value, onChange }: FilterProps) {
  return (
    <div className="w-[190px]">
      <Typography asChild variant="body-sm">
        <CategoryPicker
          value={value ?? ""}
          onChange={(id) => onChange(id || ALL)}
          placeholder={P.allCategory}
          allowAll
          shape="short"
          isActive
          className={TRIGGER_CLASS}
        />
      </Typography>
    </div>
  );
}

/** §16.11 API-backed OEM dropdown; the picked option is held by the view hook. */
export function PartsOemFilter({
  value,
  onChange,
  option,
  onOptionChange,
}: FilterProps & { option: AsyncSelectOption | null; onOptionChange: (o: AsyncSelectOption | null) => void }) {
  return (
    <div className="w-[190px]">
      <Typography asChild variant="body-sm">
        <AsyncSelect
          value={value && option?.id === value ? option : null}
          onValueChange={(opt) => {
            onOptionChange(opt);
            onChange(opt?.id ?? ALL);
          }}
          useOptions={useOEMOptions}
          toLabel={(o) => o.name}
          placeholder={P.allBrandOem}
          searchPlaceholder={P.searchBrandOem}
          className={`${TRIGGER_CLASS} w-full`}
          clearable
          chevron="down"
        />
      </Typography>
    </div>
  );
}
