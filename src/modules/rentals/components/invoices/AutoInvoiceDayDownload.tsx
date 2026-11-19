import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePermission } from "@shared/rbac";

import { useDownloadAutoDay } from "../../hooks/invoices/useInvoiceFiles";
import { rentalsCan } from "../../permissions";
import { INVOICE_STRINGS as S } from "./invoices.strings";

const A = S.invoices.autoDays;

export interface AutoInvoiceDayDownloadProps {
  /** `YYYY-MM-DD` — the run day. */
  day: string;
}

/**
 * Downloads one day's billing run as a Tally voucher JSON.
 *
 * There is no per-day export endpoint: a day IS a date range whose ends
 * are equal, so this reuses the register's own `format=json` export —
 * the same "Import-Sales" document the range export produces, so a day
 * filed from here and a period filed from the Export dialog cannot
 * disagree about a figure or a tax split.
 *
 * The busy state is LOCAL to the row. A table-wide flag would grey every
 * button while one day was preparing, which reads as "the page is busy"
 * rather than "this file is coming".
 */
export function AutoInvoiceDayDownload({ day }: AutoInvoiceDayDownloadProps) {
  // Both ends equal: exactly the invoices the row counts, as Tally JSON.
  const download = useDownloadAutoDay();
  const busy = download.isPending;
  // GET /invoices/export's own code: without it the row has no button.
  const canExport = usePermission().canAny(rentalsCan.exportInvoices);
  if (!canExport) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      aria-label={A.downloadLabel}
      // The row itself has no click target on this tab, but a button
      // inside a table row still stops propagation so it cannot be made
      // to do two things at once if one is ever added.
      onClick={(e) => {
        e.stopPropagation();
        download.mutate(day);
      }}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      {busy ? A.downloading : A.download}
    </Button>
  );
}

export default AutoInvoiceDayDownload;
