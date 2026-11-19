import type { ReactNode } from "react";

import { EmptyState } from "@/components/common/feedback/EmptyState";
import { FormCardSkeleton } from "@/components/common/feedback/FormCardSkeleton";
import { FormPageShell } from "@/components/page-shells";
import { Button } from "@/components/ui/button";
import { isForbidden, isNotFound } from "@shared/api/envelope";
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState";
import { NoAccess } from "@shared/components/feedback/NoAccess";

import type { RentalSalesOrderBillingDetail } from "../../api/sales-orders";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { RENTALS_COMMON_STRINGS as RC } from "../shared/common.strings";

const C = S.configure;

interface GateQuery {
  data: RentalSalesOrderBillingDetail | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
}

const notFound = <EmptyState title={RC.notFoundTitle} description={RC.notFoundBody} />;

function gateContent(query: GateQuery | null): ReactNode {
  if (!query) return notFound;
  if (query.isLoading) return <FormCardSkeleton rows={4} sections={2} />;
  if (isForbidden(query.error)) return <NoAccess description={query.error.message} />;
  if (isNotFound(query.error)) return notFound;
  if (query.isError || !query.data) {
    return (
      <div className="space-y-3">
        <LoadErrorState error={query.error} fallback={C.loadError} />
        <Button variant="outline" onClick={() => void query.refetch()}>
          {RC.retry}
        </Button>
      </div>
    );
  }
  // The API refuses for the same reason, in its own words — so no form is
  // offered for a save that would be rejected.
  return <EmptyState title={C.blockedTitle} description={query.data.configure_blocked_reason ?? S.so.needsApproval} />;
}

/** Everything the Configure page shows instead of the form: a bad id (null
 *  query, no fetch), loading, 403, 404, a load error, or a blocked order. */
export function ConfigureGate({
  query,
  orderNumber,
  backHref,
}: {
  query: GateQuery | null;
  orderNumber: string | null;
  backHref: string;
}) {
  return (
    <FormPageShell title={C.configureTitle} subtitle={orderNumber ?? undefined} backHref={backHref} hideFooter>
      {gateContent(query)}
    </FormPageShell>
  );
}
