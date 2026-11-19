import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";

import { OperationDialog } from "../shared/OperationDialog";
import { RackBinLocationPicker } from "../shared/RackBinLocationPicker";
import { useMoveStock, type MoveStockState } from "../../hooks/stock-transfer/useMoveStock";
import { STOCK_TRANSFER_STRINGS as S } from "./stock-transfer.strings";
import { NOTES_MAX, type MoveStockDialogProps } from "./move-stock-helpers";
import { MoveStockSourcePicker } from "./MoveStockSourcePicker";
import { MoveStockDestinationPicker } from "./MoveStockDestinationPicker";
import { TransferDeliveryForm } from "./TransferDeliveryForm";
import { UnitPickerSection } from "./UnitPickerSection";

function SubmitButton({ move }: { move: MoveStockState }) {
  const count = move.selection.selected.size;
  const label = move.isTransfer
    ? S.submitTransfer(count, move.destination.name)
    : S.submitRelocate(count);
  return (
    <TooltipProvider>
      <Tooltip>
        {/* min-w-0 + truncate: a long warehouse name ends in "…" inside the
            footer instead of pushing the button out of the dialog (§8.7). */}
        <TooltipTrigger render={<span className="inline-flex min-w-0 max-w-full" />}>
          <Button
            onClick={() => void move.submit()}
            disabled={move.isPending || count === 0}
            variant={move.isTransfer ? "destructive" : "default"}
            className="min-w-0 max-w-full"
            title={label}
          >
            {move.isPending && (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            )}
            <span className="truncate">{label}</span>
          </Button>
        </TooltipTrigger>
        {count === 0 && !move.isPending && (
          <TooltipContent>{S.validationNoUnits}</TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

function NotesField({ move }: { move: MoveStockState }) {
  return (
    <div className="space-y-2 border-t border-border pt-5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="mv-notes">{S.notesLabel}</Label>
        <Typography variant="helper" tone="muted">
          {S.notesCounter(move.notes.length, NOTES_MAX)}
        </Typography>
      </div>
      <Textarea
        id="mv-notes"
        maxLength={NOTES_MAX}
        placeholder={S.notesPlaceholder}
        value={move.notes}
        onChange={(e) => move.setNotes(e.target.value)}
      />
    </div>
  );
}

/**
 * One dialog, two transactions (stock-transfer spec D1/D2).
 *
 * The operator picks a destination warehouse; the transaction type is DERIVED
 * from it. Same warehouse -> an instant relocation. Different warehouse -> a
 * transfer document with a transit window and a receiving step at the far end.
 *
 * There is deliberately no wh2wh/bin2bin toggle: in the demo that switch
 * existed only to decide whether the destination warehouse equalled the
 * source, which the destination picker already answers.
 */
export function MoveStockDialog(props: MoveStockDialogProps) {
  const { open, onOpenChange } = props;
  const move = useMoveStock(props);
  const { destination } = move;

  return (
    <OperationDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) move.reset();
        onOpenChange(o);
      }}
      title={S.title}
      description={move.isTransfer ? S.descriptionTransfer : S.descriptionRelocate}
      className="sm:max-w-2xl"
      bodyClassName="space-y-5"
      isDirty={move.dirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose}>
            {S.cancel}
          </Button>
          <SubmitButton move={move} />
        </>
      )}
    >
      <MoveStockSourcePicker source={move.source} />
      <MoveStockDestinationPicker move={move} />

      {move.isTransfer ? (
        <TransferDeliveryForm move={move} />
      ) : (
        /* Relocation only. A transfer's destination bin is chosen by the
           RECEIVER on arrival, so the picker is hidden entirely. */
        <div className="space-y-2">
          {/* RackBinLocationPicker renders its own "Rack / pallet" label —
              a second "Destination" label above it was redundant. */}
          <RackBinLocationPicker
            warehouseId={move.source.id}
            enabled={open}
            value={destination.locationId}
            onChange={destination.setLocationId}
            onPick={(d) =>
              destination.setLocationLabel(
                [d.rackName, d.binName].filter(Boolean).join(" · "),
              )
            }
          />
        </div>
      )}

      <UnitPickerSection
        pool={move.pool}
        selection={move.selection}
        isTransfer={move.isTransfer}
      />
      <NotesField move={move} />
    </OperationDialog>
  );
}
