import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";

import type { TransferReceiveState } from "../../hooks/stock-transfer/useTransferReceive";
import { TRANSFERS_PAGE_STRINGS as S } from "./stock-transfer.strings";

/** Zero-result state for the units search / status filter, so a filtered-empty
 *  list never dead-ends. One "Clear filters" resets the search and the status. */
export function TransferNoMatch({ receive }: { receive: TransferReceiveState }) {
  const filtered = receive.search.trim() !== "" || receive.status !== "";
  const clearAll = () => {
    receive.setSearch("");
    receive.setStatus("");
  };
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <SearchX className="size-8 text-muted-foreground/50" aria-hidden="true" />
      <Typography variant="body-strong">{S.noUnitsMatch}</Typography>
      <Typography variant="helper" tone="muted" className="max-w-md text-pretty">
        {S.noUnitsMatchHint}
      </Typography>
      {filtered && (
        <Button variant="outline" size="sm" className="mt-1" onClick={clearAll}>
          {S.clearFilters}
        </Button>
      )}
    </div>
  );
}
