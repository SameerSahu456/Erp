import { type ReactNode } from "react";

import { FieldError } from "@/components/common/forms/FieldError";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

/** Shared labelled WMS form field: label, control, then error or helper text. */
export function FormField({
  label,
  required,
  htmlFor,
  labelAside,
  helper,
  error,
  className,
  children,
}: {
  label?: ReactNode;
  required?: boolean;
  /** Id of the control the label points at; also seeds the error id
   *  (`${htmlFor}-error`) so the control can reference it. */
  htmlFor?: string;
  labelAside?: ReactNode;
  /** Muted guidance shown under the control while there is no error. */
  helper?: ReactNode;
  error?: string | null;
  className?: string;
  children: ReactNode;
}) {
  const labelNode =
    label != null ? (
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
    ) : null;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {labelNode && labelAside ? (
        <div className="flex items-center justify-between gap-2">
          {labelNode}
          <div className="shrink-0">{labelAside}</div>
        </div>
      ) : (
        labelNode
      )}
      {children}
      {error && (
        <FieldError
          message={error}
          id={htmlFor ? `${htmlFor}-error` : undefined}
          className="mt-0"
        />
      )}
      {!error && helper && (
        <Typography variant="helper" tone="muted" asChild>
          <p>{helper}</p>
        </Typography>
      )}
    </div>
  );
}
