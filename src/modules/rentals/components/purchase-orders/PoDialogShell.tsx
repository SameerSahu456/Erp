import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { OperationDialog } from "@/components/common/dialogs/OperationDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Typography } from "@/components/ui/typography";

import { PURCHASE_ORDER_STRINGS as S } from "./purchase-orders.strings";

interface PoDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  onSubmit: () => void;
  pending: boolean;
  canSubmit: boolean;
  isDirty: boolean;
  /** The mutation's error. Shown beside the fields, not toasted: every
   *  refusal here is a typed 4xx whose message names the rule broken. */
  error: unknown;
  className?: string;
  children: ReactNode;
}

/** Chrome shared by the PO dialogs — title, the fields, an inline error,
 *  Cancel + submit. Delegates to `OperationDialog` for the sticky header
 *  and footer and the unsaved-changes guard. */
export function PoDialogShell({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  onSubmit,
  pending,
  canSubmit,
  isDirty,
  error,
  className = "sm:max-w-md",
  children,
}: PoDialogShellProps) {
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
            {S.cancel}
          </Button>
          <Button onClick={onSubmit} disabled={pending || !canSubmit}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {submitLabel}
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

/** A labelled field with optional help, sized to shrink inside the dialog. */
export function PoField({
  label,
  htmlFor,
  help,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  help?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={htmlFor} required={required} className="min-w-0">
        {/* Clamped to two lines; the tooltip carries the whole label. */}
        <Tooltip>
          <TooltipTrigger render={<span className="line-clamp-2 min-w-0 [overflow-wrap:anywhere]" />}>
            {label}
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      </Label>
      {children}
      {help ? (
        <Typography variant="helper" tone="muted">
          {help}
        </Typography>
      ) : null}
    </div>
  );
}
