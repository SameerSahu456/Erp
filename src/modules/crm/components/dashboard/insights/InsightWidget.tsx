import { useNavigate } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
// Info (ⓘ) "why" tooltip commented out everywhere — restore these imports with
// the header block below.
// import { Info } from 'lucide-react'
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Only used by the commented-out "why" tooltip below — restore with it.
// import { INSIGHTS_STRINGS } from './insights.strings'

// Shared shell for every insight widget: title, an optional "why" tooltip, an
// actions slot, a grid span, and click-anywhere-to-drill-through.
//
// Built on the `Card` primitive rather than a hand-rolled <section> so the
// border/radius/elevation come from the design system. The reference version
// hardcoded its own shadow (`rgb(16 24 40/0.08)`) and a bare
// `<h3 className="text-[13px]">`, both of which §8.5/§8.4 forbid — `Card`
// already uses `rgb(var(--shadow-rgb)/…)` and `Typography variant="card-title"`
// resolves to the same 13px semibold.

// 6-column grid at lg+. Spans are literal classes so Tailwind emits them —
// a template string (`lg:col-span-${n}`) would be invisible to the scanner and
// silently produce no CSS.
// Spans are expressed "out of 6" but RENDERED on a 12-column grid (every span
// maps to 2× columns). The doubled resolution exists for `1.5` — a quarter
// row, which a 6-col grid cannot express (used by monthly-revenue's
// hero + funnel line: four equal tiles, 4 × 1.5 = 6).
export type Span = 1 | 1.5 | 2 | 3 | 4 | 6;

const SPAN_CLASS: Record<Span, string> = {
  1: "lg:col-span-2",
  1.5: "lg:col-span-3",
  2: "lg:col-span-4",
  3: "lg:col-span-6",
  4: "lg:col-span-8",
  6: "lg:col-span-12",
};

// NO shared height floor, and this is the third attempt at that decision — read
// this before adding one back.
//
// A fixed `min-h` on the card looks like it equalises a row, and it does, but a
// floor can only ever be calibrated to ONE card type. The insight cards differ
// enormously in natural height at the same row count, because their row pitches
// and chrome differ:
//
//   Sales Team    ~496px  (24px rows, but +140px of search / strip / KPI tiles)
//   ranking table ~482px  (34px rows + thead + pager)
//   trend list    ~330px  (19px rows)
//   donut list    ~200px  (capped at 3-4 slices by its own domain)
//
// Calibrate the floor to the tallest (496px) and every trend cell gains ~170px
// of dead space; the four trend cells on the monthly-revenue page each opened a
// hole that size. Calibrate it lower and the tall cards blow past it and the
// row is ragged again — the floor buys nothing.
//
// Cards therefore size to their OWN content, always. Rows come out level by
// PAIRING like with like in `CRM_DASHBOARD_LAYOUT` (two ranking tables, two
// donuts, two trends), which costs no dead space because the two cards genuinely
// hold the same thing. That is a layout question, not a CSS one.

/** The grid class for a span — for non-widget grid children (e.g. the
 *  registry's `spacer` cell) that must size like a widget without being one. */
export const spanClass = (span: Span): string => SPAN_CLASS[span];

export function DashboardGrid({ children }: { children: React.ReactNode }) {
  // `items-start` is load-bearing, not cosmetic. A grid's default is
  // `align-items: stretch`, which forces every card in a row to the height of
  // the tallest one — so a 10-row OEM list silently drags the Category card
  // beside it taller, leaving it padded with dead space. Aligning to the start
  // lets each card size to its OWN content, independent of its neighbours.
  // The trade-off is a ragged bottom edge per row, which is the correct
  // behaviour when the cards genuinely hold different amounts of data.
  return (
    // 12 tracks, but spans still SPEAK in sixths — see SPAN_CLASS above.
    <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
      {children}
    </div>
  );
}

// Clicks landing on these already have their own behaviour (links, buttons,
// inputs) and must NOT also trigger the card navigation.
const CARD_NAV_IGNORE =
  'a,button,input,select,textarea,[role="button"],[role="option"],[role="combobox"],[data-no-card-nav]';

interface InsightWidgetProps {
  title: string;
  /** Short explanation surfaced via the header's info tooltip. */
  why?: string;
  span?: Span;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  /** When set, clicking the card (outside its own interactive bits) drills in. */
  detailHref?: string;
  /**
   * Let the body's first child sit directly under the header: drops the
   * header's bottom hairline AND the body's top padding.
   *
   * For a card whose body OPENS with a control rather than content — the Sales
   * Team widget's search box. There the hairline plus 14px of body padding put
   * a band of empty card between the title row and the input, and the rule
   * read as a second divider stacked above the input's own top border.
   *
   * Opt-in: every other insight card starts with content, where the hairline
   * is what separates the title row from it.
   */
  flushTop?: boolean;
}

export function InsightWidget({
  title,
  span = 3,
  actions,
  className,
  children,
  detailHref,
  flushTop = false,
}: InsightWidgetProps) {
  const navigate = useNavigate();

  const openDetail = (e: React.MouseEvent) => {
    if (!detailHref) return;
    const target = e.target as HTMLElement;

    // Ignore anything rendered through a PORTAL — dropdown popups, tooltips,
    // dialogs. Base UI portals them to document.body, but React still bubbles
    // their events up the REACT tree to this card, so picking an option in the
    // header's Select would silently navigate away. A `closest()` ignore-list
    // cannot catch these: inside the portal there is no matching ancestor to
    // find. The DOM containment check is the reliable test — if the click did
    // not physically happen inside this card, it is not a card click.
    if (!e.currentTarget.contains(target)) return;

    // Ignore interactive DESCENDANTS that own their own behaviour. `closest()`
    // also matches the element itself, so a hit equal to the card would
    // swallow every click.
    const hit = target.closest(CARD_NAV_IGNORE);
    if (hit && hit !== e.currentTarget) return;

    navigate(detailHref);
  };

  return (
    // No `size="sm"`: its `data-[size=sm]:py-3` / `:gap-3` are a DIFFERENT
    // tailwind-merge group than plain `py-0` / `gap-0`, so they survive the
    // override and add 12px above the header and below the body — the dead band
    // over the search box. This widget owns its own header/body padding, so the
    // size variant has nothing left to contribute.
    <Card
      onClick={detailHref ? openDetail : undefined}
      className={cn(
        "gap-0 py-0 transition-colors",
        detailHref && "cursor-pointer hover:border-primary/40",
        SPAN_CLASS[span],
        className,
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-2 px-3.5 py-2",
          !flushTop && "border-b border-border/40",
        )}
      >
        {/* min-w-0 is what lets the title actually truncate — a flex child
            defaults to min-width:auto and would push the row wide (§8.7). */}
        <div className="flex min-w-0 items-center gap-1.5">
          <Typography variant="card-title" className="truncate">
            {title}
          </Typography>
          {/* Info (ⓘ) "why" detail tooltip — COMMENTED OUT everywhere per
              request. Restore this block (and its imports at the top) to bring
              the header detail icon back.

          {why && (
            <TooltipProvider delay={150}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className="shrink-0 cursor-help text-muted-foreground/60 transition-colors hover:text-muted-foreground"
                      aria-label={INSIGHTS_STRINGS.widget.whyLabel}
                    />
                  }
                >
                  <Info className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{why}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          */}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      {/* flex-col so a child can use `mt-auto` without needing absolute
          positioning or hardcoded card heights. */}
      <div className={cn("flex min-w-0 flex-1 flex-col p-3.5", flushTop && "pt-0")}>
        {children}
      </div>
    </Card>
  );
}

/** Class every insight cell passes to its `<TablePagination>` footer.
 *
 *  `TablePagination` is built as a FULL-BLEED table footer: it draws its own
 *  `border-t` hairline plus a `px-5 py-3` inset, on the assumption it sits
 *  flush against a card edge. Inside this widget it does not — the body above
 *  is already `p-3.5`, so both insets apply and the pager ends up 20px further
 *  in than the table content it belongs to, with 26px of dead space beneath it.
 *
 *  `px-0` re-aligns the pager with the rows above; `pb-0` drops the doubled
 *  bottom inset and lets the body's own 14px close the card. `pt-3` survives,
 *  so the hairline keeps its breathing room. `cn()` is tailwind-merge, so these
 *  genuinely override the component's defaults rather than fighting them.
 *
 *  Deliberately applied HERE, per call site — NOT by editing `TablePagination`,
 *  which 20+ other tables (leads, deals, …) share and which is correctly
 *  full-bleed in those layouts. */
export const INSIGHT_PAGER_CLASS = "mt-3 px-0 pb-0";
