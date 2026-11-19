import { Skeleton } from "@/components/ui/skeleton";
import { DetailPageShell } from "@/components/page-shells";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { NoAccess } from "@/shared/components/feedback/NoAccess";
import { isForbidden, isNotFound } from "@shared/api/envelope";
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState";
import { recordNotFoundTitle } from "@shared/routing/record-label";
import { WMS_ACCESS_STRINGS } from "../access/access.strings";
import { DISPATCH_DETAIL_STRINGS as S } from "./dispatch-detail.strings";

/** The dispatch detail before a record can render: loading, 403, load
 *  failure, or not-found — always inside the page chrome. */
export function DispatchDetailFallback({
  query,
  recordLabel,
}: {
  query: { isLoading: boolean; isError: boolean; error: unknown };
  recordLabel: string | undefined;
}) {
  // Keep the page chrome (title + back-arrow) in every state so a bad id or a
  // load error never strands the user without a way back to the list (§0.6/§2).
  let content = (
    <EmptyState
      title={recordNotFoundTitle(recordLabel, S.notFound)}
      description={S.notFoundDescription}
    />
  );
  if (query.isLoading) {
    content = <Skeleton className="h-96 w-full rounded-xl" />;
  } else if (isForbidden(query.error)) {
    // 403 is a permission boundary, not "not found" (§2).
    content = (
      <NoAccess
        title={WMS_ACCESS_STRINGS.dispatchForbiddenTitle}
        description={WMS_ACCESS_STRINGS.dispatchForbidden}
      />
    );
  } else if (query.isError && !isNotFound(query.error)) {
    // A network / 5xx failure is not a missing record (§12): show the reason
    // instead of the not-found copy.
    content = <LoadErrorState error={query.error} fallback={S.loadError} />;
  }
  return (
    <DetailPageShell title={S.title} backHref="/wms/dispatches">
      {content}
    </DetailPageShell>
  );
}
