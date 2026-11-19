import { useMemo } from "react";

import { fetchAccountOwnerOptions } from "../../api";
import type { UserOptionsSource } from "../../components/shared/AsyncUserMultiSelect";

/**
 * Rentals › Accounts' scope: the `has_rentals` query param and the Owner
 * picker's options narrowed to owners of rental accounts.
 *
 * The page's own Yes/All filters (Has live rentals, Has billing defaults,
 * Has early-exit charges pending — UAT RM27/RM28) were removed on
 * 2026-10-29 at the user's request; the backend still accepts the params.
 *
 * Kept out of `useAccountsList` so the CRM accounts list carries none of
 * it: with `hasRentals` false nothing is sent.
 */
export function useRentalAccountFilters(hasRentals: boolean) {
  /** Query params: `true` narrows; omitted = no filter (never `false`). */
  const params = useMemo(() => ({ has_rentals: hasRentals || undefined }), [hasRentals]);

  // Owner filter options: only users who own an account this list can show
  // (honouring the rentals scope), not every active user.
  const ownerOptionsSource = useMemo<UserOptionsSource>(
    () => ({
      queryKey: ["crm", "accounts", "owner-options", { hasRentals }],
      fetchPage: ({ search, page, page_size }) =>
        fetchAccountOwnerOptions({
          page,
          page_size,
          search,
          has_rentals: hasRentals || undefined,
        }),
    }),
    [hasRentals],
  );

  return { params, ownerOptionsSource };
}
