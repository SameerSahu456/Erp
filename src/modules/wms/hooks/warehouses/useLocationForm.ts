import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { applyServerFieldErrors } from "@shared/api/server-field-errors";

import type { WarehouseLocation } from "../../api";
import { locationFormSchema, type LocationFormValues } from "../../schemas";
import {
  defaultsFor,
  toBackendCreatePayload,
  toBackendUpdatePayload,
} from "../../components/locations/location-form-dialog-helpers";
import {
  makeUseRacksHoldingBinsOptions,
  useCreateLocation,
  useUpdateLocation,
} from "./useWarehouseLocations";

interface Args {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  warehouseId: string;
  location?: WarehouseLocation;
  /** Names the locked parent of a bin being edited. */
  parentRackName?: string;
  initialLevel: "rack" | "bin";
}

/** State owner for the rack/bin create-edit dialog (§17). */
export function useLocationForm({
  open,
  onOpenChange,
  warehouseId,
  location,
  parentRackName,
  initialLevel,
}: Args) {
  const isEdit = !!location;
  const create = useCreateLocation(warehouseId);
  const update = useUpdateLocation(warehouseId, location?.id ?? "");

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: defaultsFor(location, initialLevel),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(defaultsFor(location, initialLevel));
  }, [open, location, initialLevel, form]);

  // useWatch, not form.watch(): watch() defeats the React Compiler.
  const [level, rackMode, capacityMode, parentLocationId, isActive] = useWatch({
    control: form.control,
    name: ["level", "rack_mode", "capacity_mode", "parent_location_id", "is_active"],
  });

  // Parent-rack picker: server-searched + paged (§16.11) — never the whole tree.
  const useParentRackOptions = useMemo(
    () => makeUseRacksHoldingBinsOptions(warehouseId),
    [warehouseId],
  );
  // The picked option — kept so the trigger shows the name even when the row
  // isn't on the currently-loaded pages (§16.11 #5).
  const [pickedParent, setPickedParent] = useState<{ id: string; label: string } | null>(null);
  const lockedParent =
    isEdit && parentLocationId && parentRackName
      ? { id: parentLocationId, label: parentRackName }
      : null;
  const selectedParentRack =
    lockedParent ?? (pickedParent?.id === parentLocationId ? pickedParent : null);

  // A location that stores stock always has a slot mode, so one is picked as
  // soon as its fields appear.
  const storesStock = level === "bin" || rackMode === "direct_storage";
  useEffect(() => {
    if (storesStock && !form.getValues("capacity_mode")) form.setValue("capacity_mode", "multiple");
  }, [storesStock, form]);

  // Flipping capacity mode to "single" normalises capacity to 1 (backend rule).
  useEffect(() => {
    if (capacityMode === "single") form.setValue("capacity", 1);
  }, [capacityMode, form]);

  // On level switch, clear the irrelevant field so an old value can't leak
  // into the submit payload.
  useEffect(() => {
    if (level === "rack") form.setValue("parent_location_id", undefined);
    else form.setValue("rack_mode", undefined);
  }, [level, form]);

  async function onSubmit(values: LocationFormValues) {
    try {
      if (isEdit && location) await update.mutateAsync(toBackendUpdatePayload(location, values));
      else await create.mutateAsync(toBackendCreatePayload(values));
      onOpenChange(false);
    } catch (e) {
      // Server validation lands on the field; any non-field error was already
      // toasted by the hook (notifyMutationError). Stay open to fix + retry.
      applyServerFieldErrors(e, form.setError);
    }
  }

  return {
    form,
    isEdit,
    isPending: isEdit ? update.isPending : create.isPending,
    level,
    rackMode,
    capacityMode,
    isActive,
    useParentRackOptions,
    selectedParentRack,
    setPickedParent,
    // The footer button lives outside a <form>, so it invokes this directly.
    submit: form.handleSubmit(onSubmit),
  };
}
