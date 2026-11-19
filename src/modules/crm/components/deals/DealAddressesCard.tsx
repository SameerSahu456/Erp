import { Link } from "react-router-dom"
import { MapPin } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { useDealDetail } from "../../hooks/deals/useDealDetail"
import { DEALS_STRINGS } from "./deals.strings"

type Detail = ReturnType<typeof useDealDetail>

interface DealAddressesCardProps {
  apiAccount: Detail["apiAccount"]
  addresses: Detail["apiAddresses"]
  isLoading: boolean
  isError: boolean
  showAll: boolean
  onToggleShowAll: () => void
}

// Read-only view of the underlying account's addresses. Editing happens on the
// account page (Manage link).
export function DealAddressesCard({
  apiAccount,
  addresses,
  isLoading,
  isError,
  showAll,
  onToggleShowAll,
}: DealAddressesCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="size-4" />
          {DEALS_STRINGS.detail.addresses.title}
          {apiAccount && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto h-7 text-xs"
              render={<Link to={`/crm/accounts/${apiAccount.id}`} />}
            >
              {DEALS_STRINGS.detail.addresses.manage}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            {DEALS_STRINGS.detail.addresses.loading}
          </p>
        ) : isError ? (
          <p className="text-xs text-destructive text-center py-2">
            {DEALS_STRINGS.detail.addresses.loadError}
          </p>
        ) : addresses.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            {DEALS_STRINGS.detail.addresses.empty}
          </p>
        ) : (
          <div className="space-y-3">
            {(showAll ? addresses : addresses.slice(0, 2)).map((addr, idx) => (
              <div
                key={addr.id}
                className={cn("space-y-1", idx > 0 && "border-t pt-3")}
              >
                <div className="flex items-center gap-2">
                  {addr.label && (
                    <span className="text-sm font-medium">{addr.label}</span>
                  )}
                  <Badge variant="outline" className="text-[10px]">
                    {addr.address_type}
                  </Badge>
                  {addr.is_default && (
                    <Badge variant="secondary" className="text-[10px]">
                      {DEALS_STRINGS.detail.addresses.default}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{addr.line1}</p>
                {addr.line2 && (
                  <p className="text-xs text-muted-foreground">{addr.line2}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {addr.city}, {addr.state} — {addr.pincode}
                </p>
              </div>
            ))}
            {addresses.length > 2 && (
              <button
                type="button"
                onClick={onToggleShowAll}
                className="text-xs font-medium text-primary hover:underline"
              >
                {showAll
                  ? DEALS_STRINGS.detail.addresses.showLess
                  : DEALS_STRINGS.detail.addresses.showMore(addresses.length - 2)}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
