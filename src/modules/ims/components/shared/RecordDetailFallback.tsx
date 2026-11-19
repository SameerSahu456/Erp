import { DetailPageShell } from "@/components/page-shells";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { FormCardSkeleton } from "@/components/common/feedback/FormCardSkeleton";
import { isForbidden, isNotFound } from "@shared/api/envelope";
import { NoAccess } from "@shared/components/feedback/NoAccess";

import { RetryLoadError } from "./RetryLoadError";
import { IMS_SHARED_STRINGS } from "./shared.strings";

const S = IMS_SHARED_STRINGS.recordFallback;

export interface RecordDetailQuery {
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
}

/** An IMS detail page before its record renders: loading, 403, a load failure
 *  with Retry, or not-found (also a malformed id, whose query never ran) —
 *  always inside the page chrome so the back arrow stays (§2, §12). */
export function RecordDetailFallback({
  query,
  title,
  backHref,
  loadError,
  notFound,
}: {
  query: RecordDetailQuery;
  title: string;
  backHref: string;
  loadError: string;
  notFound?: { title: string; description?: string };
}) {
  let content = (
    <EmptyState
      title={notFound?.title ?? S.notFoundTitle}
      description={notFound?.description ?? S.notFoundBody}
    />
  );
  if (query.isLoading) {
    content = <FormCardSkeleton />;
  } else if (isForbidden(query.error)) {
    content = <NoAccess description={query.error.message} />;
  } else if (query.error && !isNotFound(query.error)) {
    content = (
      <RetryLoadError error={query.error} fallback={loadError} onRetry={() => void query.refetch()} />
    );
  }
  return (
    <DetailPageShell title={title} backHref={backHref} titleCopyable={false}>
      {content}
    </DetailPageShell>
  );
}
