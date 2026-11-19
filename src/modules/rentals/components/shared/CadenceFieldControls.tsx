import type { ReactNode, Ref } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";

interface FieldShellProps {
  label: string;
  id: string;
  help?: string;
  required?: boolean;
}

function FieldShell({ label, id, help, required, children }: FieldShellProps & { children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children}
      {help && <Typography variant="helper">{help}</Typography>}
    </div>
  );
}

interface CadenceSelectFieldProps<T extends string> extends FieldShellProps {
  labels: Record<T, string>;
  options: readonly T[];
  value: T | null;
  onChange: (next: T) => void;
  disabled?: boolean;
  placeholder?: string;
}

/** A labelled enum dropdown fed by a `constants/` label map. */
export function CadenceSelectField<T extends string>({
  labels,
  options,
  value,
  onChange,
  disabled,
  placeholder,
  ...shell
}: CadenceSelectFieldProps<T>) {
  return (
    <FieldShell {...shell}>
      <Select items={labels} value={value} onValueChange={(v) => v && onChange(v as T)} disabled={disabled}>
        <SelectTrigger id={shell.id} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {labels[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}

interface CadenceNumberFieldProps extends FieldShellProps {
  value: number | null | undefined;
  /** The raw box text; the caller decides how empty reads. */
  onChange: (raw: string) => void;
  min: number;
  max: number;
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
}

/** A labelled whole-number input. */
export function CadenceNumberField({ value, onChange, min, max, disabled, inputRef, ...shell }: CadenceNumberFieldProps) {
  return (
    <FieldShell {...shell}>
      <Input
        ref={inputRef}
        id={shell.id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </FieldShell>
  );
}
