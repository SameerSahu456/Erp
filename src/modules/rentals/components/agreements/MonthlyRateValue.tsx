import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";

import { shownMonthlyRent, type MonthlyRateInputs } from "../../lib/monthlyRate";

/**
 * The monthly rent, before and after dispatch (QA RM06/RM09).
 *
 * Before dispatch: the sales order's rent. After: the live rate. ONE figure
 * (2026-10-29) — the sales order's "expected" rent is no longer shown beside
 * the live one on detail pages.
 */
export function MonthlyRateValue({
  variant = "body",
  ...inputs
}: MonthlyRateInputs & { variant?: "body" | "body-strong" }) {
  return (
    <Typography variant={variant} numeric>
      {formatINR(shownMonthlyRent(inputs))}
    </Typography>
  );
}
