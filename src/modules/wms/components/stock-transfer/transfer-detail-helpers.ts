import { istTodayDateParam, toISTDateKey } from "@shared/lib/date";

import type { TransferItemResponse } from "../../api";
import { TRANSFERS_PAGE_STRINGS as S } from "./stock-transfer.strings";

/** Lines still on the road — the only ones that can be settled. */
export const IN_FLIGHT = "sent";
export const TRANSFERS_BACK_HREF = "/wms/transfers";

export const TRANSFER_CARRIER_LABELS: Record<string, string> = {
  own_vehicle: S.carrierOwnVehicle,
  courier: S.carrierCourier,
  road: S.carrierRoad,
  air: S.carrierAir,
  rail: S.carrierRail,
  hand_delivery: S.carrierHandDelivery,
};

/** "From → To", with a dash for an unresolved warehouse name. */
export function transferRoute(t: {
  from_warehouse_name?: string | null;
  to_warehouse_name?: string | null;
}): string {
  return `${t.from_warehouse_name ?? "—"} → ${t.to_warehouse_name ?? "—"}`;
}

/** Whole IST calendar days past the expected date; 0 when not late or unknown. */
export function daysOverdue(expectedIso: string | null | undefined): number {
  const key = toISTDateKey(expectedIso);
  if (!key) return 0;
  return Math.max(0, Math.round((Date.parse(istTodayDateParam()) - Date.parse(key)) / 86_400_000));
}

/** Units with no destination rack / bin yet first; otherwise the order is kept. */
export const unplacedFirst = (items: TransferItemResponse[]): TransferItemResponse[] =>
  [...items].sort((a, b) => Number(!!a.to_warehouse_location_id) - Number(!!b.to_warehouse_location_id));

/** The receive table's search (serial, maker serial, part, variant, SKU) and status filter. */
export function filterTransferItems(
  items: TransferItemResponse[],
  search: string,
  status: string,
): TransferItemResponse[] {
  const needle = search.trim().toLowerCase();
  return items.filter((i) => {
    if (status && i.status !== status) return false;
    if (!needle) return true;
    return [i.internal_serial, i.manufacturer_serial, i.part_name, i.variant_name, i.sku_code].some((v) =>
      (v ?? "").toLowerCase().includes(needle),
    );
  });
}
