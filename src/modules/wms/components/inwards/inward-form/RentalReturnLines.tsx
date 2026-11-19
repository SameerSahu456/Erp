import { Typography } from "@/components/ui/typography";

import type { InwardForm } from "./useInwardForm";
import { LegacyReturnUnits } from "../LegacyReturnUnits";
import { RENTAL_SCAN_STRINGS } from "../rental-scan/rental-scan.strings";

/** Rental return, step 2. Migrated units owed back are ticked here, as on a
 *  replacement return: they have no dispatch record, so a scan could only
 *  match their serial. Units that went out on a dispatch are scanned on the
 *  next screen, once the batch exists. */
export function RentalReturnLines({ f }: { f: InwardForm }) {
  const { returnLines, legacyUnits, returnState, setReturnState } = f;
  return (
    <div className="space-y-4">
      {legacyUnits.length > 0 && (
        <LegacyReturnUnits units={legacyUnits} value={returnState} onChange={setReturnState} />
      )}
      {returnLines.length > 0 && (
        <Typography variant="body" tone="muted">
          {RENTAL_SCAN_STRINGS.wizardNote}
        </Typography>
      )}
    </div>
  );
}
