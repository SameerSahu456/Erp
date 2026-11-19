import type { useAccountDetail } from "../../hooks/accounts/useAccountDetail"
import { ACCOUNTS_STRINGS as S } from "./accounts.strings"
import { AccountAddressGrid } from "./AccountAddressGrid"

type Detail = ReturnType<typeof useAccountDetail>

interface AccountAddressesTabProps {
  billingAddresses: Detail["billingAddresses"]
  shippingAddresses: Detail["shippingAddresses"]
}

export function AccountAddressesTab({ billingAddresses, shippingAddresses }: AccountAddressesTabProps) {
  return (
    <div className="space-y-6">
      <AccountAddressGrid
        title={S.addresses.billingTitle}
        addresses={billingAddresses}
        empty={S.addresses.gridEmptyBilling}
      />
      <AccountAddressGrid
        title={S.addresses.shippingTitle}
        addresses={shippingAddresses}
        empty={S.addresses.gridEmptyShipping}
      />
      <p className="text-xs text-muted-foreground">
        {S.addresses.tabHint}
      </p>
    </div>
  )
}
