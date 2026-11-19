import { useEffect, useRef, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RichTextView } from "@/components/ui/rich-text-editor"
import { Typography } from "@/components/ui/typography"
import { cn, stripHtml } from "@/lib/utils"

// Shared by the Sales Order detail items table and the Quote approval panel —
// the two surfaces that show line descriptions in a table cell. Promoted from
// `sales-orders/detail/SoItemsTable.tsx` (one home, one behaviour).

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
const DESC_HOVER_OPEN_MS = 0

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
export interface LineDescriptionCellProps {
  html: string | null
  /** Dialog heading — the caller's "Description" column label. */
  title: string
  /** Label of the sibling "Show more" control shown under long previews. */
  showMoreLabel: string
  /** Width cap on the cell content; the SO table default keeps the money
   *  columns safe in an auto-layout table. Pass `max-w-full` in a fixed table. */
  maxWidthClass?: string
}

export function LineDescriptionCell({
  html,
  title,
  showMoreLabel,
  maxWidthClass = DESC_MAX_W,
}: LineDescriptionCellProps) {
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
      <div className={cn("min-w-0", maxWidthClass)}>
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
              {showMoreLabel}
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
            <DialogTitle>{title}</DialogTitle>
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

