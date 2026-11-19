import { useParams } from "react-router-dom";

import { asUuid } from "@shared/lib/validation";

import { RentalAgreementDetailBody } from "../../components/agreements/RentalAgreementDetailBody";

/** `/rentals/agreements/:salesOrderId` — keyed on the SALES ORDER: an amend
 *  supersedes the agreement row while the order id stays put. A malformed id
 *  renders not-found without fetching (§11.1). */
function RentalAgreementDetailPage() {
  const salesOrderId = asUuid(useParams<{ salesOrderId: string }>().salesOrderId);
  return <RentalAgreementDetailBody salesOrderId={salesOrderId} />;
}

export default RentalAgreementDetailPage;
