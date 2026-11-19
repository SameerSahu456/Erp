import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Typography } from '@/components/ui/typography'
import { LoadErrorState } from '@/shared/components/feedback/LoadErrorState'
import { UI } from '@/shared/constants'
import { useAccess } from '@shared/rbac'
import { formatINRShort } from '@/lib/currency'

import type {
  SalesTeamRevenueParams,
  SalesTeamRevenueRow,
  SalesTeamRoleFacet,
} from '../../../api/dashboard'
import type { FacetValue } from '../../../data/insights/records'
import { useInsightView } from '../../../hooks/dashboard/useInsightView'
import { useSalesTeamRevenue } from '../../../hooks/dashboard/useSalesTeamRevenue'
import { useSalesTeamSearch } from '../../../hooks/dashboard/useSalesTeamSearch'
import { idOf } from './insights.routes'
import { INSIGHTS_STRINGS } from './insights.strings'
import { InsightEmptyState } from './InsightEmptyState'
import { InsightWidget, type Span } from './InsightWidget'
import { Ratio } from './Ratio'
import { SALES_TEAM_UNASSIGNED_ACCESS } from './sales-team-access'
import { SalesTeamActions } from './SalesTeamActions'
import { SalesTeamTable } from './SalesTeamTable'
import { InsightShimmer } from './InsightShimmer'
import { saveBlob } from '@/shared/lib/saveBlob'

// Sales Team — live on `GET /crm/dashboard/hierarchy_wise_report`.
//
// The widget shows the TOP 10 of the caller's scope; the inner view pages
// through the rest. Search and role are its own controls (the reference put them
// in the card, not the page toolbar), so they stay local state and ride the
// query key — every change refetches server-side rather than filtering a cached
// page (§16.7).

const S = INSIGHTS_STRINGS.salesTeam
const R = INSIGHTS_STRINGS.ratio
const WIDGET_ROWS = 10
// Stable identity for the pre-response / error case. `data?.roles ?? []` inline
// would mint a fresh array every render, rebuilding the role facet (and its
// options memo) on each one.
const NO_ROLES: SalesTeamRoleFacet[] = []

interface SalesTeamWidgetProps {
  /** Page-level slice — period, range and the toolbar facets. */
  params: SalesTeamRevenueParams
  span?: Span
  /** Base drill-through URL; a row click appends `?owner=<id>|<name>`. */
  detailHref: string
}

export function SalesTeamWidget({ params, span = 2, detailHref }: SalesTeamWidgetProps) {
  const navigate = useNavigate()
  // The backend already gates `unassigned_lead_count` to the same audience
  // (0 for everyone else), so this is a presentation gate, not a security
  // one — it stops a scoped rep rendering a permanent "Unassigned 0" tile.
  // The audience lives in one rule (`SALES_TEAM_UNASSIGNED_ACCESS`) so opening
  // the tiles to another role is a one-line edit there, not here.
  const { hasAccess } = useAccess()
  const canSeeUnassigned = hasAccess(SALES_TEAM_UNASSIGNED_ACCESS)
  // The role filter lives in the URL (`?role=`), not in local state: that is what
  // lets "Show all" open the inner leaderboard on the SAME role (DF-12).
  const { role, setRole } = useInsightView()
  const roles: FacetValue[] = role ? [{ id: role, label: role }] : []
  // Search text: local while typing, URL-backed once it settles (`?team_search=`),
  // so "Show all" opens the leaderboard on the same search (DF-12 follow-up).
  const { raw: rawQuery, setRaw: setRawQuery, applied: search } = useSalesTeamSearch()

  const { data, isLoading, isError, error } = useSalesTeamRevenue({
    ...params,
    search: search || undefined,
    roles: role ? [role] : undefined,
    page: 1,
    page_size: WIDGET_ROWS,
  })

  const totals = data?.team_totals
  const total = data?.pagination.total ?? 0
  const rows = data?.rows ?? []
  // Zero is not worth a tile: an empty "Unassigned Leads 0" reads as a broken
  // widget, and it steals a third of the row from the two ratios that always
  // have something to say. Absent (`undefined`) collapses to 0 the same way,
  // which is what a backend older than the field returns — so the tile simply
  // stays hidden there instead of reporting a confident, wrong 0.
  const unassignedLeads = data?.unassigned_lead_count ?? 0
  const unassignedDeals = data?.unassigned_deal_count ?? 0
  const showUnassigned = canSeeUnassigned && unassignedLeads > 0
  const showUnassignedDeals = canSeeUnassigned && unassignedDeals > 0
  // The role dropdown's options, straight off this same response — no second
  // request. The server computes them BEFORE applying `roles`, so the list
  // stays complete while a role is selected and a second can still be added.
  const roleOptions = data?.roles ?? NO_ROLES
  // The "All" figure for the role dropdown. NOT `pagination.total`: that counts
  // the rows AFTER the role filter, so picking "mis" made the All option read
  // "All (8)" — the size of the thing you'd be leaving, not the thing you'd get
  // back. `total_users` rides on the same pre-`roles` basis as each bucket's
  // `user_count`, so the whole dropdown is in one unit and stays put while a
  // role is selected.
  const totalUsers = data?.total_users ?? 0

  // Client-side CSV of the rows currently loaded in the widget. The full
  // server-generated export isn't built yet; this gives the header's download
  // button something real to do — "export what you see" — rather than shipping
  // a dead control. Escapes any comma/quote/newline per RFC 4180.
  const exportCsv = () => {
    if (rows.length === 0) return
    const header = [S.columnName, S.columnLead, S.columnDeal, S.columnSo, S.columnRevenue]
    const esc = (v: string | number) => {
      const str = String(v)
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
    }
    const csv = [
      header,
      // Lead, Deal and SO export as the `21/34` pair the table shows, not the bare
      // numerator — a spreadsheet of counts with no denominators would not
      // reconcile against the card it came from. `esc` quotes them if needed.
      ...rows.map((r) => [
        r.name,
        R.ratio(r.lead_count, r.lead_total),
        R.ratio(r.deal_count, r.deal_total),
        R.ratio(r.so_count, r.so_total),
        r.achieved,
      ]),
    ]
      .map((line) => line.map(esc).join(','))
      .join('\n')
    saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'sales-team.csv')
  }

  // A row drills into the full detail page pre-scoped to THAT rep.
  //
  // stopPropagation is load-bearing: a <tr> is not in the card's ignore-list, so
  // without it the click also bubbles to the card's own detailHref handler and
  // navigates a second time — to the same page WITHOUT the owner filter, which
  // lands last and wins. The rep filter would silently disappear.
  const openRep = (e: React.MouseEvent, row: SalesTeamRevenueRow) => {
    e.stopPropagation()
    // `detailHref` already carries the board's active filters, so a bare append
    // would emit `?owner=X&owner=X` when this rep is ALREADY the selected user
    // — two identical chips, a "2" badge, and the id sent twice to the API.
    // Parse and check first rather than concatenating blind.
    const [path, search = ''] = detailHref.split('?')
    const p = new URLSearchParams(search)
    // `id|label`: the query filters on `user_ids`, the chip reads the name.
    if (!p.getAll('owner').some((v) => idOf(v) === row.user_id)) {
      p.append('owner', `${row.user_id}|${row.name}`)
    }
    const qs = p.toString()
    navigate(qs ? `${path}?${qs}` : path)
  }

  // Empty replaces the table only after the request settles — never during a
  // load/error cycle, which would make the widget jump between states.
  const isEmpty = !isLoading && !isError && rows.length === 0

  return (
    <InsightWidget
      title={S.title}
      why={S.why}
      span={span}
      detailHref={detailHref}
      // This card's body OPENS with the search input, not with content. The
      // header hairline plus the body's 14px top padding put a band of empty
      // card between the title row and the box, and the rule read as a second
      // divider stacked on the input's own border.
      flushTop
      actions={
        <SalesTeamActions
          roles={roles}
          roleOptions={roleOptions}
          totalUsers={totalUsers}
          onRolesChange={(next) => setRole(next[0]?.id ?? null)}
          onExport={exportCsv}
          exportDisabled={rows.length === 0}
        />
      }
    >
      <Input
        value={rawQuery}
        onChange={(e) => setRawQuery(e.target.value)}
        placeholder={S.searchPlaceholder}
        maxLength={UI.FILTER_SEARCH_MAX_LENGTH}
        aria-label={S.searchPlaceholder}
        className="mb-2 h-8"
      />

      {/* One 8px rhythm for the whole header block — search, Team Revenue,
          the tile grid and the table below are all `mb-2`, the same as the
          tiles' own `gap-2`. It was 8 / 4 / 8 / 4, which read as uneven. */}
      <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1.5">
        {/* Label reads at the card-title size (13px), matching the widget
            titles. A span so it doesn't add a heading to the outline. */}
        <Typography variant="card-title" tone="label" className="font-medium" asChild>
          <span>{S.teamRevenue}</span>
        </Typography>
        <Typography variant="kpi-value-xs" asChild>
          <span>{formatINRShort(totals?.revenue ?? 0)}</span>
        </Typography>
      </div>

      {/* The roll-ups, in the same box chrome as Team Revenue above.
          `team_totals` spans the WHOLE filtered team — not the ten rows on
          screen — so these stay put as you page through the inner view.
          SO closes the row as `approved / submitted` (`so_count / so_total`),
          the same `Ratio` shape as Leads and Deals.

          UNASSIGNED sits SECOND, between Leads and Deals, because it is the
          missing part of the Leads ratio immediately to its left — every
          unassigned lead is one `lead_total` cannot see (that query walks
          users and hangs leads off `assigned_to`, so an unowned lead lands
          in no row). Putting it after Deals would break that adjacency. It
          renders as a bare count, not a `Ratio`: there is no closed/total
          pair for work nobody owns. */}
      <div
        className={`mb-2 grid gap-2 ${
          showUnassigned && showUnassignedDeals
            ? 'grid-cols-5'
            : showUnassigned || showUnassignedDeals
              ? 'grid-cols-4'
              : 'grid-cols-3'
        }`}
      >
        {[
          // No `shrink-0` on any of these: it guarded the old side-by-side row,
          // where the value had to refuse to give width to the label. Stacked,
          // the two no longer compete for the same axis.
          //
          // `block truncate` on every value is the overflow guard (§8.7). The
          // grid tracks are `minmax(0, 1fr)`, so an over-long value can never
          // widen the CARD — but without `overflow:hidden` it would paint
          // outside the tile's own rounded border and across its neighbour.
          // `Ratio` already sets `whitespace-nowrap`; a bare count is a single
          // unbreakable token, so neither would wrap on its own.
          //
          // These are team-wide counts, so truncation is a safety net rather
          // than a path anyone should hit: a five-digit `99999/999999` is the
          // realistic ceiling and still fits. If an ellipsis ever DOES show
          // here, the figure got implausible — treat it as a data bug, not a
          // width bug.
          {
            label: S.teamLeads,
            node: (
              <Ratio
                count={totals?.lead_count ?? 0}
                total={totals?.lead_total ?? 0}
                unit={R.unitLeads}
                size="kpi-dense"
                className="block truncate"
              />
            ),
          },
          ...(showUnassigned
            ? [
                {
                  label: S.teamUnassigned,
                  node: (
                    <Typography variant="kpi-value-xs" className="block truncate" asChild>
                      <span>{unassignedLeads}</span>
                    </Typography>
                  ),
                },
              ]
            : []),
          {
            label: S.teamDeals,
            node: (
              <Ratio
                count={totals?.deal_count ?? 0}
                total={totals?.deal_total ?? 0}
                unit={R.unitDeals}
                size="kpi-dense"
                className="block truncate"
              />
            ),
          },
          ...(showUnassignedDeals
            ? [
                {
                  label: S.teamUnassignedDeals,
                  node: (
                    <Typography variant="kpi-value-xs" className="block truncate" asChild>
                      <span>{unassignedDeals}</span>
                    </Typography>
                  ),
                },
              ]
            : []),
          {
            label: S.teamSos,
            node: (
              <Ratio
                count={totals?.so_count ?? 0}
                total={totals?.so_total ?? 0}
                unit={R.unitSos}
                size="kpi-dense"
                className="block truncate"
              />
            ),
          },
        ].map((tile) => (
          <div
            key={tile.label}
            // STACKED, not label-beside-value: at four across in a span=2 card
            // each tile is ~90px, and a row layout gave "Unassigned Leads" and
            // its count barely any width apiece — the label ellipsed to
            // "Unassign…" on the two tiles whose label is the longest. Stacking
            // hands the full tile width to each line in turn.
            //
            // No `items-center`: the default `stretch` is what makes the label's
            // `truncate` bite (a centered child is sized to its CONTENT and
            // overflows instead of ellipsing, §8.7). `text-center` does the
            // centering the cross-axis no longer does.
            className="flex flex-col gap-0.5 rounded-md border border-border/50 bg-muted/30 px-2 py-1.5 text-center"
            title={
              tile.label === S.teamUnassigned
                ? S.teamUnassignedHint
                : tile.label === S.teamUnassignedDeals
                  ? S.teamUnassignedDealsHint
                  : undefined
            }
          >
            {/* The DENSE tile pair — `kpi-label-sm` (10px) over `kpi-value-xs`
                (15px). Up to four tiles share half a card here (~113px of text
                each): the standard 11px label truncated "UNASSIGNED LE…" and
                an 18px figure outweighed the table beneath. Size lives in the
                variant, never an inline class (§8.4). */}
            {/* Five tiles across leaves "Unassigned Leads" ~25px short of one
                line, so the label WRAPS (balanced) instead of ellipsing to
                "UNASSIGNED …". The figure sits at the tile's foot (`mt-auto`)
                so all five numbers stay on one baseline however many lines
                each label takes; the grid keeps the tiles equal height. */}
            <Typography variant="kpi-label-sm" className="block text-balance">
              {tile.label}
            </Typography>
            <div className="mt-auto">{tile.node}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <InsightShimmer />
      ) : isError ? (
        // A 403 must read as "you don't have permission", not "failed to load".
        <LoadErrorState error={error} fallback={S.loadError} compact />
      ) : isEmpty ? (
        // Replaces the table entirely rather than rendering a header over one
        // empty row: a lone `<td>` cannot fill the card the way the shared
        // empty state does, and a header above nothing is chrome with no data
        // under it.
        <InsightEmptyState label={S.empty} />
      ) : (
        <SalesTeamTable rows={rows} onRowClick={openRep} />
      )}

      {/* `mt-auto` keeps this as the closing row whenever the card has extra
          space, while `pt-1.5` sets the normal gap under the table. */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
        {total > WIDGET_ROWS ? (
          // Not a client-side expand: the rest of the team lives behind the
          // inner view's server pagination.
          <Button
            variant="link"
            size="xs"
            className="h-auto p-0"
            onClick={() => navigate(detailHref)}
          >
            {S.showAll(total)}
          </Button>
        ) : (
          <span />
        )}
        <Button variant="outline" size="xs" onClick={() => navigate(detailHref)}>
          {S.fullDetail}
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </InsightWidget>
  )
}
