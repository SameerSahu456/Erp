import { useState } from "react";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OperationDialog } from "@/components/common/dialogs/OperationDialog";

import type { PurchaseReturnSettle, PurchaseReturnWaive } from "../../api";
import {
  PURCHASE_RETURN_DETAIL_STRINGS as S,
  SETTLEMENT_MODE_LABELS,
} from "./purchase-returns.strings";

export type SettlementMode = PurchaseReturnSettle["settlement_mode"];

// Settlement notes are a short internal audit line, not an essay — cap the
// length and show a live counter so the limit is visible while typing rather
// than a surprise at submit. 500 leaves ample room for a genuine explanation.
const NOTES_MAX_LENGTH = 500;

// One typed rule per action (§9), so `canSubmit` derives from a schema rather
// than ad-hoc checks: settling needs a mode (notes optional); waiving vendor
// credit needs a reason note.
const settleSchema = z.object({
  settlementMode: z.string().min(1),
  notes: z.string(),
});
const waiveSchema = z.object({
  notes: z.string().trim().min(1),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "settle" | "waive";
  isPending?: boolean;
  onSettle: (body: PurchaseReturnSettle) => void;
  onWaive: (body: PurchaseReturnWaive) => void;
}

export function SettlementDialog({
  open,
  onOpenChange,
  action,
  isPending = false,
  onSettle,
  onWaive,
}: Props) {
  const [settlementMode, setSettlementMode] = useState<SettlementMode | "">("");
  const [notes, setNotes] = useState("");

  const canSubmit =
    action === "waive"
      ? waiveSchema.safeParse({ notes }).success
      : settleSchema.safeParse({ settlementMode, notes }).success;

  function reset() {
    setSettlementMode("");
    setNotes("");
  }

  // Dirty once a mode is chosen or a note typed, so Cancel / Esc / backdrop
  // route through the discard guard rather than dropping the entry silently.
  const dirty = settlementMode !== "" || notes.trim() !== "";

  // §0.9 — the confirm is disabled until its one required field is filled; name
  // that unmet field in a why-tooltip (the `isPending` half is excluded — a
  // spinner already explains the in-flight disable).
  const blockReason = canSubmit
    ? null
    : action === "waive"
      ? S.settlementDialog.waiveNeedsReason
      : S.settlementDialog.settleNeedsMode;

  return (
    <OperationDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={action === "settle" ? S.settlementDialog.settleTitle : S.settlementDialog.waiveTitle}
      description={
        action === "settle"
          ? S.settlementDialog.settleDescription
          : S.settlementDialog.waiveDescription
      }
      bodyClassName="space-y-4"
      isDirty={dirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose}>
            {S.dispatchDialog.cancel}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button
                  // Waiving vendor credit forfeits money owed — a destructive action.
                  variant={action === "waive" ? "destructive" : "default"}
                  disabled={!canSubmit || isPending}
                  onClick={() => {
                    if (action === "settle") {
                      if (settlementMode === "") return;
                      onSettle({
                        settlement_mode: settlementMode,
                        settlement_notes: notes.trim() || null,
                      });
                      return;
                    }
                    onWaive({ settlement_notes: notes.trim() });
                  }}
                >
                  {isPending && (
                    <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                  )}
                  {action === "settle" ? S.units.settle : S.units.waive}
                </Button>
              </TooltipTrigger>
              {blockReason && !isPending && (
                <TooltipContent>{blockReason}</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </>
      )}
    >
      {action === "settle" && (
        <div className="space-y-2">
          <Label required>{S.settlementDialog.modeLabel}</Label>
          <Select
            value={settlementMode}
            onValueChange={(value) => setSettlementMode(value as SettlementMode)}
          >
            <SelectTrigger>
              {/* Show the mode label, not its raw enum value (PAGE-UI §7.2). */}
              <SelectValue placeholder={S.settlementDialog.modePlaceholder}>
                {settlementMode
                  ? SETTLEMENT_MODE_LABELS[settlementMode]
                  : S.settlementDialog.modePlaceholder}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SETTLEMENT_MODE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label required={action === "waive"}>
          {action === "settle" ? S.meta.notes : S.units.columns.reason}
        </Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          maxLength={NOTES_MAX_LENGTH}
        />
        {/* Live counter so the cap is visible while typing. Purely numeric, so
            there is no user-facing copy string to extract (§16.12). */}
        <Typography
          variant="helper"
          tone="muted"
          className="block text-right tabular-nums"
        >
          {notes.length}/{NOTES_MAX_LENGTH}
        </Typography>
      </div>
    </OperationDialog>
  );
}
