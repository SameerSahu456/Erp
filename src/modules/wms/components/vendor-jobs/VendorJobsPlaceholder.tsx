import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { LoadErrorState } from '@shared/components/feedback/LoadErrorState'

import { VENDOR_SERVICE_CARD_STRINGS as S } from './vendor-service-card.strings'

/** The card body's non-data states: loading, the load error, or genuinely
 *  no requests yet. */
export function VendorJobsPlaceholder({
  query,
}: {
  query: { isLoading: boolean; isError: boolean; error: unknown }
}) {
  if (query.isLoading) return <Skeleton className="h-12 w-full" />
  if (query.isError) return <LoadErrorState error={query.error} fallback={S.loadFailed} compact />
  return (
    <Typography variant="helper" tone="muted">
      {S.emptyAll}
    </Typography>
  )
}
