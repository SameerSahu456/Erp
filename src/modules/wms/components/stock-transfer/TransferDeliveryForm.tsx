import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/common/pickers/DatePicker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";
import type { MoveStockState } from "../../hooks/stock-transfer/useMoveStock";
import { STOCK_TRANSFER_STRINGS as S } from "./stock-transfer.strings";
import { CARRIER_LABELS, type CarrierMode } from "./move-stock-helpers";
import { TransferCarrierFields } from "./TransferCarrierFields";

type FieldProps = { move: MoveStockState; label?: string };

/** Carrier picker. Shared by the Move Stock dialog and the full page. */
export function CarrierField({ move, label = S.carrierLabel }: FieldProps) {
  const { logistics: f, setLogistic } = move;
  return (
    <div className="space-y-2">
      <Label htmlFor="mv-carrier">{label}</Label>
      <Select value={f.carrier} onValueChange={(v) => setLogistic("carrier", v as CarrierMode)}>
        <SelectTrigger id="mv-carrier" className="w-full">
          {/* Show the label, never the raw value (PAGE-UI §7.2);
              a placeholder until the operator picks one. */}
          <SelectValue placeholder={S.carrierPlaceholder}>
            {f.carrier ? CARRIER_LABELS[f.carrier] : S.carrierPlaceholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(CARRIER_LABELS) as CarrierMode[]).map((m) => (
            <SelectItem key={m} value={m}>
              {CARRIER_LABELS[m]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Expected delivery date — required to send a transfer. */
export function ExpectedDeliveryField({ move, label = S.expectedDeliveryLabel }: FieldProps) {
  const { logistics: f, setLogistic } = move;
  return (
    <div className="space-y-2">
      <Label htmlFor="mv-eta" required>
        {label}
      </Label>
      <DatePicker
        id="mv-eta"
        min={move.todayStr}
        value={f.expectedDelivery}
        onChange={(v) => setLogistic("expectedDelivery", v)}
      />
    </div>
  );
}

export function ChallanField({ move, label = S.challanNumberLabel }: FieldProps) {
  const { logistics: f, setLogistic } = move;
  return (
    <div className="space-y-2">
      <Label htmlFor="mv-challan">{label}</Label>
      <Input
        id="mv-challan"
        value={f.challanNumber}
        onChange={(e) => setLogistic("challanNumber", e.target.value)}
        placeholder={S.challanNumberPlaceholder}
      />
    </div>
  );
}

/** Dialog only: the consequence callout + carrier / ETA / challan fields.
 *  The full page lays the same fields out itself (see MoveStockPageSections). */
export function TransferDeliveryForm({ move }: { move: MoveStockState }) {
  return (
    <>
      {/* The whole safeguard for a derived mode. */}
      <div className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive-soft p-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        <div className="min-w-0">
          <Typography variant="body-strong">{S.consequenceTitle}</Typography>
          <Typography variant="helper" tone="muted" className="mt-1">
            {S.consequenceBody(move.destination.name)}
          </Typography>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <CarrierField move={move} />
        <ExpectedDeliveryField move={move} />
        <TransferCarrierFields move={move} />
        <ChallanField move={move} />
      </div>
    </>
  );
}
