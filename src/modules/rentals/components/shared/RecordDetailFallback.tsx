import { DetailPageShell } from "@/components/page-shells";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbidden, isNotFound } from "@shared/api/envelope";
import { NoAccess } from "@shared/components/feedback/NoAccess";

import { RENTALS_COMMON_STRINGS as C } from "./common.strings";
import { RetryLoadError } from "./RetryLoadError";

export interface RecordDetailQuery {
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
}

/** A rentals detail page before its record renders: loading, 403, a load
 *  failure with Retry, or not-found (also a malformed id, whose query never
 *  ran) — always inside the page chrome so the back arrow stays (§2, §6.9). */
export function RecordDetailFallback({
  query,
  title,
  backHref,
  loadError,
}: {
  query: RecordDetailQuery;
  title: string;
  backHref: string;
  loadError: string;
}) {
  let content = <EmptyState title={C.notFoundTitle} description={C.notFoundBody} />;
  if (query.isLoading) {
    content = <Skeleton className="h-96 w-full rounded-xl" />;
  } else if (isForbidden(query.error)) {
    content = <NoAccess description={query.error.message} />;
  } else if (query.error && !isNotFound(query.error)) {
    content = (
      <RetryLoadError error={query.error} fallback={loadError} onRetry={() => void query.refetch()} />
    );
  }
  return (
    <DetailPageShell title={title} backHref={backHref}>
      {content}
    </DetailPageShell>
  );
}
