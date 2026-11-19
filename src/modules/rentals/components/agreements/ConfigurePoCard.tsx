import { FileText } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import type { PoPeriod } from "../../hooks/agreements/useRentalAgreementForm";
import type { PoPaper } from "../../lib/poPaper";
import { PoPaperFields } from "../purchase-orders/PoPaperFields";
import { PoPeriodFields } from "../purchase-orders/PoPeriodFields";
import { SectionHeader } from "../shared/SectionHeader";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";

const C = S.configure;

interface ConfigurePoCardProps {
  paper: PoPaper;
  onPaperChange: (next: PoPaper) => void;
  period: PoPeriod;
  onPeriodChange: (next: PoPeriod) => void;
  /** The order's current end date; the PO may run longer, never shorter. */
  orderEnd: string | null;
  disabled?: boolean;
}

/** PO Required is ticked and the order is not on a PO yet: the customer's PO
 *  — number, date, document and the period printed on it, all mandatory —
 *  or that it is not available yet, so the order runs as Awaiting PO. */
export function ConfigurePoCard({
  paper,
  onPaperChange,
  period,
  onPeriodChange,
  orderEnd,
  disabled,
}: ConfigurePoCardProps) {
  return (
    <Card>
      <SectionHeader icon={FileText} title={C.poTitle} subtitle={C.poSubtitle} />
      <CardContent className="space-y-4">
        <PoPaperFields idPrefix="configure-po" value={paper} onChange={onPaperChange} disabled={disabled} />
        {paper.available ? (
          <PoPeriodFields
            idPrefix="configure-po"
            validFrom={period.validFrom}
            validTo={period.validTo}
            onChange={onPeriodChange}
            orderEnd={orderEnd}
            disabled={disabled}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
