// Canonical "Sr No" column styling for IMS raw tables. Designed to be
// used INSIDE a `.cpt-tbl` parent — the same table skin CRM's
// `CrmDataTable` uses (see modules/crm/components/CrmDataTable.tsx).
// `.cpt-tbl` provides everything visual: the gradient header bg, the
// uppercase `text-muted-foreground` header color, body cell padding,
// `color: var(--foreground)` for body cells, hover tint, borders.
//
// The constants below only add what CRM adds inline on top of cpt-tbl:
//
//   Header → `text-center` + 64px width (matches CRM's
//            `style={{ width: 64 }}` exactly via `w-16` = 4rem = 64px).
//   Cell   → `text-center tabular-nums` — NO color override.
//
// Why no `text-muted-foreground` on the cell: a Tailwind utility
// outranks `.cpt-tbl tbody td { color: var(--foreground) }` in v4's
// layer order, which would force the Sr No to render in pale muted
// gray — looking "disabled" on plain white rows. Leaving the color off
// lets cpt-tbl's foreground rule apply, so the numeral renders at the
// same readable weight as the rest of the row data (matches CRM).

// `text-foreground` on the header overrides cpt-tbl's default
// `color: var(--muted-foreground)` so the "SR NO" caption reads at
// the same darkness as the body cell numerals (Tailwind v4 utilities
// outrank plain class selectors via layer order — same mechanic as
// the cell fix). Only the Sr No header is darkened; the rest of the
// column captions stay muted, which is the standard treatment.
export const SR_NO_TH_CLASS = "w-16 text-center text-foreground";

export const SR_NO_TD_CLASS = "text-center tabular-nums";
