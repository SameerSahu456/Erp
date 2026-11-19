import { Badge } from "@/components/ui/badge";

import { RENTAL_ORDER_NUMBER_TAG_STRINGS as S } from "./rental-order-number-tag.strings";

/** "Rental" on a material issue or dispatch made for a rental order — its own
 *  SO, or the one a replacement request was raised against. Same look as the
 *  replacement request's rental tag. The SO number sits in the hover hint,
 *  not the label: the row already shows it. Renders nothing otherwise. */
export function RentalOrderNumberTag({ orderNumber }: { orderNumber: string | null | undefined }) {
  if (!orderNumber) return null;
  return (
    <Badge variant="info" size="sm" title={S.hint(orderNumber)} className="shrink-0">
      {S.label}
    </Badge>
  );
}
