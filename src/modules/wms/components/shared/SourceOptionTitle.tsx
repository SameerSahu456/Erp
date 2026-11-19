import type { ReactNode } from "react";

import { RentalOrderTag } from "../replacement-requests/RentalOrderTag";

/** First line of a source-document dropdown row: the number, a "Rental" badge
 *  on a rental order, and an optional count on the right. The second line
 *  (who · parts) comes from the picker's `getDescription`. */
export function SourceOptionTitle({
  number,
  isRental,
  aside,
}: {
  number: string;
  isRental?: boolean | null;
  aside?: ReactNode;
}) {
  return (
    <span className="flex min-w-0 items-center justify-between gap-2">
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="min-w-0 truncate">{number}</span>
        <span className="shrink-0">
          <RentalOrderTag isRental={isRental} />
        </span>
      </span>
      {aside}
    </span>
  );
}
