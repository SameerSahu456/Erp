import { cn } from "@/lib/utils";
import { MultiSelect } from "@/components/ui/multi-select";

import {
  DEVICE_STATUS_FILTER_OPTIONS,
  deviceStatusFilterLabel,
} from "../../constants/device-tracking";
import { FilterSelect } from "../shared/filters/FilterSelect";
import { RENTALS_FILTER_CONTROL, RENTALS_FILTER_WIDTH } from "../shared/filters/filter-tokens";
import { DEVICE_STRINGS as S } from "./devices.strings";

/** The All tab's Status filter: tick any number of statuses. Same size and
 *  placeholder rule as every other filter (`filter-tokens`). */
export function DeviceStatusFilter({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <MultiSelect
      options={DEVICE_STATUS_FILTER_OPTIONS}
      value={value}
      onValueChange={onChange}
      placeholder={S.devices.statusFilter.label}
      getOptionLabel={deviceStatusFilterLabel}
      formatSelection={(selected) =>
        selected.length === 1
          ? deviceStatusFilterLabel(selected[0])
          : S.devices.statusFilter.many(selected.length)
      }
      size="sm"
      searchable={false}
      className={cn(RENTALS_FILTER_WIDTH, RENTALS_FILTER_CONTROL)}
    />
  );
}

/** The Account filter — the shared `FilterSelect`; a long name truncates
 *  with "…" and shows in full on hover. */
export function DeviceAccountFilter({
  value,
  options,
  onChange,
}: {
  value: string | undefined;
  options: string[];
  onChange: (next: string) => void;
}) {
  return (
    <FilterSelect
      placeholder={S.devices.accountFilter.label}
      value={value}
      options={options.map((name) => ({ value: name, label: name }))}
      onChange={(next: string | undefined) => onChange(next ?? "__all__")}
    />
  );
}
