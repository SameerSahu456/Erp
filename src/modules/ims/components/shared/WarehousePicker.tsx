import { AsyncSelect, type AsyncSelectOption } from "@/components/ui/async-select";
import { useWarehouseFilterOptions } from "@modules/wms";

import { IMS_SHARED_STRINGS as S } from "./shared.strings";

/** Server-searched warehouse dropdown (§16.11). The picked NAME is held by the
 *  parent so the chip never falls back to a raw id. */
export function WarehousePicker({
  id,
  value,
  label,
  onChange,
  clearable = false,
  placeholder = S.warehousePicker.placeholder,
  disabled,
}: {
  id?: string;
  value: string;
  label: string;
  onChange: (id: string, name: string) => void;
  clearable?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  const useOptions = useWarehouseFilterOptions();
  return (
    <AsyncSelect<AsyncSelectOption>
      id={id}
      value={value ? { id: value, label } : null}
      onValueChange={(opt) => onChange(opt?.id ?? "", opt?.label ?? "")}
      useOptions={useOptions}
      toLabel={(w) => w.label}
      placeholder={placeholder}
      searchPlaceholder={S.warehousePicker.search}
      className="w-full"
      clearable={clearable}
      disabled={disabled}
      loadOnOpen
    />
  );
}
