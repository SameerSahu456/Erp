import { useState } from "react";

import { useCancelDispatch } from "./useDispatchRequests";
import type { DispatchCancelBody } from "../../api/dispatch";

/** Cancel / recall dialog state: open flag + the mandatory reason. */
export function useDispatchCancel(id: string) {
  const cancelMut = useCancelDispatch(id);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  async function confirmCancel() {
    const reason = cancelReason.trim();
    if (!reason) return;
    const body: DispatchCancelBody = { reason };
    await cancelMut.mutateAsync(body);
    setCancelOpen(false);
    setCancelReason("");
  }

  const onOpenChange = (o: boolean) => {
    setCancelOpen(o);
    if (!o) setCancelReason("");
  };

  return {
    cancelOpen,
    open: () => setCancelOpen(true),
    dismiss: () => setCancelOpen(false),
    onOpenChange,
    cancelReason,
    setCancelReason,
    confirmCancel,
    isPending: cancelMut.isPending,
  };
}

export type DispatchCancelState = ReturnType<typeof useDispatchCancel>;
