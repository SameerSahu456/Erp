/**
 * Scope a variant picker to a device's PO condition.
 *
 * A device received against a purchase order keeps that order's condition
 * across an identity correction (spec D11) — a New device can't be re-identified
 * or re-linked onto a Refurbished variant. The condition isn't on the device
 * dossier, so it's resolved from the device's current variant and used to filter
 * the variant list. Shared by ReidentifyDeviceDialog and RelinkPoItemDialog.
 */
import {
  useVariantsListInfinite,
  useVariantClassificationsByIds,
} from "@modules/ims";

import { useDevice } from "../devices/useDevices";

/** Options-hook factory: lists variants scoped to `condition`. Returns a named
 *  inner hook so AsyncSelect gets the shape it expects (mirrors
 *  useWarehouseFilterOptions). `condition` undefined lists all — the server
 *  still guards. */
export function useConditionVariantOptions(
  condition: "new" | "refurbished" | "new_pull" | undefined,
) {
  return function useOptions(search: string, options?: { enabled?: boolean }) {
    return useVariantsListInfinite(search, { ...options, condition });
  };
}

/** Resolve a device's condition (from its current variant) and hand back a
 *  variant options-hook scoped to it. `enabled` gates the fetches to when the
 *  dialog is open. */
export function useDeviceConditionVariantOptions(
  deviceId: string | null,
  enabled: boolean,
) {
  const deviceQuery = useDevice(enabled && deviceId ? deviceId : "");
  const currentVariantId = deviceQuery.data?.device?.part_variant_id ?? "";
  const classification = useVariantClassificationsByIds(
    currentVariantId ? [currentVariantId] : [],
  );
  const condition = classification[0]?.data?.condition;
  const variantOptions = useConditionVariantOptions(condition);
  return { condition, variantOptions };
}
