import { EmptyState } from "@/components/common/feedback/EmptyState";
import { DetailPageShell } from "@/components/page-shells";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbidden, isNotFound } from "@shared/api/envelope";
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState";
import { NoAccess } from "@/shared/components/feedback/NoAccess";

import { DEVICE_STRINGS as S } from "./devices.strings";
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings";

const T = S.detail;

interface DeviceDetailFallbackProps {
  query: { isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown };
}

/** The unit before it can render — loading, 403, failure or not found —
 *  always inside the page chrome so the back arrow is never lost. */
export function DeviceDetailFallback({ query }: DeviceDetailFallbackProps) {
  let content = <EmptyState title={C.notFoundTitle} description={S.deviceDetail.notFound} />;
  if (query.isLoading) {
    content = <Skeleton className="h-96 w-full rounded-xl" />;
  } else if (isForbidden(query.error)) {
    content = <NoAccess title={T.forbiddenTitle} description={T.forbidden} />;
  } else if (query.isError && !isNotFound(query.error)) {
    content = (
      <div className="space-y-3">
        <LoadErrorState error={query.error} fallback={T.loadError} />
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          {C.retry}
        </Button>
      </div>
    );
  }
  return (
    <DetailPageShell title={T.title} backHref="/rentals/tracking">
      {content}
    </DetailPageShell>
  );
}
