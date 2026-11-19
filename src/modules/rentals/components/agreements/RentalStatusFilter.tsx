import { SO_STATUS_LABELS, type SOStatus } from "@modules/crm";

import type { RentalStatus } from "../../api/agreements";
import { RENTAL_STATUS_LABELS } from "../../constants/billing";
import { FilterSelect } from "../shared/filters/FilterSelect";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";

/** The list's two status filters, one per lifecycle. They are independent
 *  and both sent: the API ANDs `so_status` with `rental_status`. Both are the
 *  shared `FilterSelect` — same size, placeholder and × as every filter. */
export interface StatusSelection {
  soStatus?: string;
  rentalStatus?: RentalStatus;
}

/** "Order status" — the CRM sales order's own lifecycle, in CRM's labels
 *  so `PartiallyDispatched` reads "Partially Dispatched" as on CRM pages. */
export function OrderStatusFilter({
  value,
  onChange,
  options,
}: {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  options: string[];
}) {
  return (
    <FilterSelect
      placeholder={S.list.filters.orderStatus}
      value={value}
      onChange={onChange}
      options={options.map((v) => ({ value: v, label: SO_STATUS_LABELS[v as SOStatus] ?? v }))}
    />
  );
}

/** "Rental status" — the rental contract's lifecycle. */
export function RentalStatusFilter({
  value,
  onChange,
  options,
}: {
  value: RentalStatus | undefined;
  onChange: (next: RentalStatus | undefined) => void;
  options: RentalStatus[];
}) {
  return (
    <FilterSelect
      placeholder={S.list.filters.rentalStatus}
      value={value}
      onChange={(next: string | undefined) => onChange(next as RentalStatus | undefined)}
      options={options.map((v) => ({ value: v, label: RENTAL_STATUS_LABELS[v] ?? v }))}
    />
  );
}
