import { ListPageShell } from "@/components/page-shells"
import { AccountsTable, useAccountsList } from "@modules/crm"

import { ACCOUNTS_STRINGS as S } from "../../components/accounts/accounts.strings";

/** Rentals › Accounts.
 *
 *  This is the CRM accounts list, filtered — not a second list. It renders
 *  CRM's own `AccountsTable` driven by CRM's own `useAccountsList`, so the
 *  columns, toolbar filters, sorting, pagination and row permissions are
 *  literally the same code. The only difference is `hasRentals`, which
 *  narrows the server-side query to accounts the rentals module claims:
 *
 *  - accounts that HAVE or HAD a rental sales order — any state, closed
 *    and terminated included, because a finished rental still belongs to
 *    the rental book and its history has to stay reachable; or
 *  - accounts whose rental billing defaults have been set on the account
 *    detail page's Billings tab.
 *
 *  CRM's visibility rules still apply on top, so this page can never
 *  surface an account the viewer could not otherwise see.
 *
 *  `persistPrefix` / `pageKey` are namespaced away from the CRM page's so
 *  the two lists never share persisted filters or collide on `?page`.
 */
function RentalAccountsPage() {
  const list = useAccountsList({
    hasRentals: true,
    persistPrefix: "rental_accounts",
    pageKey: "rpage",
  })

  return (
    <ListPageShell
      title={S.accounts.title}
      subtitle={S.accounts.description}
      className="animate-fade-in-up"
    >
      <AccountsTable list={list} />
    </ListPageShell>
  )
}

export { RentalAccountsPage }
export default RentalAccountsPage
