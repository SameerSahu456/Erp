import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Picked from the optional "clear" row; never a wire value.
const CLEAR = "__clear__";

/** A Select over a fixed wire enum — shows the label, never the raw value.
 *  `clearLabel` + `onClear` add a first row that empties an optional field. */
export function EnumSelect<T extends string>({
  id,
  value,
  options,
  labels,
  onChange,
  placeholder,
  isDisabled,
  disabled,
  clearLabel,
  onClear,
}: {
  id?: string;
  value: T | "";
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
  placeholder?: string;
  isDisabled?: (value: T) => boolean;
  disabled?: boolean;
  clearLabel?: string;
  onClear?: () => void;
}) {
  const clearable = clearLabel !== undefined && onClear !== undefined;
  return (
    <Select
      value={value || null}
      onValueChange={(v) => {
        if (v === CLEAR) onClear?.();
        else if (v) onChange(v as T);
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder}>{value ? labels[value] : placeholder}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {clearable ? <SelectItem value={CLEAR}>{clearLabel}</SelectItem> : null}
        {options.map((option) => (
          <SelectItem key={option} value={option} disabled={isDisabled?.(option)}>
            {labels[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
