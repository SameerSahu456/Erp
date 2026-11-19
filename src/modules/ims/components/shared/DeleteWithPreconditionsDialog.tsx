import { Check, Info, Trash2, X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Typography } from "@/components/ui/typography";
import { IMS_SHARED_STRINGS } from "./shared.strings";

// ─── Shared delete-with-preconditions dialog ────────────────────────────────
//
// One dialog component for every IMS delete confirmation. Each call site
// supplies the entity name + a precondition list pulled from the backend's
// own delete guards (e.g. `OEMService.delete()` raises 409 when parts or
// PM assignments are still linked). The dialog renders each precondition
// with a live ✓ (emerald) or ✗ (red) plus an actionable detail line so
// the operator knows exactly what to clear before retrying.
//
// The backend remains the authority — if state drifts between page-load
// and click, the caller's mutation `onError` toast surfaces the verbatim
// 400/409 message.
//
// Pass an empty `preconditions` array for resources with no delete guards
// (PM assignment revoke, checklist delete). The "Before deleting…" block
// is omitted in that case so the dialog reads as a plain confirmation.

export interface Precondition {
  /** Met → ✓ green; unmet → ✗ red + `detail` line. Ignored when
   *  `kind === "info"`. */
  satisfied: boolean;
  /** One-line statement of the requirement. Mirror the backend's plain-English
   *  intent ("No active parts linked to this OEM"). */
  label: string;
  /** When the precondition is NOT satisfied, this line spells out what
   *  the operator must do to clear it ("3 active parts still linked —
   *  unlink them first"). Skip on satisfied rows. */
  detail?: string;
  /** Renders a muted shimmer in place of the ✓/✗ — use while a lazy
   *  count fetch is in flight so the row doesn't flash a false ✓. */
  loading?: boolean;
  /** "check" (default) renders ✓/✗ based on `satisfied`. "info" renders a
   *  neutral info icon — use when the FE can't probe the count (e.g. HSN
   *  has no `hsn_code_id` filter on /parts) and we just want to surface
   *  the requirement so the operator knows what the backend will check. */
  kind?: "check" | "info";
}

export interface DeleteWithPreconditionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dialog heading — full sentence, e.g. "Delete this Brand/OEM?". */
  title: string;
  /** Entity instance label shown in the body (truncated). */
  entityName: string;
  /** Optional one-liner under the entity name. Most IMS resources are
   *  soft-deleted, so the default-ish copy is "Soft-delete. The X hides
   *  from new pickers; existing audit references stay intact." */
  description?: string;
  /** Empty array → renders without the preconditions block. */
  preconditions: Precondition[];
  /** Mutation pending — disables Cancel + flips Confirm label to "Deleting…". */
  isPending: boolean;
  onConfirm: () => void;
  /** Defaults to "Delete". Match the entity ("Delete OEM", "Revoke assignment"). */
  confirmLabel?: string;
  /** Defaults to "Deleting…". Use "Revoking…" for revoke flows. */
  pendingLabel?: string;
}

export function DeleteWithPreconditionsDialog({
  open,
  onOpenChange,
  title,
  entityName,
  description,
  preconditions,
  isPending,
  onConfirm,
  confirmLabel = "Delete",
  pendingLabel = "Deleting…",
}: DeleteWithPreconditionsDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader className="min-w-0">
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5 shrink-0 text-destructive" aria-hidden />
            {title}
          </AlertDialogTitle>
          {/* Base UI's <Description> renders a <p> by default. We need a
              <div> here because our content includes a <ul> (precondition
              list) and stacked blocks, which are invalid inside <p>.
              Base UI's polymorphism is via `render={<div/>}`, NOT
              `asChild`. */}
          <AlertDialogDescription render={<div className="min-w-0 space-y-3" />}>
            <div className="min-w-0">
              <span className="block break-words font-medium text-foreground">
                {entityName}
              </span>
              {description && (
                <Typography asChild variant="body" tone="inherit">
                  <span>{description}</span>
                </Typography>
              )}
            </div>
            {preconditions.length > 0 && (
              <div className="rounded-md border bg-muted/30 p-3">
                <Typography asChild variant="helper" tone="muted" className="mb-2 font-semibold uppercase tracking-wide">
                  <p>{IMS_SHARED_STRINGS.deleteDialog.checkRequirements}</p>
                </Typography>
                <Typography asChild variant="body" tone="inherit" className="space-y-1.5">
                <ul>
                  {preconditions.map((p, idx) => (
                    <PreconditionRow key={idx} {...p} />
                  ))}
                </ul>
                </Typography>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{IMS_SHARED_STRINGS.deleteDialog.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trash2 className="mr-1.5 size-4" />
            {isPending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PreconditionRow({
  satisfied,
  label,
  detail,
  loading,
  kind = "check",
}: Precondition) {
  if (loading) {
    return (
      <li className="flex items-start gap-2">
        <span className="mt-0.5 size-4 shrink-0 animate-pulse rounded-full bg-muted" />
        <span className="text-muted-foreground">{label}</span>
      </li>
    );
  }
  if (kind === "info") {
    // Informational row — the FE can't verify this precondition (no live
    // count available), so we surface the requirement with a neutral
    // marker and let the backend's 409 message carry the actual count.
    return (
      <li className="flex items-start gap-2">
        <Info
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <span className="text-muted-foreground">{label}</span>
      </li>
    );
  }
  return (
    <li className="flex items-start gap-2">
      {satisfied ? (
        <Check
          className="mt-0.5 size-4 shrink-0 text-success"
          aria-label={IMS_SHARED_STRINGS.deleteDialog.satisfiedAriaLabel}
        />
      ) : (
        <X
          className="mt-0.5 size-4 shrink-0 text-destructive"
          aria-label={IMS_SHARED_STRINGS.deleteDialog.notSatisfiedAriaLabel}
        />
      )}
      <span className="text-foreground">
        {label}
        {!satisfied && detail ? (
          <Typography asChild variant="helper" tone="danger" className="mt-0.5 block">
            <span>{detail}</span>
          </Typography>
        ) : null}
      </span>
    </li>
  );
}
