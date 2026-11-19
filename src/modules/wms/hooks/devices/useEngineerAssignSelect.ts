import { useState } from "react";

import { useAssignDevice } from "./useDevices";
import type { DeviceAssignableUser } from "../../api";
import {
  WITHDRAW_VALUE,
  cleanName,
  engineerSlotPool,
} from "../../components/devices/engineer-assign-helpers";
import { ENGINEER_ASSIGN_SELECT_STRINGS } from "../../components/devices/engineer-assign-select.strings";

export type AssignStage = "inspection" | "repair" | "qc";

export interface UseEngineerAssignSelectArgs {
  deviceId: string;
  stage: AssignStage;
  pool: DeviceAssignableUser[];
  currentUserId?: string | null;
  currentName?: string | null;
  mayAssign: boolean;
  assignable: boolean;
  levels: string[] | null;
  placeholder: string;
  notReadyText: string;
}

/** Local echo + assign / withdraw mutations behind `EngineerAssignSelect`. */
export function useEngineerAssignSelect(a: UseEngineerAssignSelectArgs) {
  const { deviceId, stage, currentUserId, currentName, mayAssign, assignable } = a;
  const assignDevice = useAssignDevice();
  // Store the picked NAME too: assigning refetches the pool, so it's briefly
  // empty after a pick and the label would otherwise read as unassigned.
  const [picked, setPicked] = useState<
    { id: string; name: string } | undefined
  >(undefined);
  // Withdrawing is consequential (the device leaves its lot, which may close),
  // so it is confirmed rather than fired straight off a dropdown pick.
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);
  // Optimistic withdraw: the field empties at once even though the assignee
  // came from the server (`currentUserId`), not from a local pick.
  const [cleared, setCleared] = useState(false);

  // Row-reuse guard: the table keys rows by index, so a reused instance must
  // drop its local echo when the row's device changes (render-phase reset).
  const [prevDeviceId, setPrevDeviceId] = useState(deviceId);
  if (prevDeviceId !== deviceId) {
    setPrevDeviceId(deviceId);
    setPicked(undefined);
    setCleared(false);
    setConfirmingWithdraw(false);
  }

  // Drop the local echo once the server value moves, so it never masks a later change.
  const [prevServerUserId, setPrevServerUserId] = useState(currentUserId);
  if (prevServerUserId !== currentUserId) {
    setPrevServerUserId(currentUserId);
    setPicked(undefined);
    setCleared(false);
  }

  const slotPool = engineerSlotPool(a.pool, a.levels);
  const value = cleared ? undefined : (picked?.id ?? currentUserId ?? undefined);
  // A just-picked assignee stays selectable even while the pool refetches, so
  // don't gate on an empty pool once we hold a local pick.
  const disabled =
    !mayAssign ||
    !assignable ||
    (slotPool.length === 0 && !picked) ||
    assignDevice.isPending;
  const placeholderText = (): string => {
    if (!assignable) return a.notReadyText;
    if (!mayAssign) return ENGINEER_ASSIGN_SELECT_STRINGS.viewOnly;
    if (slotPool.length === 0)
      return ENGINEER_ASSIGN_SELECT_STRINGS.noEngineersAtWarehouse;
    return a.placeholder;
  };
  const ph = placeholderText();
  // Prefer the picked name, then the row's `currentName`, then the pool —
  // never leaves a set value showing the placeholder.
  const name = cleanName(
    picked
      ? picked.name
      : (currentName ??
          slotPool.find((u) => u.user_id === currentUserId)?.name),
  );

  const handlePick = (val: string) => {
    if (!val) return;
    if (val === WITHDRAW_VALUE) {
      setConfirmingWithdraw(true);
      return;
    }
    const u = slotPool.find((x) => x.user_id === val);
    setPicked({ id: val, name: u?.name ?? currentName ?? val });
    setCleared(false);
    assignDevice.mutate(
      { id: deviceId, body: { stage, user_id: val } },
      {
        // Roll back the optimistic echo if the backend rejects the pick so the
        // dropdown snaps back; the hook's onError still toasts.
        onError: () => setPicked(undefined),
      },
    );
  };

  const confirmWithdraw = () => {
    setConfirmingWithdraw(false);
    // Optimistic: clear the local echo so the field empties immediately,
    // and restore the previous assignee if the backend refuses.
    const previous = picked;
    setPicked(undefined);
    setCleared(true);
    assignDevice.mutate(
      { id: deviceId, body: { stage, user_id: null } },
      {
        onError: () => {
          setPicked(previous);
          setCleared(false);
        },
      },
    );
  };

  return {
    slotPool,
    value,
    disabled,
    ph,
    name,
    confirmingWithdraw,
    setConfirmingWithdraw,
    handlePick,
    confirmWithdraw,
  };
}
