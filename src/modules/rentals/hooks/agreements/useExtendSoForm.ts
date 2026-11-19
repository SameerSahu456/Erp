import { useState } from "react";

import { useSalesOrder } from "@modules/crm";

import { useExtendSo } from "./useAgreement";
import { useRentalSalesOrderExtendBounds, useRentalSalesOrderLineRateTargets } from "./useRentalSalesOrders";
import {
  buildExtendPayload,
  deriveLineSelections,
  extendGuards,
  lastRateFromDay,
  targetsStateOf,
} from "./extend-so-helpers";

type Flags = Record<string, boolean>;

/** The Extend dialog's state, queries and guards. Every edit to a line's rate
 *  or unit set retracts that line's flatten tick — it was made against the
 *  old figure / set. */
export function useExtendSoForm(salesOrderId: string, open: boolean) {
  const [newEndDate, setNewEndDate] = useState("");
  const [reason, setReason] = useState("");
  // Keyed by sales_order_item_id. An absent line keeps its contracted rate.
  const [lineRates, setLineRates] = useState<Record<string, string>>({});
  // Never pre-checked: the acknowledgement is the point.
  const [flattenOk, setFlattenOk] = useState<Flags>({});
  // Absent = every unit (the whole-line reprice); present = explicit selection.
  const [pickedUnits, setPickedUnits] = useState<Record<string, string[]>>({});
  const [rateFrom, setRateFrom] = useState("");
  const mutation = useExtendSo();

  // Fetched here: the dialog also opens from a list row, which carries no lines.
  const order = useSalesOrder(open ? salesOrderId : undefined);
  const rentalLines = (order.data?.items ?? []).filter((line) => line.is_rental);
  // Asked of the server: a divergent unit past the first page must not hide.
  const targetQuery = useRentalSalesOrderLineRateTargets(salesOrderId, { enabled: open });
  const bounds = useRentalSalesOrderExtendBounds(salesOrderId, { enabled: open }).data;

  const lines = deriveLineSelections(targetQuery.data ?? [], pickedUnits);
  const priced = Object.entries(lineRates).filter(([, v]) => v.trim() !== "");
  const isDirty = [newEndDate, reason, rateFrom].some((v) => v !== "") || priced.length > 0;
  const guards = extendGuards({
    priced,
    lines,
    flattenOk,
    rateFrom,
    newEndDate,
    targetsUnavailable: targetQuery.isPending || targetQuery.isError,
  });
  const retract = (lineId: string) => setFlattenOk((prev) => ({ ...prev, [lineId]: false }));

  function setRate(lineId: string, value: string) {
    setLineRates((prev) => ({ ...prev, [lineId]: value }));
    retract(lineId);
  }

  function setAllUnits(lineId: string, checked: boolean) {
    // Back to ABSENT, not a full id list — absent is what reads as whole-line.
    setPickedUnits((prev) => {
      const next = { ...prev };
      if (checked) delete next[lineId];
      else next[lineId] = [];
      return next;
    });
    retract(lineId);
  }

  function toggleUnit(lineId: string, unitId: string, checked: boolean) {
    const allIds = lines.get(lineId)?.allIds ?? [];
    setPickedUnits((prev) => {
      const current = prev[lineId] ?? allIds;
      return { ...prev, [lineId]: checked ? [...current, unitId] : current.filter((id) => id !== unitId) };
    });
    retract(lineId);
  }

  function submit(onSuccess: () => void) {
    mutation.mutate(
      { id: salesOrderId, ...buildExtendPayload({ newEndDate, reason, rateFrom, priced, lines }) },
      { onSuccess },
    );
  }

  return {
    newEndDate,
    setNewEndDate,
    reason,
    setReason,
    rateFrom,
    setRateFrom,
    lineRates,
    flattenOk,
    setFlatten: (lineId: string, checked: boolean) => setFlattenOk((prev) => ({ ...prev, [lineId]: checked })),
    setRate,
    setAllUnits,
    toggleUnit,
    rentalLines,
    lines,
    targetsState: targetsStateOf(targetQuery),
    endDateMin: bounds?.end_date_min ?? undefined,
    rateFromMin: bounds?.rate_effective_min ?? undefined,
    rateFromMax: lastRateFromDay(newEndDate),
    anyPriced: priced.length > 0,
    guards,
    isDirty,
    canSubmit: !!newEndDate && !guards.blocked,
    pending: mutation.isPending,
    error: mutation.error,
    submit,
  };
}

export type ExtendSoForm = ReturnType<typeof useExtendSoForm>;
export type TargetsState = ExtendSoForm["targetsState"];
