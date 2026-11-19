import { Link } from "react-router-dom"
import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import { StatusBadge } from "@/components/common/display/StatusBadge"
import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RichTextView } from "@/components/ui/rich-text-editor"
import { Typography } from "@/components/ui/typography"
import { formatINR } from "@/lib/currency"
import { cn, stripHtml } from "@/lib/utils"
import { formatIST_date } from "@shared/lib/date"
import { useUser } from "@modules/users"
import { usePermission } from "@shared/rbac"

// GET /users/{id} needs this; most CRM and rentals viewers do not hold it,
// so a lookup is skipped (not refused) for them.
const USERS_READ = "auth:users:read"

import { groupSoItemsToTree } from "../../../lib/bomTree"
import type { SalesOrderItemTreeNode } from "../../../lib/bomTree"
import { groupSoItemsByRate } from "../../../lib/soItemGroups"
import type { SoItemGroup, SoRateGroup } from "../../../lib/soItemGroups"
import { useRentalLineUnitStatuses, type RentalLineUnitStatus } from "@modules/rentals"
import type { LineFulfillmentWire, SalesOrderItemWire, SOLineStatus } from "../../../api"
import { SO_LINE_CONDITION_LABELS } from "../../../constants/so-status"
import { SALES_ORDERS_STRINGS as S } from "../sales-orders.strings"
import { issuedUmbrella } from "./soFulfillment"
import { DecidedApprover } from "./DecidedApprover"
import { isDecidedLine } from "./decidedLine"

// BOM child action-tag tones (design-token className strings, not copy).
const BOM_REMOVE_TONE = "border-destructive/40 bg-destructive/10 text-destructive"
const BOM_ADD_TONE = "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"

/** Table-wide display config, read by every row component.
 *
 *  A context rather than a prop threaded through seven components: the Rate
 *  column's absence has to be honoured by the header, the line row, its BOM
 *  children, the merged row, the rate banner, the breakdown dialog AND every
 *  `colSpan` in the table. Passing a boolean and a column count down that
 *  chain puts the same two props on every signature and gives six more places
 *  for the two to fall out of step. */
const TableConfig = createContext<{ showRate: boolean; columns: number }>({
  showRate: true,
  columns: 11,
})

function useTableConfig() {
  return useContext(TableConfig)
}

const LINE_STATUS_VARIANT: Record<SOLineStatus, StatusBadgeVariant> = {
  Pending: "warning",
  Approved: "success",
  Rejected: "error",
}

// SO line descriptions are rich text that can run for paragraphs, and they
// routinely carry a pasted spec TABLE. The cell shows a PLAIN-TEXT preview
// hard-capped at this many characters; the full value — tables, lists and all —
// opens in a hover card (see `DescriptionCell`).
//
// A hard character cap — rather than a CSS line-clamp — is used deliberately:
// line-clamp collapses to one char per line when the column gets narrow,
// blowing up the row height. Plain text with a fixed cap can never do that.
const DESC_PREVIEW_CHARS = 60

// Hard cap on how much table width the description may claim. Applied to the
// cell's CONTENT, not the <td>: `max-width` on a table cell is only a hint in
// an auto-layout table and browsers routinely ignore it — which is why an
// 18rem cap still let this column grow past 27rem and squeeze the money
// columns into breaking mid-number. A max-width on the inner block is honoured.
const DESC_MAX_W = "max-w-[11rem]"

// ── Description popup: the knobs worth tuning ───────────────────────────────
// Read straight by `DescriptionCell` below — change the number here and you are
// done; there is no second copy anywhere in this file.

/** How long the pointer must rest on a description before the popup opens (ms).
 *  Set to 0 to make it click-only. */
const DESC_HOVER_OPEN_MS = 1000

/** Plain-text flattening of a rich-text value — the whole of it. */
function descText(html: string): string {
  // `stripHtml` flattens via `textContent`, which butts adjacent blocks
  // straight together — a pasted spec table reads as "PartQtyRate". Pad every
  // block/cell boundary first so it comes out as separate words. This copy is
  // only ever shown as text; the hover card renders the original HTML.
  return stripHtml(
    html.replace(/<\/(?:td|th|tr|p|div|li|h[1-6]|table)>/gi, " $& "),
  ).trim()
}

/**
 * Description cell. TWO ways to see more, because they answer two different
 * questions:
 *
 * The cell shows a capped plain-text preview. EVERY way of asking for more —
 * resting the pointer on the text, clicking the text, or clicking "Show more" —
 * lands in the SAME centred modal with the full rich text: headings, lists, and
 * pasted spec tables rendered as real tables.
 *
 * One destination, deliberately. The stored value is HTML, so expanding inline
 * could only ever show it flattened to plain text — the same content, minus the
 * formatting, in a column 11rem wide. Sending both affordances to the modal
 * means "Show more" always shows more, rather than sometimes showing a worse
 * copy of it.
 *
 * A modal rather than an anchored hover card: a spec table needs the width of
 * the screen, and a popup tethered to a narrow column either overflowed the
 * viewport or had to shrink until columns were cut off. Centred, it gets the
 * whole screen and is always in the same place.
 *
 * Because it IS a modal, hover only OPENS it — it does not close on pointer
 * leave. The pointer has to cross the backdrop to reach it, so auto-closing
 * would make it impossible to actually use. Dismiss with Esc, the × or a click
 * outside, exactly like every other dialog in the app.
 *
 * "Show more" is a sibling of the trigger, not a child: a button inside a
 * button is invalid HTML.
 */
function DescriptionCell({ html }: { html: string | null }) {
  const [open, setOpen] = useState(false)
  // Hover intent: the pointer must REST on the cell, so merely crossing the
  // column on the way somewhere else never throws a modal up.
  const hoverTimer = useRef<number | undefined>(undefined)
  const cancelHover = () => {
    window.clearTimeout(hoverTimer.current)
    hoverTimer.current = undefined
  }
  // A row can unmount mid-countdown (page change, refetch) — never fire into a
  // component that is gone.
  useEffect(() => cancelHover, [])

  const text = html ? descText(html) : ""
  if (!text) return <span className="text-muted-foreground/60">—</span>

  const isLong = text.length > DESC_PREVIEW_CHARS
  const shown = isLong
    ? `${text.slice(0, DESC_PREVIEW_CHARS).trimEnd()}…`
    : text

  return (
    <>
      {/* The cap lives here, on the content, so the column can't bully the
          money columns into wrapping mid-number. */}
      <div className={cn("min-w-0", DESC_MAX_W)}>
        <button
          type="button"
          onPointerEnter={(e) => {
            // Touch fires pointerenter on tap and would double up with the
            // click handler; let the click own it there.
            if (e.pointerType !== "mouse" || !DESC_HOVER_OPEN_MS) return
            cancelHover()
            hoverTimer.current = window.setTimeout(
              () => setOpen(true),
              DESC_HOVER_OPEN_MS,
            )
          }}
          onPointerLeave={cancelHover}
          // Click opens it at once — no reason to make someone who has already
          // decided sit through the hover delay. This is also what makes the
          // cell work by keyboard (Enter/Space) and on touch.
          onClick={() => {
            cancelHover()
            setOpen(true)
          }}
          className="block w-full min-w-0 cursor-pointer break-words text-left underline decoration-dotted decoration-from-font underline-offset-4 outline-none decoration-muted-foreground/40 hover:decoration-foreground/70 focus-visible:decoration-foreground/70"
        >
          {shown}
        </button>
        {isLong && (
          // Same markup the shared `ExpandableText` toggle uses, deliberately:
          // this column had that exact control before and it should not look
          // different here. `Typography variant="caption"` is what keeps it
          // smaller than the row text (§8.4 — never an inline text-size class);
          // without it the toggle inherits the cell size and reads as body copy
          // rather than as an action.
          //
          // No "Show less" counterpart: nothing expands in the row any more, so
          // there is no collapsed state to return to — the modal's own × is the
          // way back.
          <button
            type="button"
            onClick={() => {
              cancelHover()
              setOpen(true)
            }}
            className="mt-1 inline-flex text-primary transition-colors hover:underline focus-visible:underline focus-visible:outline-none"
          >
            <Typography variant="caption" tone="inherit">
              {S.detail.items.showMore}
            </Typography>
          </button>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* The FRAME does not scroll — the body inside it does.

            Scrolling the frame itself put the close button (absolutely
            positioned at its top-right) at the right edge of the SCROLL
            content, not of the visible box. Base UI focuses that button on
            open, so the browser scrolled across to reveal it and the modal
            appeared already panned to the right, title clipped. Pinning the
            frame keeps × and title in place whatever the content width. */}
        <DialogContent className="flex max-h-[85vh] flex-col overflow-x-hidden overflow-y-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{S.detail.items.colDescription}</DialogTitle>
          </DialogHeader>
          {/* Two scrollers, one axis each. NEITHER shows a bar: no scrollbar
              gutter is allowed to eat into the popup on either edge.

              VERTICAL (here). Still scrolls on wheel/trackpad/keys — only the
              bar itself is suppressed. */}
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
            {/* HORIZONTAL: same deal. `no-scrollbar` is the existing utility for
                exactly this (src/styles/index.css) — `scrollbar-width: none`
                plus the `-webkit-scrollbar` opt-out. Same pairing
                `CrmTableGrid` uses.

                The grey strip across the bottom of the popup was the complaint,
                NOT the panning: a pasted spec table is genuinely wider than the
                dialog, and the alternative — forcing cells to wrap so it fits —
                squeezes a table nested in another table's cell into an
                unreadable column. So the content keeps its real width and still
                pans (trackpad swipe, shift+wheel, drag-select); only the bar is
                gone. */}
            <div className="no-scrollbar overflow-x-auto">
              <RichTextView
                html={html}
                // No scrollbar PER TABLE either — one horizontal scroller for
                // the whole popup, which is the box above.
                //
                // `RichTextView` normally makes each table its own scroll box
                // (`display:block` + `overflow-x:auto`, capped at `max-w-full`)
                // so a table can't blow out a narrow column on a detail page. In
                // a full-width modal that just buries a scrollbar inside the
                // content — a table panning within a panel within a page.
                //
                // Here each table is a real `display:table` at its natural
                // width. `!` is Tailwind v4's suffix important modifier, needed
                // because these override utilities the component sets on the
                // very same elements at equal specificity.
                className="[&_table]:table! [&_table]:max-w-none! [&_table]:overflow-visible!"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function SoItemsTable({
  items,
  categoryNameById,
  oemNameById,
  fulfillmentByLineId,
  trackedLineHref,
  returnLineHref,
  groupByRate = false,
  showRate = true,
}: {
  items: SalesOrderItemWire[]
  categoryNameById: Map<string, string>
  /** OEM id → name, resolved by `useSalesOrderDetail`. A miss renders an em
   *  dash — same treatment as an unresolved category. */
  oemNameById: Map<string, string>
  fulfillmentByLineId?: Map<string, LineFulfillmentWire>
  /** RENTALS ONLY. Given line ids, where their tracked units live — the
   *  rentals device tracking page, scoped to those lines. One id for a
   *  plain row; every id behind a merged row, so its name opens the units
   *  of ALL the lines it stands for.
   *
   *  Omitted on every other order type, and that is the whole gate: a
   *  plain sale has no `rental_devices` rows, so a link would lead to an
   *  empty page. The caller decides by `sellable_type`; this table just
   *  renders a link when it is handed one. */
  trackedLineHref?: (lineIds: string[]) => string
  /** RENTALS ONLY. Given a line id, where to raise a return for JUST that
   *  line's units — the WMS Rental Return Request form, pre-scoped.
   *
   *  Same gate as `trackedLineHref`: omitted on every other order type,
   *  because only a rental order has units that come back by contract. */
  returnLineHref?: (lineId: string) => string | undefined
  /** RENTALS ONLY. Group the rows by rate, then by variant, merging lines
   *  that agree on both.
   *
   *  Off everywhere else, and that is the whole gate. A rental order
   *  imported from the old sheets carries one line PER PHYSICAL MACHINE,
   *  enumerated in the name ("1) HPE DL380", "2) HPE DL380", …), which is
   *  what makes grouping read better than the raw lines. An ordinary sale
   *  has no such duplication: its lines are its lines, in the order they
   *  were quoted, and re-sorting them by rate would only make the order
   *  harder to reconcile against the customer's copy. */
  groupByRate?: boolean
  /** Show the per-line Rate column. On everywhere except RENTALS.
   *
   *  A rental line's rate is not the rate anything is charged at. The rate
   *  lives on the UNIT — a line's units can each sit at a different figure
   *  after a per-unit extend, and the line's own number re-bases to whichever
   *  was repriced last. Printing it beside the line reads as "this is what
   *  this line charges", which is exactly what it is not. The order's real
   *  monthly figure is on the Billings card, and the per-unit rates are on
   *  the units themselves. */
  showRate?: boolean
}) {
  if (items.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-sm text-muted-foreground">
        {S.detail.items.empty}
      </div>
    )
  }
  // SO-BOM (2026-05-29): group the flat items into parent → children so the
  // BOM tree renders nested. Children sit under their headline with a small
  // Add/Remove tag; they do not carry their own approver column (the
  // headline owns the approval decision and the backend cascade carries it
  // to children — see SalesOrderApprovalDetailPanel notes).
  const tree = groupSoItemsToTree(items)
  // Rate first, then variant (2026-09-08). An imported rental order carries
  // one line per machine — "1) HPE DL380", "2) HPE DL380", … — so the table
  // groups by rate and merges same-variant lines into one summary row.
  const rates = groupByRate ? groupSoItemsByRate(tree) : []
  // A rate heading only earns its row when there is more than one rate to
  // separate. On a single-rate order (the overwhelming majority — most orders
  // here have exactly one line) the Rate column already says it, and a banner
  // above one row is noise.
  const showRateHeaders = rates.length > 1
  // Row numbers run across the whole table rather than restarting per rate, so
  // "#3" still means the third row someone is looking at.
  const indexByKey = new Map<string, number>()
  for (const rateGroup of rates) {
    for (const group of rateGroup.groups) {
      indexByKey.set(group.key, indexByKey.size + 1)
    }
  }
  return (
    // Auto table layout, always fits the card, never scrolls sideways.
    //
    // DO NOT reintroduce `table-fixed` + a percentage <colgroup>. It has to be
    // re-tuned by hand every time a column is added or removed, and a
    // percentage can't know a cell holds "₹2,38,61,96,00,00,00,000.00" — the
    // number was wider than its fixed box and OVERFLOWED into the neighbouring
    // column. That spill is what looked like overlapping amounts, and it is
    // why the bug returned every time the column set changed.
    //
    // How this stays fixed on its own:
    //   • auto layout → a cell's content can never overflow its column; the
    //     column sizes itself to what it holds, whatever the column count.
    //   • `whitespace-nowrap` on the money/qty cells → a figure is never broken
    //     across lines. These cells previously carried
    //     `[overflow-wrap:anywhere]`, which let the table shrink them to ONE
    //     CHARACTER — so "₹1,000.90" rendered as "₹1,0 / 00.9 / 0" and "(18%)"
    //     as "(18 / %)". An amount split mid-number is unreadable, and worse,
    //     misreadable. Numbers are short and bounded; prose is not.
    //   • the slack comes out of DESCRIPTION instead, whose content is capped
    //     by `DESC_MAX_W` and wraps on word boundaries. That is the one column
    //     that can give width up without becoming unreadable.
    //   • no `min-w` and no `overflow-x-auto` → nothing to pan; it fits.
    // Adding or removing a column needs no width bookkeeping at all.
    <TableConfig.Provider value={{ showRate, columns: showRate ? 11 : 10 }}>
      <div className="w-full">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3">{S.detail.items.colNumber}</th>
              <th className="px-3 py-3">{S.detail.items.colPart}</th>
              <th className="px-3 py-3">{S.detail.items.colCategory}</th>
              <th className="px-3 py-3">{S.detail.items.colOem}</th>
              <th className="px-3 py-3">{S.detail.items.colCondition}</th>
              <th className="px-3 py-3">{S.detail.items.colDescription}</th>
              <th className="px-2 py-3 text-right">{S.detail.items.colQty}</th>
              {showRate && (
                <th className="px-2 py-3 text-right">{S.detail.items.colRate}</th>
              )}
              <th className="px-3 py-3">{S.detail.items.colApprover}</th>
              <th className="px-3 py-3">{S.detail.items.colStatus}</th>
              <th className="px-3 py-3 text-right">{S.detail.items.colAmount}</th>
            </tr>
          </thead>
          <tbody>
            {/* Ungrouped is the ORIGINAL rendering, line by line in the
                server's order — every non-rental order still gets exactly the
                table it had. */}
            {!groupByRate &&
              tree.map((node, idx) => (
                <LineRow
                  key={node.id}
                  node={node}
                  index={idx + 1}
                  categoryNameById={categoryNameById}
                  oemNameById={oemNameById}
                  fulfillmentByLineId={fulfillmentByLineId}
                  trackedLineHref={trackedLineHref}
                  returnLineHref={returnLineHref}
                />
              ))}
            {rates.map((rateGroup) => (
              <Fragment key={rateGroup.key}>
                {showRateHeaders ? <RateHeaderRow group={rateGroup} /> : null}
                {rateGroup.groups.map((group) =>
                  group.nodes.length === 1 ? (
                    <LineRow
                      key={group.key}
                      node={group.nodes[0]}
                      index={indexByKey.get(group.key) ?? 0}
                      categoryNameById={categoryNameById}
                      oemNameById={oemNameById}
                      fulfillmentByLineId={fulfillmentByLineId}
                      trackedLineHref={trackedLineHref}
                      returnLineHref={returnLineHref}
                    />
                  ) : (
                    <MergedRow
                      key={group.key}
                      group={group}
                      index={indexByKey.get(group.key) ?? 0}
                      categoryNameById={categoryNameById}
                      oemNameById={oemNameById}
                      fulfillmentByLineId={fulfillmentByLineId}
                      trackedLineHref={trackedLineHref}
                      returnLineHref={returnLineHref}
                    />
                  ),
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </TableConfig.Provider>
  )
}

/** One order line, exactly as this table has always drawn it — the headline
 *  row plus its fulfillment, decision, notes and BOM child sub-rows.
 *
 *  Extracted verbatim when rate/variant grouping arrived: a group of one line
 *  (the overwhelming majority) still renders through here, so nothing about a
 *  normal order's table changed. `index` replaced the map's position because
 *  row numbers now run across rate groups. */
function LineRow({
  node,
  index,
  categoryNameById,
  oemNameById,
  fulfillmentByLineId,
  trackedLineHref,
  returnLineHref,
}: {
  node: SalesOrderItemTreeNode
  index: number
  categoryNameById: Map<string, string>
  oemNameById: Map<string, string>
  fulfillmentByLineId?: Map<string, LineFulfillmentWire>
  trackedLineHref?: (lineIds: string[]) => string
  returnLineHref?: (lineId: string) => string | undefined
}) {
  const { showRate, columns } = useTableConfig()
  return (
    <Fragment key={node.id}>
      <tr className="border-b border-border last:border-b-0 [&>td]:align-top">
        <td className="px-5 py-3 text-muted-foreground">{index}</td>
        <td className="px-3 py-3 font-medium text-foreground break-words max-w-[14rem]">
          {trackedLineHref ? (
            <Link
              to={trackedLineHref([node.id])}
              className="text-primary underline-offset-2 hover:underline"
            >
              {node.item_name}
            </Link>
          ) : (
            node.item_name
          )}
          {returnLineHref?.(node.id) ? (
            <Link
              to={returnLineHref(node.id) as string}
              className="mt-0.5 block font-normal text-primary underline-offset-2 hover:underline"
            >
              <Typography variant="helper" tone="primary">
                {S.detail.items.raiseReturn}
              </Typography>
            </Link>
          ) : null}
          {node.source_dispatch_request_item_id ? (
            <span className="mt-0.5 block text-[11px] font-normal text-info">
              {S.detail.items.soldViaDemo}
            </span>
          ) : null}
          {node.source_serial_number ? (
            <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground tabular-nums">
              {S.detail.items.serialPrefix} {node.source_serial_number}
            </span>
          ) : null}
          {/* Rendered as a sub-line rather than two new columns: this
              table's column count is hand-maintained in `TableConfig` and
              every colSpan downstream is arithmetic off it, so a column
              cannot be added without touching the header, the BOM row and
              three totals rows at once.

              `rental_period` is deliberately NOT shown — it is always
              "month" and not an operator choice (see
              components/line-items/rental-period.ts). The DATES are the
              per-line fact worth seeing. */}
          {/* Rendered for EVERY rental line, not only a dated one. A line
              with no dates of its own is still billed — the rentals engine
              falls its window back to the agreement's — so vanishing here
              reads as "this line has no rental period", which was exactly
              the complaint about the first line of an order. */}
          {node.is_rental ? (
            // §8.4: `caption` IS `text-[11px] leading-tight` and `numeric`
            // IS `tabular-nums`, so this is the same pixels through the
            // primitive. The rest of this table still carries its inline
            // classes — migrated fix-as-you-go, not swept.
            <Typography
              variant="caption"
              tone="muted"
              numeric
              className="mt-0.5 block font-normal"
            >
              {node.rental_start_date || node.rental_end_date ? (
                <>
                  {S.detail.items.rentalWindow}{" "}
                  {node.rental_start_date
                    ? formatIST_date(node.rental_start_date)
                    : "—"}
                  {" – "}
                  {node.rental_end_date ? formatIST_date(node.rental_end_date) : "—"}
                </>
              ) : (
                S.detail.items.rentalWindowFollowsOrder
              )}
            </Typography>
          ) : null}
        </td>
        <td className="px-3 py-3 text-muted-foreground break-words">
          {categoryNameById.get(node.category_id) ?? (
            <span className="text-muted-foreground/60">—</span>
          )}
        </td>
        <td className="px-3 py-3 text-muted-foreground break-words">
          {node.oem_id && oemNameById.get(node.oem_id) ? (
            oemNameById.get(node.oem_id)
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )}
        </td>
        <td className="px-3 py-3 text-muted-foreground break-words">
          {/* Label map — the stored value is lowercase (`new_pull`). */}
          {node.condition ? (
            SO_LINE_CONDITION_LABELS[node.condition]
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )}
        </td>
        {/* No `max-w` on the <td> — an auto-layout table treats it as a
            hint and ignores it. `DescriptionCell` caps its own content
            instead, which the browser does honour. */}
        <td className="px-3 py-3 text-muted-foreground">
          <DescriptionCell html={node.description} />
        </td>
        <td className="px-2 py-3 text-right tabular-nums whitespace-nowrap">
          {node.qty}
        </td>
        {/* No `whitespace-nowrap` on the money cells — `Money` supplies
            the only legal break points, at the digit-group commas. */}
        {showRate && (
          <td className="px-2 py-3 text-right tabular-nums">
            <Money value={node.rate} />
          </td>
        )}
        <td className="px-3 py-3">
          {isDecidedLine(node) ? (
            <DecidedApprover line={node} />
          ) : (
            <>
              <Typography variant="caption" tone="muted" className="block">
                {S.detail.approver.assigned}
              </Typography>
              <ApproverCell approverId={node.approver_id} approverName={node.approver_name} />
            </>
          )}
        </td>
        <td className="px-3 py-3">
          <LineStatusBadge status={node.line_status} />
        </td>
        <td className="px-3 py-3 text-right font-semibold tabular-nums">
          <AmountCell grossAmount={node.gross_amount} amount={node.amount} />
        </td>
      </tr>
      <FulfillmentRow fulfillment={fulfillmentByLineId?.get(node.id)} />
      <DecisionDetailRow node={node} />
      {node.configuration_notes ? (
        <tr className="border-b border-border bg-muted/10">
          <td className="px-5 py-2" />
          <td
            colSpan={columns - 1}
            className="px-3 py-2 text-xs italic text-muted-foreground"
          >
            <span className="not-italic font-semibold text-foreground/70">
              {S.detail.items.notesPrefix}
            </span>
            {node.configuration_notes}
          </td>
        </tr>
      ) : null}
      {node.children.map((child) => {
        const isRemove = child.config_action === "Remove"
        const actionTone = isRemove ? BOM_REMOVE_TONE : BOM_ADD_TONE
        return (
          <tr
            key={child.id}
            className="border-b border-border bg-muted/10 last:border-b-0 [&>td]:align-top"
          >
            <td className="px-5 py-2 text-muted-foreground" />
            <td className="px-3 py-2 pl-9">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex h-4 items-center rounded border px-1.5 text-[10px] uppercase tracking-wider ${actionTone}`}
                >
                  {child.config_action}
                </span>
                <span
                  className={
                    "min-w-0 break-words text-xs " +
                    (isRemove
                      ? "text-muted-foreground line-through"
                      : "text-foreground/85")
                  }
                >
                  {child.item_name}
                </span>
              </div>
            </td>
            <td className="px-3 py-2 text-xs text-muted-foreground break-words">
              {categoryNameById.get(child.category_id) ?? "—"}
            </td>
            <td className="px-3 py-2 text-xs text-muted-foreground break-words">
              {(child.oem_id ? oemNameById.get(child.oem_id) : null) || "—"}
            </td>
            <td className="px-3 py-2 text-xs text-muted-foreground break-words">
              {child.condition
                ? SO_LINE_CONDITION_LABELS[child.condition]
                : "—"}
            </td>
            <td className="px-3 py-2 text-xs text-muted-foreground">
              <DescriptionCell html={child.description} />
            </td>
            <td className="px-2 py-2 text-right text-xs tabular-nums whitespace-nowrap">
              {child.qty}
            </td>
            {showRate && (
              <td className="px-2 py-2 text-right text-xs tabular-nums text-muted-foreground">
                <Money value={child.rate} />
              </td>
            )}
            <td className="px-3 py-2 text-xs italic text-muted-foreground">
              {S.detail.items.inheritsParent}
            </td>
            <td className="px-3 py-2 text-xs italic text-muted-foreground">
              {S.detail.items.inheritsParent}
            </td>
            <td className="px-3 py-2 text-right text-xs tabular-nums text-muted-foreground">
              {/* A `remove` child credits nothing, so it has no amount
                  of its own — and it carries no discount either, hence
                  no struck-through original on the ones that do. */}
              {isRemove ? (
                "—"
              ) : (
                <AmountCell
                  grossAmount={child.gross_amount}
                  amount={child.amount}
                  compact
                />
              )}
            </td>
          </tr>
        )
      })}
    </Fragment>
  )
}

/** The rate banner above its variant rows. Rendered only when the order
 *  actually holds more than one rate — see `showRateHeaders`. */
function RateHeaderRow({ group }: { group: SoRateGroup }) {
  const { showRate, columns } = useTableConfig()
  return (
    <tr className="border-b border-border bg-muted/30">
      <td colSpan={columns} className="px-5 py-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {/* With the Rate column hidden this banner may not lead with the
              rate either — it is the same per-line figure, and one left
              standing here would read as an oversight. The line count leads
              instead: the banner still separates the groups and still totals
              each one, which is all it is doing on a rental order. */}
          {showRate ? (
            <Typography variant="body-strong" className="tabular-nums">
              <Money value={group.rate} />
            </Typography>
          ) : null}
          <Typography
            variant={showRate ? "caption" : "body-strong"}
            tone={showRate ? "muted" : undefined}
          >
            {S.detail.items.rateGroupLines(group.lineCount)}
          </Typography>
          <Typography variant="caption" tone="muted" className="tabular-nums">
            <Money value={group.amount} />
          </Typography>
        </div>
      </td>
    </tr>
  )
}

/** Several order lines of the same variant at the same rate, as one row.
 *
 *  Everything that is genuinely per-line — the description carrying that
 *  unit's serial, its approval, its tracked units, its return form — is NOT
 *  dropped: it moves into the breakdown dialog, which both the name and the
 *  description cell open. What the row itself shows is only what the merged
 *  lines actually agree on, plus the sums.
 *
 *  Fulfillment counts ARE summed into a single sub-row: they are counts of
 *  units against the same variant, so a total is the honest reading. Decision
 *  notes and configuration notes are per-line prose and stay in the dialog. */
function MergedRow({
  group,
  index,
  categoryNameById,
  oemNameById,
  fulfillmentByLineId,
  trackedLineHref,
  returnLineHref,
}: {
  group: SoItemGroup
  index: number
  categoryNameById: Map<string, string>
  oemNameById: Map<string, string>
  fulfillmentByLineId?: Map<string, LineFulfillmentWire>
  trackedLineHref?: (lineIds: string[]) => string
  returnLineHref?: (lineId: string) => string | undefined
}) {
  const { showRate } = useTableConfig()
  const [open, setOpen] = useState(false)
  const first = group.nodes[0]
  const lineCount = group.nodes.length

  // Merged lines can disagree about their approval. Neither column may show
  // one line's answer as if it were the row's — an approver who did not decide
  // two of these lines must not appear to have.
  const approverIds = [...new Set(group.nodes.map((n) => n.approver_id))]
  const statusCounts = new Map<SOLineStatus, number>()
  for (const node of group.nodes) {
    statusCounts.set(
      node.line_status,
      (statusCounts.get(node.line_status) ?? 0) + 1,
    )
  }

  const fulfillment = group.nodes.reduce<LineFulfillmentWire | undefined>(
    (acc, node) => {
      const line = fulfillmentByLineId?.get(node.id)
      if (!line) return acc
      if (!acc) return { ...line }
      return {
        ...acc,
        ordered: acc.ordered + line.ordered,
        issued: acc.issued + line.issued,
        ready: acc.ready + line.ready,
        qc_failed: acc.qc_failed + line.qc_failed,
        dispatched: acc.dispatched + line.dispatched,
        returned: acc.returned + line.returned,
      }
    },
    undefined,
  )

  return (
    <>
      <tr className="border-b border-border last:border-b-0 [&>td]:align-top">
        <td className="px-5 py-3 text-muted-foreground">{index}</td>
        <td className="px-3 py-3 font-medium text-foreground break-words max-w-[14rem]">
          {/* On a rental order the name goes straight to the tracked units
              of EVERY line in the group — the status is what the reader
              came for. The breakdown stays one click away, below. */}
          {trackedLineHref ? (
            <Link
              to={trackedLineHref(group.nodes.map((n) => n.id))}
              className="block break-words text-primary underline-offset-2 hover:underline"
            >
              {group.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="block w-full cursor-pointer break-words text-left outline-none hover:underline focus-visible:underline"
            >
              {group.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-0.5 inline-flex font-normal text-primary underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
          >
            <Typography variant="helper" tone="primary">
              {S.detail.items.mergedLines(lineCount)}
            </Typography>
          </button>
        </td>
        <td className="px-3 py-3 text-muted-foreground break-words">
          {categoryNameById.get(first.category_id) ?? (
            <span className="text-muted-foreground/60">—</span>
          )}
        </td>
        <td className="px-3 py-3 text-muted-foreground break-words">
          {first.oem_id && oemNameById.get(first.oem_id) ? (
            oemNameById.get(first.oem_id)
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )}
        </td>
        <td className="px-3 py-3 text-muted-foreground break-words">
          {first.condition ? (
            SO_LINE_CONDITION_LABELS[first.condition]
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )}
        </td>
        {/* Each merged line has its own description, and on imported rental
            orders that description is where the SERIAL lives. Showing the
            first and hiding the rest would lose the others entirely, so the
            cell counts them and opens the breakdown. */}
        <td className="px-3 py-3 text-muted-foreground">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="cursor-pointer text-left underline decoration-dotted decoration-from-font underline-offset-4 outline-none decoration-muted-foreground/40 hover:decoration-foreground/70 focus-visible:decoration-foreground/70"
          >
            {S.detail.items.mergedDescriptions(lineCount)}
          </button>
        </td>
        <td className="px-2 py-3 text-right tabular-nums whitespace-nowrap">
          {group.qty}
        </td>
        {showRate && (
          <td className="px-2 py-3 text-right tabular-nums">
            <Money value={group.rate} />
          </td>
        )}
        <td className="px-3 py-3">
          {approverIds.length === 1 ? (
            <ApproverCell
              approverId={approverIds[0]}
              approverName={group.nodes[0]?.approver_name}
            />
          ) : (
            <Typography variant="caption" tone="muted">
              {S.detail.items.mergedApprovers(approverIds.length)}
            </Typography>
          )}
        </td>
        <td className="px-3 py-3">
          <div className="flex flex-col items-start gap-1">
            {[...statusCounts].map(([status, count]) =>
              statusCounts.size === 1 ? (
                <LineStatusBadge key={status} status={status} />
              ) : (
                <StatusBadge key={status} variant={LINE_STATUS_VARIANT[status]}>
                  {S.detail.items.mergedStatus(count, status)}
                </StatusBadge>
              ),
            )}
          </div>
        </td>
        <td className="px-3 py-3 text-right font-semibold tabular-nums">
          <AmountCell grossAmount={group.grossAmount} amount={group.amount} />
        </td>
      </tr>
      <FulfillmentRow fulfillment={fulfillment} />
      <BreakdownDialog
        open={open}
        onOpenChange={setOpen}
        group={group}
        trackedLineHref={trackedLineHref}
        returnLineHref={returnLineHref}
      />
    </>
  )
}

/** The lines behind a merged row, each with what the summary could not carry:
 *  its own name as stored, its description, its approval, and — on a rental
 *  order — its own tracked units and return form. */
function BreakdownDialog({
  open,
  onOpenChange,
  group,
  trackedLineHref,
  returnLineHref,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: SoItemGroup
  trackedLineHref?: (lineIds: string[]) => string
  returnLineHref?: (lineId: string) => string | undefined
}) {
  const { showRate } = useTableConfig()
  // Where each line's units stand in rentals. `trackedLineHref` is the
  // rental-order marker here; fetched only while the dialog is open.
  const isRental = Boolean(trackedLineHref)
  const unitStatuses = useRentalLineUnitStatuses(
    group.nodes.map((node) => node.id),
    { enabled: open && isRental },
  )
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{S.detail.items.breakdownTitle}</DialogTitle>
        </DialogHeader>
        <Typography variant="helper" tone="muted">
          {S.detail.items.breakdownDescription}
        </Typography>
        <div className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto">
          {group.nodes.map((node) => (
            <div
              key={node.id}
              className="min-w-0 space-y-1.5 rounded-lg border border-border p-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <Typography
                  variant="body-strong"
                  className="min-w-0 break-words"
                >
                  {node.item_name}
                </Typography>
                <LineStatusBadge status={node.line_status} />
              </div>
              {isRental && unitStatuses.isSuccess ? (
                <LineRentalStatus states={unitStatuses.data.get(node.id)} />
              ) : null}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Typography
                  variant="caption"
                  tone="muted"
                  className="tabular-nums"
                >
                  {`${S.detail.items.colQty} ${node.qty}`}
                </Typography>
                {showRate ? (
                  <Typography
                    variant="caption"
                    tone="muted"
                    className="tabular-nums"
                  >
                    <Money value={node.rate} />
                  </Typography>
                ) : null}
                <Typography
                  variant="caption"
                  className="tabular-nums font-semibold"
                >
                  <Money value={node.amount} />
                </Typography>
              </div>
              {node.description ? (
                <div className="no-scrollbar overflow-x-auto">
                  <RichTextView html={node.description} />
                </div>
              ) : null}
              {trackedLineHref || returnLineHref ? (
                <div className="flex flex-wrap gap-3">
                  {trackedLineHref ? (
                    <Link
                      to={trackedLineHref([node.id])}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      <Typography variant="helper" tone="primary">
                        {S.detail.items.viewUnits}
                      </Typography>
                    </Link>
                  ) : null}
                  {returnLineHref?.(node.id) ? (
                    <Link
                      to={returnLineHref(node.id) as string}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      <Typography variant="helper" tone="primary">
                        {S.detail.items.raiseReturn}
                      </Typography>
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** A rental line's units by state — "Rental status: [On Rent] [2 Returned]".
 *  A line with no units yet says so instead of showing nothing. */
function LineRentalStatus({ states }: { states: RentalLineUnitStatus[] | undefined }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Typography variant="caption" tone="muted">
        {S.detail.items.rentalStatus}
      </Typography>
      {states?.length ? (
        states.map((state) => (
          <StatusBadge key={state.label} variant={state.variant}>
            {state.count > 1 ? `${state.count} ${state.label}` : state.label}
          </StatusBadge>
        ))
      ) : (
        <Typography variant="caption" tone="muted">
          {S.detail.items.rentalStatusNone}
        </Typography>
      )}
    </div>
  )
}

function LineStatusBadge({ status }: { status: SOLineStatus }) {
  return (
    <StatusBadge variant={LINE_STATUS_VARIANT[status]}>{status}</StatusBadge>
  )
}

// Per-line fulfillment breakdown, shown as a compact sub-row under the headline
// only when the line has been issued/dispatched at all (a not-yet-fulfilled
// line stays clean). "Issued" is the custody umbrella (issued+ready+qc_failed).
function FulfillmentRow({
  fulfillment,
}: {
  fulfillment: LineFulfillmentWire | undefined
}) {
  const { columns } = useTableConfig()
  if (!fulfillment) return null
  const F = S.detail.fulfillment
  const umbrella = issuedUmbrella(fulfillment)
  if (
    umbrella === 0 &&
    fulfillment.dispatched === 0 &&
    fulfillment.returned === 0
  )
    return null

  return (
    <tr className="border-b border-border bg-muted/10">
      <td className="px-5 py-1.5" />
      {/* 1 spacer td + this = every column the header rendered. */}
      <td
        colSpan={columns - 1}
        className="px-3 py-1.5 text-xs text-muted-foreground"
      >
        <span className="font-semibold text-foreground/70">{F.issued}</span>{" "}
        {umbrella}
        <span className="mx-1.5 text-muted-foreground/50">·</span>
        <span className="font-semibold text-foreground/70">{F.ready}</span>{" "}
        {fulfillment.ready}
        <span className="mx-1.5 text-muted-foreground/50">·</span>
        <span className="font-semibold text-foreground/70">
          {F.dispatched}
        </span>{" "}
        {fulfillment.dispatched}
        {fulfillment.qc_failed > 0 && (
          <span className="ml-1.5 text-destructive">
            <span className="mx-1.5 text-muted-foreground/50">·</span>
            {F.qcFailed} {fulfillment.qc_failed}
          </span>
        )}
        {fulfillment.returned > 0 && (
          <span className="ml-1.5 text-warning">
            <span className="mx-1.5 text-muted-foreground/50">·</span>
            {F.returned} {fulfillment.returned}
          </span>
        )}
      </td>
    </tr>
  )
}

// A money figure that can wrap — but ONLY between digit groups.
//
// A formatted amount contains no spaces, so a money cell has no legal place to
// break: its min-content width is the entire figure. That is why these cells
// were `whitespace-nowrap` — and why one big number (qty 3,434,342 × a ₹2bn
// rate) pushed the table 124px past its card and clipped the Amount column off
// the right edge.
//
// `<wbr>` inserts an explicit break opportunity after each thousands separator.
// A huge figure now wraps as "₹6,86,93,70," / "93,70,86,340" — between groups,
// never inside one. That distinction is the whole point: a break at a comma
// stays readable, whereas the mid-number breaks we had before
// ("₹1,0 / 00.9 / 0") are unreadable and easy to misread. The cell's
// min-content drops to one group, so the table can always shrink to its card.
function Money({ value }: { value: number }) {
  const groups = formatINR(value).split(",")
  return (
    <>
      {groups.map((group, i) =>
        i === 0 ? (
          group
        ) : (
          <Fragment key={i}>
            ,<wbr />
            {group}
          </Fragment>
        ),
      )}
    </>
  )
}

// Amount cell — the line's money, PRE-TAX.
//
//   • headline figure = `amount`, i.e. what the line actually costs after its
//     discount (`gross_amount - discount_amount`, server-computed).
//   • struck-through sub-line = `gross_amount`, i.e. qty × rate before the
//     discount. Shown ONLY on a discounted line.
//
// Tax is deliberately NOT added in here. It used to render
// `amount + tax_amount` beside a separate Tax column; both are gone, so the
// column is now a clean qty × rate − discount and every figure in the row
// (Rate, Amount) is on the same pre-tax footing. The tax-inclusive total still
// lives in the totals panel below the table, which is the one place it belongs.
//
// The comparison is on the two SERVER-COMPUTED values, never on a locally
// derived one: `gross_amount` and `amount` are equal by construction when there
// is no discount, so the strike can't be triggered by float noise — printing
// the same number twice, once crossed out, would read as a bug.
//
// `compact` is for BOM child rows, whose cell is already `text-xs`; the
// sub-line inherits that size instead of shrinking a second time.
function AmountCell({
  grossAmount,
  amount,
  compact = false,
}: {
  grossAmount: number
  amount: number
  compact?: boolean
}) {
  if (amount === grossAmount) return <Money value={amount} />
  return (
    <>
      <Money value={amount} />
      <span
        className={`block line-through font-normal text-muted-foreground/70 ${compact ? "" : "text-xs"}`}
      >
        <Money value={grossAmount} />
      </span>
    </>
  )
}

// Sub-row shown under a decided line: the rejection reason (rejected) or the
// approve note (approved), plus who decided and when. Renders nothing while a
// line is still Pending. Children inherit the parent's decision, so only
// headline rows carry this row.
function DecisionDetailRow({ node }: { node: SalesOrderItemTreeNode }) {
  const { columns } = useTableConfig()
  const { can } = usePermission()
  // Hook must run every render — empty id short-circuits the fetch in useUser.
  // Usually the decider IS the line's approver, whose name the server sends;
  // otherwise look them up only if the viewer may.
  const decidedByApprover =
    !!node.line_decided_by_id && node.line_decided_by_id === node.approver_id
  // The server now names the decider (`line_decided_by_name`) and flags a
  // system auto-approval; the /users lookup is only a fallback for old rows.
  const needsLookup =
    !node.line_decided_by_name && !node.line_auto_decided && !decidedByApprover
  const userQuery = useUser(
    node.line_decided_by_id && needsLookup && can(USERS_READ)
      ? node.line_decided_by_id
      : "",
  )
  const [expanded, setExpanded] = useState(false)

  const decided =
    node.line_status === "Approved" || node.line_status === "Rejected"
  if (!decided) return null

  const isRejected = node.line_status === "Rejected"
  const label = isRejected ? "Rejection reason" : "Approve note"
  const notes = node.line_decision_notes?.trim()
  // Free-text notes can be a pasted URL / command that balloons the row.
  // Clamp long ones and reveal the rest behind a "Show more" toggle so the
  // note never dominates the table (Coding-guideline §8.7).
  const isLongNote =
    !!notes && (notes.length > 180 || notes.split("\n").length > 3)

  const user = userQuery.data
  const deciderName = node.line_auto_decided
    ? null
    : node.line_decided_by_name
    ? node.line_decided_by_name
    : decidedByApprover && node.approver_name
    ? node.approver_name
    : user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email
    : node.line_decided_by_id
      ? S.detail.approver.unknownUser
      : null

  const tone = isRejected
    ? "border-destructive/30 bg-destructive-soft"
    : "border-emerald-500/30 bg-emerald-500/10"
  const labelTone = isRejected
    ? "text-destructive"
    : "text-emerald-700 dark:text-emerald-400"

  return (
    <tr className={`border-b border-border ${tone}`}>
      <td className="px-5 py-2" />
      <td colSpan={columns - 1} className="px-3 py-2 text-xs">
        <span className={`font-semibold ${labelTone}`}>{label}: </span>
        {notes ? (
          <span
            className={`whitespace-pre-wrap break-words text-foreground/85 ${
              isLongNote && !expanded ? "line-clamp-3" : ""
            }`}
          >
            {notes}
          </span>
        ) : (
          <span className="italic text-muted-foreground">
            {S.detail.items.noteEmpty}
          </span>
        )}
        {isLongNote && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 block font-medium text-primary hover:underline"
          >
            {expanded ? S.detail.items.showLess : S.detail.items.showMore}
          </button>
        )}
        {(deciderName || node.line_decided_at) && (
          <span className="ml-2 text-muted-foreground">
            (
            {isRejected
              ? S.detail.items.decidedRejected
              : node.line_auto_decided
              ? S.detail.items.decidedAuto
              : S.detail.items.decidedApproved}
            {deciderName ? ` by ${deciderName}` : ""}
            {node.line_decided_at
              ? ` · ${formatIST_date(node.line_decided_at)}`
              : ""}
            )
          </span>
        )}
      </td>
    </tr>
  )
}

function ApproverCell({
  approverId,
  approverName,
}: {
  approverId: string | null
  approverName?: string | null
}) {
  const { can } = usePermission()
  // `useUser` is keyed by id so distinct approvers fire one request each
  // (and identical ones share a single cache hit across rows). Only when the
  // server did not already name the approver and the viewer may look it up.
  const userQuery = useUser(
    approverId && !approverName && can(USERS_READ) ? approverId : "",
  )
  if (!approverId) {
    return (
      <span className="text-xs text-destructive">
        {S.detail.approver.missing}
      </span>
    )
  }
  if (approverName) {
    return (
      <Typography variant="caption" className="block min-w-0 truncate">
        {approverName}
      </Typography>
    )
  }
  if (userQuery.isLoading && !userQuery.data) {
    return (
      <span className="text-xs text-muted-foreground">
        {S.detail.approver.loading}
      </span>
    )
  }
  const user = userQuery.data
  if (!user) {
    return (
      <Typography variant="caption" tone="muted">
        {S.detail.approver.unknownUser}
      </Typography>
    )
  }
  const displayName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate text-[12.5px] font-medium text-foreground">
        {displayName || user.email}
      </p>
      <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
    </div>
  )
}
