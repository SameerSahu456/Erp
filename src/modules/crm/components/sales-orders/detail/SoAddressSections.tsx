import { MapPin, Truck } from "lucide-react"

import { AddressBlock, SectionCard } from "./SoDetailPrimitives"
import type { SalesOrderWire } from "../../../api"
import type { SalesOrderDetailController } from "../../../hooks/sales-orders/useSalesOrderDetail"
import { SALES_ORDERS_STRINGS as S } from "../sales-orders.strings"

export function SoAddressSections({
  so,
  detail,
}: {
  so: SalesOrderWire
  detail: SalesOrderDetailController
}) {
  const { billingAddress, shippingAddress, addressesQuery } = detail

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <SectionCard
        title={S.detail.sections.billingAddress}
        icon={<MapPin className="size-4 text-muted-foreground" />}
      >
        <AddressBlock
          address={billingAddress}
          loading={addressesQuery.isLoading}
          fallbackId={so.billing_address_id}
        />
      </SectionCard>
      <SectionCard
        title={S.detail.sections.shippingAddress}
        icon={<Truck className="size-4 text-muted-foreground" />}
      >
        <AddressBlock
          address={shippingAddress}
          loading={addressesQuery.isLoading}
          fallbackId={so.shipping_address_id}
        />
      </SectionCard>
    </div>
  )
}
