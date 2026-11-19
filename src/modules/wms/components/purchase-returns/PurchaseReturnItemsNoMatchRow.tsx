import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Typography } from "@/components/ui/typography";

import { PURCHASE_RETURN_DETAIL_STRINGS as S } from "./purchase-returns.strings";

interface NoMatchRowProps {
  colSpan: number;
  itemSearch: string;
  dispositionFilter: string;
  onClearSearch: () => void;
  onClearFilter: () => void;
}

/** Zero-result state for the items search / disposition filter — the same
 *  centred icon + title + hint + reset buttons the listing pages show, so a
 *  filtered-empty table never dead-ends (§1.1). Each button clears only its own
 *  facet, so the other stays applied. */
export function PurchaseReturnItemsNoMatchRow({
  colSpan,
  itemSearch,
  dispositionFilter,
  onClearSearch,
  onClearFilter,
}: NoMatchRowProps) {
  const hasActiveFacet = itemSearch.trim() !== "" || dispositionFilter !== "";
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-14 text-center">
        <div className="flex flex-col items-center gap-2">
          <SearchX
            className="size-8 text-muted-foreground/50"
            aria-hidden="true"
          />
          <Typography variant="body-strong">{S.units.noMatch}</Typography>
          <Typography
            variant="helper"
            tone="muted"
            className="max-w-md text-pretty"
          >
            {S.units.noMatchHint}
          </Typography>
          {hasActiveFacet && (
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              {itemSearch.trim() !== "" && (
                <Button variant="outline" size="sm" onClick={onClearSearch}>
                  {S.units.clearSearch}
                </Button>
              )}
              {dispositionFilter !== "" && (
                <Button variant="outline" size="sm" onClick={onClearFilter}>
                  {S.units.clearFilters}
                </Button>
              )}
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
