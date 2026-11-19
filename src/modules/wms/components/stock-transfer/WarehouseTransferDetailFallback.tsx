import { DetailPageShell } from "@/components/page-shells";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { FormCardSkeleton } from "@/components/common/feedback/FormCardSkeleton";
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState";
import { NoAccess } from "@/shared/components/feedback/NoAccess";
import { isForbidden } from "@shared/api/envelope";
import { recordNotFoundTitle } from "@shared/routing/record-label";
import { WMS_ACCESS_STRINGS } from "../access/access.strings";
import { TRANSFERS_PAGE_STRINGS as S } from "./stock-transfer.strings";
import { TRANSFERS_BACK_HREF } from "./transfer-detail-helpers";

/** The transfer detail before a record can render: loading, 403, load
 *  failure, or not-found — always inside the page chrome. */
export function WarehouseTransferDetailFallback({
  query,
  recordLabel,
}: {
  query: { isLoading: boolean; isError: boolean; error: unknown };
  recordLabel: string | undefined;
}) {
  let content = (
    <EmptyState
      title={recordNotFoundTitle(recordLabel, S.notFound)}
      description={S.notFoundHelper}
    />
  );
  if (query.isLoading) {
    content = <FormCardSkeleton />;
  } else if (isForbidden(query.error)) {
    // 403 = not on this warehouse's team: show no-access, not a load error (§2).
    content = (
      <NoAccess
        title={WMS_ACCESS_STRINGS.transferForbiddenTitle}
        description={WMS_ACCESS_STRINGS.transferForbidden}
      />
    );
  } else if (query.isError) {
    content = <LoadErrorState error={query.error} fallback={S.error} />;
  }
  return (
    <DetailPageShell title={S.title} backHref={TRANSFERS_BACK_HREF}>
      {content}
    </DetailPageShell>
  );
}
