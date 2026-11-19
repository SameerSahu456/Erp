import { useFormState } from "react-hook-form"
import { Building2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Typography } from "@/components/ui/typography"
import { AsyncSelect } from "@/components/ui/async-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FieldError } from "@/components/common/forms/FieldError"
import { useRentalReturnEligibleAccountOptions } from "@modules/crm"

import { RENTAL_RETURN_REQUESTS_STRINGS as S } from "./rental-return-requests.strings"
import type { RentalReturnFormState } from "../../hooks/rental-return-requests/useRentalReturnForm"

const C = S.form.customerStep

type Props = Pick<
  RentalReturnFormState,
  "form" | "account" | "pickAccount" | "orders" | "orderId" | "pickOrder"
>

export function RentalReturnCustomerCard(props: Props) {
  const { form, account, pickAccount, orders, orderId, pickOrder } = props
  const { errors } = useFormState({
    control: form.control,
    name: ["accountId", "declaredSalesOrderId"],
  })
  const orderLabel = orders.find((o) => o.sales_order_id === orderId)?.order_number

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="size-4" />
          {S.form.steps.customer}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <Label required>{C.label}</Label>
          {/* Only customers with a rental order and a unit still free to
              return (2026-11-16) — never one the create would refuse. */}
          <AsyncSelect
            value={account}
            onValueChange={pickAccount}
            useOptions={useRentalReturnEligibleAccountOptions}
            toLabel={(a) => a.name}
            placeholder={C.placeholder}
            searchPlaceholder={C.searchPlaceholder}
            emptyText={C.noCustomers}
            className="w-full"
          />
          <FieldError message={errors.accountId?.message} />
        </div>

        <div className="min-w-0 space-y-2">
          <Label required>{C.declaredOrderLabel}</Label>
          <Select
            value={orderId || null}
            onValueChange={(v) => v && pickOrder(v)}
            disabled={orders.length === 0}
          >
            <SelectTrigger className="w-full" clearable={false}>
              <SelectValue placeholder={C.declaredOrderPlaceholder}>
                {orderLabel ?? C.declaredOrderPlaceholder}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {orders.map((o) => (
                <SelectItem key={o.sales_order_id} value={o.sales_order_id}>
                  {o.order_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.declaredSalesOrderId?.message} />
          <Typography variant="helper" tone="muted">
            {C.declaredOrderHelper}
          </Typography>
        </div>
      </CardContent>
    </Card>
  )
}
