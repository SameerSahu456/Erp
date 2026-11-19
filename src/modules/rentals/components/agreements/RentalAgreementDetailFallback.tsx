import { EmptyState } from "@/components/common/feedback/EmptyState";
import { FormCardSkeleton } from "@/components/common/feedback/FormCardSkeleton";
import { DetailPageShell } from "@/components/page-shells";
import { Button } from "@/components/ui/button";
import { isForbidden, isNotFound } from "@shared/api/envelope";
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState";
import { NoAccess } from "@shared/components/feedback/NoAccess";

import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings";
import { AGREEMENTS_LIST_HREF } from "./agreement-detail-helpers";

const A = S.agreement;

interface FallbackQuery {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
}

/** Loading / 403 / load-error / not-found inside the page chrome. A null
 *  query is a malformed route id: not-found without a fetch. */
export function RentalAgreementDetailFallback({ query }: { query: FallbackQuery | null }) {
  let title: string = A.loading;
  let content = <FormCardSkeleton rows={4} />;
  if (query && !query.isLoading && isForbidden(query.error)) {
    content = <NoAccess description={query.error.message} />;
  } else if (query && !query.isLoading && query.isError && !isNotFound(query.error)) {
    content = (
      <div className="space-y-3">
        <LoadErrorState error={query.error} fallback={C.loadError} />
        <Button variant="outline" onClick={() => void query.refetch()}>
          {C.retry}
        </Button>
      </div>
    );
  } else if (!query || !query.isLoading) {
    title = A.notFound;
    content = <EmptyState title={A.notFound} description={A.notFoundHint} />;
  }
  return (
    <DetailPageShell title={title} backHref={AGREEMENTS_LIST_HREF}>
      {content}
    </DetailPageShell>
  );
}
