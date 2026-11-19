import type { components } from "@shared/api/schema.gen";
import { apiClient } from "@shared/api/client";
import { endpoints } from "@shared/api/endpoints";

import type { GrnBatchResponse } from "./inward";

// Rental return by count (return-by-count spec §5). The customer sends boxes
// by model and count, so each scan is classified against the ACCOUNT's units
// on rent: accepted, or held for a person to resolve (§8).

export type ReceiveUnitInput = components["schemas"]["ReceiveUnitInput"];
export type RentalScanOutcome = components["schemas"]["RentalScanOutcome"];
export type UnannouncedRentalReturnBatchCreate =
  components["schemas"]["UnannouncedRentalReturnBatchCreate"];

/**
 * Classify scans against an open rental-return batch. Read-only — nothing is
 * staged or booked; the outcome says what finalize WOULD do with each scan,
 * plus the warnings sales cares about (rate difference, order fully returned,
 * early-exit estimate).
 */
export async function previewRentalScans(
  grnBatchId: string,
  scans: ReceiveUnitInput[],
): Promise<RentalScanOutcome[]> {
  return apiClient.post<RentalScanOutcome[]>(
    endpoints.wms.grnBatchRentalScanPreview(grnBatchId),
    { scans },
  );
}

/**
 * Boxes arrived with no request (R7). Opens a rental-return batch on a
 * request created for the account (origin `unannounced`, approved on
 * creation).
 */
export async function createUnannouncedRentalReturn(
  body: UnannouncedRentalReturnBatchCreate,
): Promise<GrnBatchResponse> {
  return apiClient.post<GrnBatchResponse>(
    endpoints.wms.grnBatchUnannouncedRentalReturn,
    body,
  );
}
