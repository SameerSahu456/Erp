import { recordNotFoundTitle, useRecordLabel } from "@shared/routing/record-label";

import { RecordDetailFallback, type RecordDetailQuery } from "../shared/RecordDetailFallback";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

/** Before an adjustment can render: loading, 403, a retryable load failure,
 *  or not-found (404, or a malformed id whose query never runs). */
export function StockAdjustmentDetailFallback({ query }: { query: RecordDetailQuery }) {
  const label = useRecordLabel();
  return (
    <RecordDetailFallback
      query={query}
      title={S.detail.title}
      backHref="/ims/stock-adjustments"
      loadError={S.detail.error}
      notFound={{ title: recordNotFoundTitle(label, S.detail.notFound), description: S.detail.notFoundHelper }}
    />
  );
}
