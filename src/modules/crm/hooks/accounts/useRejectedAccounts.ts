import { useAccountsList } from "./useAccountsList"

// Admin-only "Rejected" tab on the Accounts page. Thin wrapper over
// useAccountsList that forces the KYC approval filter to ["Rejected"] and
// namespaces its persisted filters + URL pager (`?rej_page`) so it never
// collides with the "All Accounts" tab (which shares the same route).
//
// Visibility/access is gated by the caller (AccountsPage) on `isAdminRole`
// (is_superuser OR ADMIN/SUPERADMIN role); pass `enabled` so the query stays
// idle unless the Rejected tab is both permitted and active.
export function useRejectedAccounts(options?: { enabled?: boolean }) {
  return useAccountsList({
    enabled: options?.enabled ?? true,
    approvalStatuses: ["Rejected"],
    persistPrefix: "accounts_rejected",
    pageKey: "rej_page",
  })
}
