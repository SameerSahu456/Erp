import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Typography } from "@/components/ui/typography";

import { useReturnSpare } from "../../hooks/spares/useReturnSpare";
import { OperationDialog } from "../shared/OperationDialog";
import { ReturnSpareUnitList } from "./ReturnSpareUnitList";
import type { ReturnSubject } from "./return-spare-helpers";
import { SPARES_STRINGS as S } from "./spares.strings";

export type { ReturnSubject } from "./return-spare-helpers";

const R = S.returnDialog;
const NOTES_ROWS = 3;

interface ReturnSpareDialogProps {
  /** Spare request whose units are coming back; null = closed. */
  request: ReturnSubject | null;
  /** Warehouse whose racks the units go back into (fallback only). */
  warehouseId: string | null;
  onClose: () => void;
}

function submitLabel(pending: boolean, count: number) {
  if (pending) return R.submitting;
  return count > 0 ? `${R.submit} (${count})` : R.submit;
}

function Helper({ tone = "muted", children }: { tone?: "muted" | "danger"; children: ReactNode }) {
  return (
    <Typography variant="helper" tone={tone} asChild>
      <p>{children}</p>
    </Typography>
  );
}

/** Put fulfilled-but-unneeded spare units back on the rack.
 *
 * Each returned unit names its OWN destination — a batch can be split across
 * bins, and the store manager is the one physically racking them, so the
 * system never guesses (the unit's recorded location is stale by design:
 * fulfilment never cleared it).
 */
export function ReturnSpareDialog({ request, warehouseId, onClose }: ReturnSpareDialogProps) {
  const r = useReturnSpare(request, warehouseId, onClose);

  function renderBody() {
    if (r.isLoading) return <Helper>{R.unitsHeading}…</Helper>;
    if (r.isError) return <Helper tone="danger">{R.loadError}</Helper>;
    if (r.returnableIds.length === 0) {
      return (
        <div className="space-y-1">
          <Typography variant="body-strong" asChild>
            <p>{R.emptyTitle}</p>
          </Typography>
          <Helper>{R.emptyDescription}</Helper>
        </div>
      );
    }
    return (
      <>
        <ReturnSpareUnitList
          unitIds={r.returnableIds}
          unitById={r.unitById}
          selected={r.selected}
          onToggle={r.toggle}
          unitWarehouseId={r.unitWarehouseId}
          locationFor={r.locationFor}
          onLocationChange={r.setLocationFor}
          sendToFor={r.sendToFor}
          onSendToChange={r.setSendToFor}
          enabled={r.open}
        />

        <div className="min-w-0 space-y-2">
          <Label required>{R.reasonLabel}</Label>
          <Select value={r.reasonCode || undefined} onValueChange={(v) => r.setReasonCode(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={R.reasonPlaceholder}>{r.reasonCode || R.reasonPlaceholder}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {S.returnReasons.map((reason) => (
                <SelectItem key={reason} value={reason}>
                  {reason}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Helper>{R.reasonHelp}</Helper>
        </div>

        <div className="min-w-0 space-y-2">
          <Label htmlFor="spare-return-notes">{R.notesLabel}</Label>
          <Textarea
            id="spare-return-notes"
            value={r.notes}
            onChange={(e) => r.setNotes(e.target.value)}
            placeholder={R.notesPlaceholder}
            rows={NOTES_ROWS}
          />
          {r.isOther && <Helper>{R.notesRequiredHelp}</Helper>}
        </div>
      </>
    );
  }

  return (
    <OperationDialog
      open={r.open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={R.title}
      isDirty={r.dirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose}>
            {R.cancel}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button onClick={r.submit} disabled={!r.ready || r.pending}>
                  {r.pending && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
                  {submitLabel(r.pending, r.chosenCount)}
                </Button>
              </TooltipTrigger>
              {r.blockReason && !r.pending && <TooltipContent>{r.blockReason}</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        </>
      )}
    >
      {request && (
        <div className="min-w-0 space-y-4">
          <div className="min-w-0 space-y-1">
            <Typography variant="body-strong" truncate className="min-w-0">
              {request.partLabel}
            </Typography>
            <Helper>{R.description}</Helper>
          </div>
          {renderBody()}
        </div>
      )}
    </OperationDialog>
  );
}
