import { STOCK_TRANSFER_STRINGS as S } from "./stock-transfer.strings";

// Mirrors RelocateRequest.stock_item_ids max_length on the backend.
export const RELOCATE_MAX = 200;

// Notes are a short operator memo, not a document field — a tight cap keeps
// them scannable and drives the live counter shown under the textarea.
export const NOTES_MAX = 100;

// The stock statuses whose units are physically IN the warehouse and so may be
// moved: `available` (sellable, idle), `in_operations` (mid inspection /
// repair / qc — still on the floor) and `scrapped` (condemned, but still
// sitting on its shelf). Every OTHER status means the unit has LEFT the
// warehouse (dispatched / issued / in_transit / installed /
// returned_to_vendor / lost_in_transit / pending_return) or is no longer a
// movable unit (consumed / disposed / dismantled / damaged) — so it is never
// offered. `available` is the only one that may also CROSS warehouses (see
// `MovableUnit.status`); the dialog enforces that per unit.
//
// `scrapped` MUST stay here (device-scrap D3). Scrap deliberately does not
// place the unit — a condemned machine is dead whether or not a shelf has
// room — so carrying the dead box to the scrap area is an ordinary Move
// Stock. Drop it from this list and the manager simply has no button, which
// is how the device-placement rollout stayed unreachable for four rounds:
// every gap failed by HIDING, never by erroring. `disposed` stays excluded —
// that unit has genuinely left the building.
export const MOVABLE_STATUSES: readonly string[] = [
  "available",
  "in_operations",
  "scrapped",
];

/** True when a unit's stock status means it is in the warehouse and movable. */
export const isMovableStatus = (status?: string | null): boolean =>
  status != null && MOVABLE_STATUSES.includes(status);

/** A unit the operator may move. Serial-first: the rack is a real place. */
export interface MovableUnit {
  id: string;
  internalSerial: string;
  manufacturerSerial?: string | null;
  /** Needed by variant mode: "move 5" is ambiguous on a multi-variant part. */
  variantPartId?: string | null;
  /** The warehouse the unit sits in — the dialog derives the source from it. */
  warehouseId?: string | null;
  /** Catalog identity. A bare serial does not say WHAT is being moved, which
   *  matters most from a part page, where the list spans variants. */
  partName?: string | null;
  partNumber?: string | null;
  skuCode?: string | null;
  condition?: string | null;
  variantLabel?: string | null;
  categoryName?: string | null;
  locationName?: string | null;
  /**
   * Stock status. Only `available` units may CROSS warehouses: a transfer
   * clears the location, flips the unit to `in_transit`, and the destination
   * receipt opens a NEW inspection op — so shipping a mid-pipeline device
   * would orphan its open op at the source and give it two op chains. Parking
   * it WITHIN its warehouse is fine at any stage, which is why the picker
   * offers `in_operations` units at all.
   */
  status?: string | null;
}

export interface MoveStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The warehouse the units are currently in. OPTIONAL: callers whose stock
   * query is lazy (the part page loads stock only when its Inventory tab is
   * open) cannot know this at render time, so the dialog derives it from the
   * units it resolves.
   */
  warehouseId?: string;
  /**
   * Optional display name for the source warehouse. Omit it and the dialog
   * resolves the name from the warehouse list — callers holding only ids (the
   * variant page, the device page) should not have to fetch one just to label
   * a dropdown.
   */
  warehouseName?: string;
  /**
   * Resolve movable units from the catalog instead of receiving them.
   *
   * The part page loads its stock ONLY when the Inventory tab is open
   * (`enabled: isInventoryActive`), so a header action that depended on that
   * data never appeared. Passing an id here makes the dialog self-sufficient:
   * it fetches available units itself, gated on `open`.
   */
  partId?: string;
  variantId?: string;
  units: MovableUnit[];
  defaultSelectedIds?: string[];
}

export type CarrierMode =
  | "own_vehicle"
  | "courier"
  | "road"
  | "air"
  | "rail"
  | "hand_delivery";

export type SelectMode = "serial" | "variant";
export const SELECT_MODES: readonly SelectMode[] = ["variant", "serial"];

// A non-empty sentinel: Base UI Select treats "" as "no value", so an item
// with an empty value makes the trigger fall back to rendering the raw id.
export const SAME_WAREHOUSE = "__same__";

/** One row per variant present in the movable pool. */
export interface VariantGroup {
  variantId: string;
  label: string;
  sku: string | null;
  condition: string | null;
  units: MovableUnit[];
}

export const CARRIER_LABELS: Record<CarrierMode, string> = {
  own_vehicle: S.carrierOwnVehicle,
  courier: S.carrierCourier,
  road: S.carrierRoad,
  air: S.carrierAir,
  rail: S.carrierRail,
  hand_delivery: S.carrierHandDelivery,
};

// One row per variant, units kept OLDEST FIRST inside each (the API returns
// them that way) so "3 of refurbished" takes the three that have sat longest.
export function groupUnitsByVariant(pool: MovableUnit[]): VariantGroup[] {
  const byVariant = new Map<string, VariantGroup>();
  for (const u of pool) {
    const id = u.variantPartId ?? "__unknown";
    const existing = byVariant.get(id);
    if (existing) existing.units.push(u);
    else
      byVariant.set(id, {
        variantId: id,
        label: u.variantLabel ?? S.unknownVariant,
        sku: u.skuCode ?? null,
        condition: u.condition ?? null,
        units: [u],
      });
  }
  return [...byVariant.values()];
}

/** Units with no rack / bin first (they still need a home); otherwise the order is kept. */
export const unassignedFirst = (units: MovableUnit[]): MovableUnit[] =>
  [...units].sort((a, b) => Number(!!a.locationName) - Number(!!b.locationName));

// The LIST shows everything; eligibility only governs what can be ticked.
export function searchUnits(pool: MovableUnit[], search: string): MovableUnit[] {
  const q = search.trim().toLowerCase();
  if (!q) return pool;
  return pool.filter((u) =>
    [
      u.internalSerial,
      u.manufacturerSerial,
      u.partNumber,
      u.partName,
      u.skuCode,
      u.variantLabel,
    ]
      .filter(Boolean)
      .some((field) => (field as string).toLowerCase().includes(q)),
  );
}

/** Transfer-only logistics, as entered. */
export interface TransferLogisticsForm {
  carrier: CarrierMode | "";
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  courierName: string;
  docket: string;
  expectedDelivery: string;
  challanNumber: string;
}

export const EMPTY_TRANSFER_LOGISTICS: TransferLogisticsForm = {
  carrier: "",
  vehicleNumber: "",
  driverName: "",
  driverPhone: "",
  courierName: "",
  docket: "",
  expectedDelivery: "",
  challanNumber: "",
};

/** First blocking problem with a transfer's logistics (a toast message), or
 *  null when it can be sent. `todayStr` is the local yyyy-mm-dd today. */
export function transferLogisticsError(
  f: TransferLogisticsForm,
  todayStr: string,
): string | null {
  if (!f.expectedDelivery) return S.validationNoEta;
  // Expected delivery can't be a past date.
  if (f.expectedDelivery < todayStr) return S.validationPastEta;
  // Carrier starts unset — narrows to a real CarrierMode past this guard.
  if (!f.carrier) return S.validationNoCarrierMode;
  if (f.carrier === "own_vehicle" && !f.vehicleNumber.trim())
    return S.validationNoVehicle;
  if (f.carrier !== "own_vehicle" && (!f.courierName.trim() || !f.docket.trim()))
    return S.validationNoCarrier;
  // Driver phone is optional, but when given must be a plausible number
  // (7-15 digits, ignoring +, spaces, and separators).
  const phoneDigits = f.driverPhone.replace(/\D/g, "");
  if (f.driverPhone.trim() && (phoneDigits.length < 7 || phoneDigits.length > 15))
    return S.validationBadPhone;
  return null;
}

/** Whether any transfer-logistics field holds operator input. */
export function transferLogisticsDirty(f: TransferLogisticsForm): boolean {
  return (
    f.carrier !== "" ||
    f.vehicleNumber.trim().length > 0 ||
    f.driverName.trim().length > 0 ||
    f.driverPhone.trim().length > 0 ||
    f.courierName.trim().length > 0 ||
    f.docket.trim().length > 0 ||
    f.challanNumber.trim().length > 0 ||
    f.expectedDelivery.length > 0
  );
}
