import type { components } from "@shared/api/schema.gen";
import { apiClient } from "@shared/api/client";
import { endpoints } from "@shared/api/endpoints";

// Kit lists (return-by-count §9, P6): what went out with a rental unit —
// charger, bag, mouse — ticked at dispatch, then checked off on return.
// A kit line is not a stock item; a missing or broken one raises a
// customer deficiency for sales to charge.

export type DispatchKitItem = components["schemas"]["DispatchKitItemResponse"];
export type DispatchKitTick = components["schemas"]["DispatchKitTick"];
export type ReturnKit = components["schemas"]["ReturnKitResponse"];
export type ReturnKitTick = components["schemas"]["ReturnKitTick"];

export const fetchDispatchKit = (driId: string) =>
  apiClient.get<DispatchKitItem[]>(endpoints.wms.dispatchKit(driId));

export const saveDispatchKit = (driId: string, items: DispatchKitTick[]) =>
  apiClient.put<DispatchKitItem[]>(endpoints.wms.dispatchKit(driId), { items });

export const fetchReturnKit = (grnLineItemId: string) =>
  apiClient.get<ReturnKit>(endpoints.wms.returnKit(grnLineItemId));

export const saveReturnKit = (grnLineItemId: string, items: ReturnKitTick[]) =>
  apiClient.put<ReturnKit>(endpoints.wms.returnKit(grnLineItemId), { items });
