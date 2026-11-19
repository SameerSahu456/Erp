import { Badge } from "@/components/ui/badge"

import { ACCOUNTS_STRINGS as S } from "./accounts.strings"
import { AccountEmptyState } from "./AccountEmptyState"

interface AccountAddressGridProps {
  title: string
  addresses: Array<{
    id: string
    label: string | null
    line1: string
    line2: string | null
    city: string
    state: string
    pincode: string
    is_default: boolean
  }>
  empty: string
}

export function AccountAddressGrid({ title, addresses, empty }: AccountAddressGridProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {addresses.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">{addr.label || S.addresses.untitled}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{addr.line1}</p>
                  {addr.line2 && (
                    <p className="text-xs text-muted-foreground">{addr.line2}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {addr.city}, {addr.state} - {addr.pincode}
                  </p>
                </div>
                {addr.is_default && (
                  <Badge variant="primary-soft" size="sm">
                    {S.addresses.default}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <AccountEmptyState text={empty} />
      )}
    </div>
  )
}
