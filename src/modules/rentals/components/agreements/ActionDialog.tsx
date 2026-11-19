import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { OperationDialog } from "@/components/common/dialogs/OperationDialog";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";

import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings";

/** What every sales-order action dialog takes. */
export interface ActionProps {
  salesOrderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

interface ActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  onSubmit: () => void;
  pending: boolean;
  error: unknown;
  canSubmit?: boolean;
  /** Unsaved input: OperationDialog then guards Esc / backdrop / x / Cancel. */
  isDirty?: boolean;
  /** Width override — extend carries a priced row per line. */
  className?: string;
  children: ReactNode;
}

/** Shared chrome for the SO action dialogs. The error renders inline, not as
 *  a toast: each refusal is a typed 409 naming the rule the date broke. */
export function ActionDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  onSubmit,
  pending,
  error,
  canSubmit = true,
  isDirty,
  className = "sm:max-w-md",
  children,
}: ActionDialogProps) {
  return (
    <OperationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      className={className}
      isDirty={isDirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={pending}>
            {C.cancel}
          </Button>
          <Button onClick={onSubmit} disabled={pending || !canSubmit}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {pending ? C.saving : submitLabel}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">{children}</div>
      {error ? (
        <Typography variant="helper" tone="danger">
          {error instanceof Error ? error.message : String(error)}
        </Typography>
      ) : null}
    </OperationDialog>
  );
}
