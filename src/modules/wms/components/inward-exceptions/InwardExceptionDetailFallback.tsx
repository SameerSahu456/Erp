import { AlertTriangle, Info } from "lucide-react"

import { Typography } from "@/components/ui/typography"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/common/feedback/EmptyState"
import { FormCardSkeleton } from "@/components/common/feedback/FormCardSkeleton"
import { DetailPageShell } from "@/components/page-shells"
import { NoAccess } from "@shared/components/feedback/NoAccess"
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState"
import { isForbidden, isNotFound } from "@shared/api/envelope"

import { INWARD_EXCEPTIONS_LIST_ROUTE } from "./inward-exceptions-helpers"
import { INWARD_EXCEPTIONS_STRINGS as S } from "./inward-exceptions.strings"

/** Loading / 403 / load-error / not-found states inside the page chrome (§2 / §12). */
export function InwardExceptionDetailFallback({
  query,
}: {
  query: { isLoading: boolean; isError: boolean; error: unknown }
}) {
  let content = <EmptyState title={S.detail.notFound} description={S.detail.notFoundDescription} />
  let title: string = S.detail.notFound
  if (query.isLoading) {
    content = <FormCardSkeleton />
    title = S.detail.backToList
  } else if (isForbidden(query.error)) {
    content = <NoAccess description={query.error.message} />
    title = S.detail.backToList
  } else if (query.isError && !isNotFound(query.error)) {
    content = <LoadErrorState error={query.error} fallback={S.detail.loadError} />
    title = S.detail.backToList
  }
  return (
    <DetailPageShell title={title} backHref={INWARD_EXCEPTIONS_LIST_ROUTE}>
      {content}
    </DetailPageShell>
  )
}

const BANNER_TONE = {
  warning: { Icon: AlertTriangle, box: "bg-warning-soft/50", icon: "text-warning" },
  info: { Icon: Info, box: "bg-info-soft/50", icon: "text-info" },
} as const

/** A one-line callout above the facts (overdue / approval needed). */
export function InwardExceptionBanner({ tone, text }: { tone: keyof typeof BANNER_TONE; text: string }) {
  const { Icon, box, icon } = BANNER_TONE[tone]
  return (
    <div className={cn("flex gap-2 rounded-md p-3", box)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", icon)} aria-hidden="true" />
      <Typography variant="body">{text}</Typography>
    </div>
  )
}
