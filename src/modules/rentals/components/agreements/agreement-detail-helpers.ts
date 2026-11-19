import type { RentalSalesOrderBillingDetail } from "../../api/sales-orders";
import type { MonthlyRateInputs } from "../../lib/monthlyRate";

export const AGREEMENTS_LIST_HREF = "/rentals/agreements";

/** Live rate, the order's sold-at rate and the unit count — what
 *  `MonthlyRateValue` and its label read. */
export function rateInputsOf(detail: RentalSalesOrderBillingDetail): MonthlyRateInputs {
  return {
    live: detail.config?.monthly_rate,
    expected: detail.expected_monthly_rate,
    deviceCount: detail.device_count,
  };
}
