import type {
  WarehouseLocation,
  WarehouseLocationCreate,
  WarehouseLocationUpdate,
} from "../../api";
import { type CapacityMode } from "../../constants";
import { type LocationFormValues } from "../../schemas";

// ── Helpers ────────────────────────────────────────────────────────────

// A new bin starts as a multi-slot bin of this many slots.
const DEFAULT_BIN_CAPACITY = 20;

function rackModeOf(location: WarehouseLocation): LocationFormValues["rack_mode"] {
  if (location.level !== "rack") return undefined;
  return location.can_store_stock ? "direct_storage" : "with_bins";
}

export function defaultsFor(
  location: WarehouseLocation | undefined,
  initialLevel: "rack" | "bin",
): LocationFormValues {
  if (!location) {
    return {
      level: initialLevel,
      name: "",
      description: "",
      rack_mode: initialLevel === "rack" ? "with_bins" : undefined,
      parent_location_id: undefined,
      capacity_mode: initialLevel === "bin" ? "multiple" : undefined,
      capacity: initialLevel === "bin" ? DEFAULT_BIN_CAPACITY : undefined,
      is_active: true,
    };
  }
  return {
    level: location.level as "rack" | "bin",
    name: location.name,
    description: location.description ?? "",
    rack_mode: rackModeOf(location),
    parent_location_id: (location.parent_location_id ?? undefined) as
      | string
      | undefined,
    capacity_mode: (location.capacity_mode ?? undefined) as
      | CapacityMode
      | undefined,
    capacity: location.capacity ?? undefined,
    is_active: location.is_active,
  };
}

export function toBackendCreatePayload(
  values: LocationFormValues,
): WarehouseLocationCreate {
  if (values.level === "rack") {
    const canStore = values.rack_mode === "direct_storage";
    return {
      level: "rack",
      name: values.name.trim(),
      description: values.description?.trim() || null,
      can_store_stock: canStore,
      capacity_mode: canStore ? values.capacity_mode ?? null : null,
      capacity: canStore ? values.capacity ?? null : null,
      parent_location_id: null,
      is_active: values.is_active,
    };
  }
  return {
    level: "bin",
    name: values.name.trim(),
    description: values.description?.trim() || null,
    can_store_stock: true,
    capacity_mode: values.capacity_mode ?? null,
    capacity: values.capacity ?? null,
    parent_location_id: values.parent_location_id ?? null,
    is_active: values.is_active,
  };
}

/** Edit payload; level, parent and warehouse are immutable. */
export function toBackendUpdatePayload(
  location: WarehouseLocation,
  values: LocationFormValues,
): WarehouseLocationUpdate {
  const updates: WarehouseLocationUpdate = {
    name: values.name.trim(),
    description: values.description?.trim() || null,
    is_active: values.is_active,
  };
  // Rack-mode flip + capacity changes are allowed on a rack.
  if (location.level === "rack" && values.rack_mode) {
    const canStore = values.rack_mode === "direct_storage";
    if (canStore !== location.can_store_stock) updates.can_store_stock = canStore;
  }
  if (
    (location.level === "bin" || values.rack_mode === "direct_storage") &&
    values.capacity_mode &&
    values.capacity != null
  ) {
    updates.capacity_mode = values.capacity_mode;
    updates.capacity = values.capacity;
  }
  // Switching to rack-with-bins clears capacity fields server-side.
  if (location.level === "rack" && values.rack_mode === "with_bins" && location.can_store_stock) {
    updates.capacity_mode = null;
    updates.capacity = null;
  }
  return updates;
}
