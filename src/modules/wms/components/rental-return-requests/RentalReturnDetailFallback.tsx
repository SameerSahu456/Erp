import { EmptyState } from "@/components/common/feedback/EmptyState"
import { FormCardSkeleton } from "@/components/common/feedback/FormCardSkeleton"
import { DetailPageShell } from "@/components/page-shells"
import { NoAccess } from "@shared/components/feedback/NoAccess"
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState"
import { isForbidden, isNotFound } from "@shared/api/envelope"

import { LIST_ROUTE } from "./rental-return-request-detail-helpers"
import { RENTAL_RETURN_REQUESTS_STRINGS as S } from "./rental-return-requests.strings"

/** Loading / 403 / load-error / not-found states inside the page chrome (§2 / §12). */
export function RentalReturnDetailFallback({
  query,
}: {
  query: { isLoading: boolean; isError: boolean; error: unknown }
}) {
  let title: string = S.detail.backToList
  let content = <FormCardSkeleton />
  if (!query.isLoading && isForbidden(query.error)) {
    content = <NoAccess description={query.error.message} />
  } else if (!query.isLoading && query.isError && !isNotFound(query.error)) {
    content = <LoadErrorState error={query.error} fallback={S.detail.loadError} />
  } else if (!query.isLoading) {
    title = S.detail.notFound.title
    content = <EmptyState title={S.detail.notFound.title} description={S.detail.notFound.description} />
  }
  return (
    <DetailPageShell title={title} backHref={LIST_ROUTE}>
      {content}
    </DetailPageShell>
  )
}
