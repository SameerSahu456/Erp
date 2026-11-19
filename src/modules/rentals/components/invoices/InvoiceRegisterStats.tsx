import { FileText, FileX2, IndianRupee } from "lucide-react";

import { StatsRow } from "@/components/common/display/StatsRow";
import { formatINRShort } from "@/lib/currency";

import type { RentalInvoiceRegisterSummary } from "../../api/invoices";
import { INVOICE_STRINGS as S } from "./invoices.strings";

/** The register's KPI tiles. The total is abbreviated (a tile read at a
 *  glance); the rows below stay full precision. Voided invoices are counted,
 *  never valued — they hold their number so the gap is auditable. */
export function InvoiceRegisterStats({ summary }: { summary: RentalInvoiceRegisterSummary }) {
  return (
    <StatsRow
      stats={[
        {
          label: S.invoices.liveTotal,
          value: formatINRShort(Number(summary.live_total)),
          icon: IndianRupee,
          accent: "primary",
          sub: S.invoices.liveTotalSub,
        },
        {
          label: S.invoices.liveCount,
          value: summary.live_count,
          icon: FileText,
          accent: "info",
          sub: S.invoices.liveCountSub,
        },
        {
          label: S.invoices.voidedCount,
          value: summary.deleted_count,
          icon: FileX2,
          accent: summary.deleted_count > 0 ? "warning" : "teal",
          sub: S.invoices.voidedCountSub,
        },
      ]}
    />
  );
}
