import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";
import type { FormFieldError } from "./material-issue-form-helpers";

/** A field label with the required-marker asterisk. */
export function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <Label>
      {children}
      <span className="text-destructive" aria-hidden="true">
        *
      </span>
    </Label>
  );
}

/** The inline message for a blocked Save, shown only on its anchored field. */
export function InlineFieldError({
  error,
  target,
}: {
  error: FormFieldError | null;
  target: string;
}) {
  if (error?.target !== target) return null;
  return (
    <Typography variant="helper" tone="danger">
      {error.message}
    </Typography>
  );
}

/** Right-aligned "n / max" character counter under a text field. */
export function CharCounter({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end">
      <Typography variant="helper" tone="muted">
        {children}
      </Typography>
    </div>
  );
}
