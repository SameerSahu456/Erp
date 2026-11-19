import { CalendarClock, Receipt } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import type { RentalPeriod } from "../../lib/cadence";
import type { CadenceFieldGroupProps } from "../shared/cadence-field-utils";
import { CadenceInvoicingFields } from "../shared/CadenceInvoicingFields";
import { CadenceScheduleFields } from "../shared/CadenceScheduleFields";
import { SectionHeader } from "../shared/SectionHeader";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";

const C = S.configure;
const GRID = "grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2";

type CardProps = Omit<CadenceFieldGroupProps, "idPrefix">;

/** When each period runs. `period`: the order's dates. */
export function ConfigureScheduleCard(props: CardProps & { period?: RentalPeriod }) {
  return (
    <Card>
      <SectionHeader icon={CalendarClock} title={C.scheduleTitle} subtitle={C.scheduleSubtitle} />
      <CardContent>
        <div className={GRID}>
          <CadenceScheduleFields idPrefix="so-billing" {...props} />
        </div>
      </CardContent>
    </Card>
  );
}

/** How a closed period is invoiced. `poRequiredLocked`: the order is on a PO,
 *  so PO Required cannot be cleared here. */
export function ConfigureInvoicingCard({
  poRequiredLocked,
  ...props
}: CardProps & { poRequiredLocked?: boolean }) {
  return (
    <Card>
      <SectionHeader icon={Receipt} title={C.invoicingTitle} subtitle={C.invoicingSubtitle} />
      <CardContent>
        <div className={GRID}>
          <CadenceInvoicingFields
            scope="order"
            idPrefix="so-billing"
            poRequiredLocked={poRequiredLocked}
            {...props}
          />
        </div>
      </CardContent>
    </Card>
  );
}
