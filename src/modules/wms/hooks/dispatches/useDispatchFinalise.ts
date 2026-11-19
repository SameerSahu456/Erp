import { useState } from "react";

import type { DispatchFinaliseBody, DispatchLineItem } from "../../api/dispatch";
import type { ReplacementPartFittedBy } from "../../constants/replacement-request-status";
import { useFinaliseDispatch } from "./useDispatchRequests";

/** A replacement part shipped into the customer's own device — loose, under a
 *  device that left on an earlier dispatch (component spec D10, D15). */
const shipsPartToDevice = (line: DispatchLineItem) =>
  line.source_type === "replacement_request_items" &&
  line.role === "added_component" &&
  !!line.parent_dispatch_item_id;

/** Finalise a dispatch. When it ships a replacement part into the customer's
 *  device, it first asks who fits that part — our engineer or the customer. */
export function useDispatchFinalise(
  id: string,
  deliveryDetails: DispatchFinaliseBody["metadata"]["delivery_details"],
  lines: DispatchLineItem[] | undefined,
) {
  const finaliseMut = useFinaliseDispatch(id);
  const [askOpen, setAskOpen] = useState(false);
  const [fittedBy, setFittedBy] = useState<ReplacementPartFittedBy | null>(null);
  const needsFitter = (lines ?? []).some(shipsPartToDevice);

  async function send(partFittedBy: ReplacementPartFittedBy | null) {
    await finaliseMut.mutateAsync({
      metadata: { delivery_details: deliveryDetails },
      ...(partFittedBy ? { part_fitted_by: partFittedBy } : {}),
    });
  }

  async function finalise() {
    if (needsFitter) {
      setAskOpen(true);
      return;
    }
    await send(null);
  }

  async function confirm() {
    if (!fittedBy) return;
    await send(fittedBy);
    setAskOpen(false);
    setFittedBy(null);
  }

  return {
    finalise,
    confirm,
    askOpen,
    onOpenChange: (open: boolean) => {
      setAskOpen(open);
      if (!open) setFittedBy(null);
    },
    fittedBy,
    setFittedBy,
    isPending: finaliseMut.isPending,
  };
}

export type DispatchFinaliseState = ReturnType<typeof useDispatchFinalise>;
