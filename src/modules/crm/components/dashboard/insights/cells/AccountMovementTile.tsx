import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { Typography } from "@/components/ui/typography"
import { formatINRShort } from "@/lib/currency"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import type {
  AccountMovementParams,
  AccountMovementRow,
} from "../../../../api/dashboard"
import { useAccountMovement } from "../../../../hooks/dashboard/useAccountMovement"
import { INSIGHTS_STRINGS } from "../insights.strings"
import type { Span } from "../InsightWidget"
import { InsightWidget } from "../InsightWidget"
import { InsightShimmer } from "../InsightShimmer"

const S = INSIGHTS_STRINGS.accountMovement

export type MovementBucket = "growing" | "declining"

// Account Movement tile — `GET /crm/dashboard/account-movement`.
//
// One ranked list — top growing OR top declining — picked by `bucket`. The
// dashboard mounts TWO of these side by side, one per direction, so each
// card reads as its own widget rather than a two-column split that forces
// the two directions into one visual unit. Both tiles share one network
// request: identical `params` + identical query key ⇒ TanStack Query serves
// the second tile from cache the moment the first one lands.
//
// Reads the WIDGET-MODE response (`movement` unset in params). The hook
// returns top-N for both buckets plus a `summary` object; this component
// only renders the bucket its caller asked for and ignores the rest.
//
// Row semantics mirror the backend's `_split_and_sort`:
//   * growing bucket = pure GROWING + NEW (first-time buyers are growth stories)
//   * declining bucket = pure DECLINING + LAPSED
//   * NEW rows render as `+100%` (no previous-window revenue)
//   * LAPSED rows render as `-100%` (no current-window revenue)
//
// Scope is server-resolved. Out-of-scope `user_ids` → 403, routed through
// `LoadErrorState` so it reads as "no access" rather than "failed to load".
//
// The whole card drills into `/crm/insights/account-movement` — once Phase 2
// lands. Until then `detailHref` may still be passed and the link navigates
// to a 404 route; the tile itself stays functional either way.

/** Tone per bucket — the card knows its direction, so every row inside it
 *  takes the same colour (green for growing, red for declining). Individual
 *  row status (new / lapsed) is signalled with a chip, not a tone shift.
 *  §8.5 — all colours come from semantic tokens. */
const BUCKET_TEXT_CLASS: Record<MovementBucket, string> = {
  growing: "text-emerald-600 dark:text-emerald-400",
  declining: "text-rose-600 dark:text-rose-400",
}

export function AccountMovementTile({
  params,
  bucket,
  span = 3,
  title,
  why,
  detailHref,
}: {
  params: AccountMovementParams
  bucket: MovementBucket
  span?: Span
  title?: string
  why?: string
  detailHref?: string
}) {
  const { data, isLoading, isError, error } = useAccountMovement(params)

  const resolvedTitle = title ?? (bucket === "growing" ? S.growingTitle : S.decliningTitle)
  const resolvedWhy = why ?? (bucket === "growing" ? S.whyGrowing : S.whyDeclining)

  return (
    <InsightWidget span={span} title={resolvedTitle} why={resolvedWhy} detailHref={detailHref}>
      {isError ? (
        <LoadErrorState error={error} fallback={S.loadError} compact />
      ) : isLoading || !data ? (
        <InsightShimmer />
      ) : (
        <AccountMovementContent data={data} bucket={bucket} />
      )}
    </InsightWidget>
  )
}

function AccountMovementContent({
  data,
  bucket,
}: {
  data: NonNullable<ReturnType<typeof useAccountMovement>["data"]>
  bucket: MovementBucket
}) {
  const rows = (bucket === "growing" ? data.growing : data.declining) ?? []
  const emptyLabel = bucket === "growing" ? S.emptyGrowing : S.emptyDeclining

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* Window line — shown on both cards so the pair reads as a comparison
          over the same window pair at a glance. */}
      <Typography variant="helper" tone="muted" className="min-w-0">
        {S.window(data.previous_window.label, data.current_window.label)}
      </Typography>

      {rows.length === 0 ? (
        <Typography variant="helper" tone="muted" asChild>
          <p className="py-3">{emptyLabel}</p>
        </Typography>
      ) : (
        <ol className="flex min-w-0 flex-col gap-1.5">
          {rows.map((row) => (
            <MovementRow key={row.account_id} row={row} bucket={bucket} />
          ))}
        </ol>
      )}
    </div>
  )
}

function MovementRow({ row, bucket }: { row: AccountMovementRow; bucket: MovementBucket }) {
  // Colour comes from the CARD's bucket, not per-row status, so every row
  // in the growing card reads green and every row in the declining card
  // reads red.
  const toneClass = BUCKET_TEXT_CLASS[bucket]
  const ArrowIcon = bucket === "growing" ? ArrowUpRight : ArrowDownRight

  const absAmount = formatINRShort(Math.abs(row.delta))
  // Uniform `+100%` / `-100%` for new / lapsed rows — same formatter as
  // every other row, no chip. The sign is explicit so a `+100%` next to a
  // ₹0-prev row still reads as a positive-direction edge case rather than
  // a flat "100%". Backend `delta_pct` is already signed.
  const pct = `${row.delta_pct >= 0 ? "+" : ""}${row.delta_pct.toFixed(1)}%`

  return (
    <li className="flex min-w-0 items-center gap-2">
      <Typography variant="table-cell" className="min-w-0 flex-1 truncate">
        {row.account_name}
      </Typography>
      <Typography
        variant="helper"
        tone="inherit"
        className={`flex shrink-0 items-center gap-1 tabular-nums ${toneClass}`}
      >
        <ArrowIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        <span>{absAmount}</span>
        <span aria-hidden="true" className="opacity-60">
          ·
        </span>
        <span>{pct}</span>
      </Typography>
    </li>
  )
}
