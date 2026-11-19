import type { components } from "@/shared/api/schema.gen";

import { apiClient } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";

// Billing configuration: account defaults, installation settings, the manual
// billing run and the PO-renewal email.

// ─── Account billing defaults ────────────────────────────────────────

export type AccountBillingSettings =
  components["schemas"]["RentalAccountSettingResponse"];

export type AccountBillingSettingsPayload =
  components["schemas"]["RentalAccountSettingUpsert"];

// GET /api/v1/rentals/accounts/{id}/settings — system defaults when never set.
export async function fetchAccountBillingSettings(
  accountId: string,
): Promise<AccountBillingSettings> {
  return apiClient.get<AccountBillingSettings>(
    endpoints.rentals.accountSettings(accountId),
  );
}

// PUT /api/v1/rentals/accounts/{id}/settings
export async function saveAccountBillingSettings(
  accountId: string,
  payload: AccountBillingSettingsPayload,
): Promise<AccountBillingSettings> {
  return apiClient.put<AccountBillingSettings>(
    endpoints.rentals.accountSettings(accountId),
    payload,
  );
}

// ─── Account billing clerks ──────────────────────────────────────────

export type AccountBillingClerks =
  components["schemas"]["AccountBillingClerksResponse"];

// GET /api/v1/rentals/accounts/{id}/billing-clerks — empty list when none.
export async function fetchAccountBillingClerks(
  accountId: string,
): Promise<AccountBillingClerks> {
  return apiClient.get<AccountBillingClerks>(
    endpoints.rentals.accountBillingClerks(accountId),
  );
}

// PUT /api/v1/rentals/accounts/{id}/billing-clerks — replaces the whole set.
export async function saveAccountBillingClerks(
  accountId: string,
  userIds: string[],
): Promise<AccountBillingClerks> {
  return apiClient.put<AccountBillingClerks>(
    endpoints.rentals.accountBillingClerks(accountId),
    { user_ids: userIds },
  );
}

// ─── Installation settings ───────────────────────────────────────────

export type RentalSettings = components["schemas"]["RentalSettingsResponse"];
export type RentalSettingsPayload = components["schemas"]["RentalSettingsUpdate"];

/** The ONE audit resource id every rental-settings change is filed under —
 *  mirrors the backend's `RENTAL_SETTINGS_RESOURCE_ID`. */
export const RENTAL_SETTINGS_AUDIT_ID = "5e771e65-0000-4000-8000-000000000001";

export async function fetchRentalSettings(): Promise<RentalSettings> {
  return apiClient.get<RentalSettings>(endpoints.rentals.settings);
}

export async function saveRentalSettings(
  payload: RentalSettingsPayload,
): Promise<RentalSettings> {
  return apiClient.put<RentalSettings>(endpoints.rentals.settings, payload);
}

// ─── The manual billing run ──────────────────────────────────────────

export type BillingRunResult = components["schemas"]["BillingRunResponse"];

/** Each day bills as the scheduler would; both blank = today, `to` blank = `from`. */
export interface BillingRunRange {
  from: string | null;
  to: string | null;
}

/** Mirrors the backend's `MAX_BILLING_RUN_RANGE_DAYS`. */
export const MAX_BILLING_RUN_RANGE_DAYS = 62;

// POST /api/v1/rentals/billing/run — safe to repeat.
export async function runBilling(range: BillingRunRange): Promise<BillingRunResult> {
  const from = range.from || null;
  const to = range.to || null;
  if (from && to) {
    return apiClient.post<BillingRunResult>(endpoints.rentals.billingRun, {
      from_date: from,
      to_date: to,
    });
  }
  return apiClient.post<BillingRunResult>(endpoints.rentals.billingRun, {
    run_date: from ?? to,
  });
}

// ─── The PO renewal email ────────────────────────────────────────────

export type PoRenewalSettings =
  components["schemas"]["PoRenewalSettingsResponse"];

export type PoRenewalSettingsPayload =
  components["schemas"]["PoRenewalSettingsUpdate"];

// GET /api/v1/rentals/settings/po-renewal
export async function fetchPoRenewalSettings(): Promise<PoRenewalSettings> {
  return apiClient.get<PoRenewalSettings>(endpoints.rentals.poRenewalSettings);
}

// PATCH /api/v1/rentals/settings/po-renewal — omitted fields are kept.
export async function savePoRenewalSettings(
  payload: PoRenewalSettingsPayload,
): Promise<PoRenewalSettings> {
  return apiClient.patch<PoRenewalSettings>(
    endpoints.rentals.poRenewalSettings,
    payload,
  );
}
