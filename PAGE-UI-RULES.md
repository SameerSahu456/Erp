# Page UI Rules & Test-Case Checklist

The single source of truth for **how every page must look and behave**. Use it two ways:
1. **Building/changing a page** → follow the rules (§0–§4).
2. **Bug-hunting** → run the page against the **test-case checklists** (§6). If a page
   fails a check, that's a bug to fix.

**Reference implementation:** the **Inward** pages —
`modules/wms/pages/inwards/InwardPage.tsx` (list),
`components/inwards/inward-form/*` (form),
`components/inwards/BatchDevicesBody.tsx` (detail). When unsure, copy Inward.

> Page-level UI/UX only. Engineering rules live in `Coding-guideline.md`; tokens in
> `DESIGN-SYSTEM.md`. This builds on them, never contradicts them.

---

## 0. Global rules — every page, no exceptions

> ### ★ RULE ZERO — reuse before you build (the most important rule for components)
>
> **The FIRST step of any work under this document is to SEARCH the project for a
> component that already does the job — before writing a single line of new UI.**
>
> 1. **Search everywhere:** `components/ui/`, `components/common/`,
>    `components/page-shells/`, and every module's own `components/`. Start from the
>    **most complete, most structured existing implementation** — the reference pages
>    (Inward) and the shared building blocks (`BusinessMetricsTable`, `OperationDialog`,
>    `FormPageShell` / `ListPageShell` / `DetailPageShell`, `AsyncSelect`, `StatusBadge`,
>    `EmptyState`, `LoadErrorState`, `Typography`, `Button`…).
> 2. **Use that exact component here — and use the same one on every other page** that
>    needs it. One job → one component, app-wide. If two pages do the same job with
>    different components, one of them is wrong; converge them on the structured one.
> 3. **Create a new component ONLY when none exists.** When you must, it has to **match
>    the design of the existing components** (semantic tokens §8.5, `<Typography>` §8.4,
>    the shared page-shells, the same spacing/size vocabulary) and live in a **shared
>    folder** so the next page reuses it — never a one-off local copy.
> 4. If an existing shared component is *almost* right, **extend the shared component** so
>    every screen benefits; do not clone or fork it.
>
> Duplicating or nearly-duplicating an existing component — a second dropdown style, a
> hand-rolled card, another empty-state, a bespoke table — is a **bug, not a feature**.
> When more than one existing component could fit, **STOP and ASK** which the project
> prefers; never guess. (Full detail: §0.17 and §7.)

1. **Consistency is law.** Same header, spacing, buttons everywhere. A page that looks
   "a bit different" from its siblings is a bug.
2. **Use the standard page frames** (`ListPageShell` / `DetailPageShell` / `FormPageShell`).
   Never hand-roll page chrome.
   - **Back arrow** (when the header has one) is a compact square button **sized to the
     heading** (it matches the `page-title` line box) and **vertically centred on the
     title line only** — never floated against the whole title **+** subtitle block, so it
     never dips toward the subtitle. This is the `PageHeader` default (`backAlign="title"`)
     on every module **except CRM**, whose header chrome is maintained separately and
     keeps the legacy block-centred arrow.
3. **Breadcrumbs are OFF** on every page.
4. **Design kit only:** colours are semantic tokens (`bg-primary`, `text-success`…),
   text is `<Typography variant… tone…>`. No hex/`rgb()`, no raw `<h1>`, no inline
   `text-*` sizes. *(§8.4/§8.5)*
5. **Words file only:** all user-facing copy lives in a co-located `*.strings.ts`;
   enum/status labels in a `constants/` map. No naked strings in JSX. *(§16.12)*
6. **Three states always:** every data view — **and every in-page section, card, or form
   step that can be empty** — handles **loading** (skeleton), **empty** (the shared
   `EmptyState` = **icon + short title + one helpful line + the primary action if any**),
   and **error** (friendly state). Never a blank white page, raw backend text, or a lone
   muted sentence in a bordered box.
   - **`EmptyState` ≠ `Alert`.** An "empty / nothing here yet" placeholder is **always
     `EmptyState`** (centred icon-in-a-circle + title + line). Reserve **`<Alert>`** for a
     **caution or warning the user must act on** (e.g. "filter to the right GRN before you
     issue"). A "no items waiting" message rendered as a bare `<Alert>` — or as a stray
     `<Typography>` line in a box — is a bug: it reads as unfinished and gives the eye
     nothing to land on. Give every empty message an **icon + a short title** (the *what*)
     above its **one-line hint** (the *why / what next*).
7. **Missing value = `—`.** Any null/empty renders as an em-dash, everywhere (lists,
   details, read-only fields). Never blank, `null`, or `undefined`. A real **zero** (`0`,
   `₹0.00`) IS a value — show it, don't dash it.
8. **Unknown status = neutral grey badge.** An unexpected enum value shows a `neutral`
   `StatusBadge`, never a crash or blank.
9. **Permission / status gating = HIDE.** Anything the user's role or the record's status
   doesn't allow (buttons, columns, sections, menu items, whole pages) is **hidden**, not
   greyed out.
   - **Blocked-but-fixable = DISABLE + a why-tooltip.** An action the user *could* do once
     they fix something (a required field still empty, "decide all units first", an open
     spare request) is shown **disabled with a hover tooltip that names the exact unmet
     condition** — never a bare greyed button the operator has to guess at. The message is
     **situation-specific**: it points at the FIRST thing still blocking the action and
     changes as conditions are met (e.g. "Add at least one photo" → "Select a Pass or Fail
     result"), never a generic "complete the form". Render it through the shared styled
     `Tooltip` with the disabled control wrapped in a `<span>` trigger (a disabled button
     fires no hover events itself), never a native `title=` (§0.14). Reference: the
     Inspection / Repair / QC complete dialogs' Complete button.
10. **No horizontal scroll — one exception.** Content wraps or truncates; `truncate` in a
    flex row always gets `min-w-0`. Cards, rows, forms and panels **never** scroll sideways.
    The **sole** exception is a **data table**: after trimming cells (§9.5 truncate + tooltip),
    a table whose columns still can't fit **may pan sideways inside its own box** as a last
    resort (freeze the first column, §9). A sideways scrollbar anywhere *other* than a
    table's own box is still a bug. *(§8.7)*
11. **Dates in IST** via `formatIST` / `<DateDisplay/>` — readable (`26 Aug 2026`), with
    time when it matters (`26 Aug 2026, 14:30`). Never raw UTC, never `toLocaleString`.
12. **Money = ₹ + Indian grouping + 2 decimals** (`₹1,25,000.00`) via the currency util;
    plain counts (`1,240`); numbers right-aligned in tables. **Negative amounts / credits are
    shown distinctly** (red and/or a clear minus) so a credit isn't mistaken for a charge.
13. **Toasts** (`sonner`): auto-close after a few seconds; **green = success, red =
    error**; one per action (no duplicate spam).
14. **Tooltips are the project's STYLED tooltip — never the native browser one.**
    A hover tooltip appears on (a) trimmed / `…` text — revealing the full value —
    and (b) disabled buttons — explaining why they're disabled. Every such tooltip
    MUST render through the shared styled tooltip component (the project's
    `Tooltip` / `TruncatedText` / `TruncatedSerial`), and **NEVER** through a raw
    `title=""` HTML attribute — that attribute produces the browser's own default
    tooltip: an unstyled grey box, delayed by ~1s, that ignores the theme, can't
    wrap a long unbreakable value, and looks foreign next to the app.
    - **This applies to ANY text and ANY element that shows a hover hint — not
      only long / truncated text.** Short text, a value, an icon, a badge, a
      status pill, an avatar, an action — if hovering it reveals anything, it does
      so through the styled `Tooltip` / `TruncatedText`, **never** a `title`. Scan
      a page for `title=` on any element; every hit is this bug.
    - Any single-line value that can outgrow its space — a table cell, a label,
      a chip, a picked-option name, a detail read-back — is wrapped in
      **`TruncatedText`** (serials / codes / barcodes in **`TruncatedSerial`**),
      which ellipsizes to one line AND reveals the **full value in the styled,
      theme-aware, wrapping tooltip** on hover. It never sets a `title`.
    - **Adding `title="…"` to an element to get a hover tooltip is a bug**, and so
      is leaving a truncated value with only the native `title`. Replace it with
      `TruncatedText` (or wrap the trigger in the shared `Tooltip`). A native
      `title` is acceptable ONLY where a React tooltip genuinely can't reach (e.g.
      an `<option>` / `<optgroup>`), which is rare.
    - **Never both at once — no double tooltip.** If an element (or the text
      inside it) already reveals through the styled `Tooltip` / `TruncatedText`,
      it must NOT also carry a native `title` — otherwise BOTH fire on hover: the
      styled box AND, ~1s later, the grey native box stacked under it (the classic
      symptom is the same word appearing twice, e.g. a dark "WORKSTATION" bubble
      with a grey "WORKSTATION" box beneath). When you wrap text in a styled
      tooltip, strip every `title` on the SAME element and on any
      ancestor/descendant that wraps the same text (a common source is a shared
      cell/primitive that sets `title` from a `titleText` fallback while the value
      is already a `TruncatedText`). One piece of text → one tooltip, and it is
      always the styled one.
15. **Accessibility:** every icon-only button has an `aria-label`; everything works by
    keyboard (Tab moves, Enter confirms, Esc closes).
16. **WMS: the global warehouse filter is honoured everywhere.** In the WMS module the
    navbar global warehouse selection scopes **every** surface — lists, details,
    dashboards, and the warehouse-scoped dropdowns inside forms/modals (a form's
    location / rack / unit / stock pickers show only the selected warehouse's data).
    No WMS page ignores it and no page adds its own warehouse control; changing the
    navbar warehouse re-scopes the surface (a list resets its **whole view** — every
    tab, filter, search & sort back to defaults, since it's a fresh dataset; §1.1-K).
    A WMS surface
    that does **not** re-scope when the navbar warehouse changes is a bug — fix it on
    the FE, and add the backend `warehouse_id` filter param if the endpoint lacks one.
17. **Reuse the project's existing component — never build a new one when one already
    exists.** Before creating ANY component, search the project for one that already does
    the job (`components/ui/`, `components/common/`, `components/page-shells/`, and the
    module's own `components/`) and **use that exact one** — the same component the rest of
    the app uses for that job. **When more than one existing component could fit, STOP and
    ASK which one the project prefers — do not guess, and do not fork a variant.** Only
    create a new component when **none** exists for the job; when you do, place it so it can
    be reused (a shared folder), never as a one-off local copy. A new component that
    duplicates or nearly duplicates an existing one — a second dropdown style, a hand-rolled
    card, another empty-state — is a bug, not a feature (§7). If an existing shared component
    is *almost* right, **extend the shared component** so every screen benefits; don't clone it.
18. **Dropdowns show the LABEL, submit the VALUE.** Every select / dropdown / filter shows
    the **human-readable label** — part name, warehouse name, engineer name, `Inspection` /
    `Repair` / `QC` — on the **trigger**, in the **open option list**, and in any **read-back**.
    The raw **value** it carries (an `id`, a `code`, a lowercase enum like `inspection`) is
    what goes to the **backend** (request body / query param) and is **never shown to the
    user**. A trigger, option, chip, or filter that displays a raw value (`inspection`
    instead of `Inspection`, or a UUID) is a **bug** — pass the label as the option /
    `<SelectValue>` children while keeping the value as the option's `value`; a static
    `filterOptions: string[]` fed straight to the toolbar puts the enum on screen, so give it
    a `renderFilter` (or a label map) that shows the label while filtering by the value.
    *(Full detail: §5, §7.2.)*

---

## 1. Listing pages

**Frame:** `ListPageShell` — `title`, `subtitle`, `actions` = the primary **New** button
(solid, `+` icon, top-right). No breadcrumbs.

- **Summary cards** on top **when the page has meaningful totals** (Total · Open · Credit
  pending). Skip otherwise.
- **Always a table** (`BusinessMetricsTable`). Card grids only for genuinely spatial data
  (racks/bins).
- **Statuses = tabs with counts** (`Open 8 | Closed 5 | All`), not a status dropdown.
- **Whole row opens the detail** (`onRowClick`); **no blue link** on the ID column.
  A row's own buttons (`⋯`, quick actions) **must stop the row-click** — clicking them
  never also opens the detail.
- **Server pagination always.** Any **filter / search / sort / tab** change **resets to
  page 1**. Never `.slice()` a cached fetch. *(§16.7)*
- **Default sort = newest first** (`-created_at`).
- **Search** is debounced (~300ms), **server-side**, over key identifying fields
  (number, name, main refs). Length-capped to the backend limit.
- **Filters** = column-header `AsyncSelect` dropdowns + optional date-range.
  **"Clear filters" resets everything** (filters + search + sort) **and jumps to page 1**.
- **Warehouse (WMS):** the page follows the **navbar global warehouse filter** — no
  per-page warehouse control; changing the navbar **resets the whole view** (every tab,
  filter, search & sort back to defaults — a fresh dataset, not just page 1; §1.1-K).
- **Cells:** `StatusBadge` for status/type; `TruncatedText` for long text (trim + tooltip);
  `—` for blanks; money/date formatted per §0.
- **Auto-refresh** after any create / edit / delete (query invalidation) — no manual reload.
- **Empty states:**
  - **No data at all** → hide the filters/search toolbar; show the empty state + a
    **Create** button only.
  - **Filter/search returned nothing** → keep the filters; show "No results" + a
    **Clear filters** action.
  - **Error** → the error state (with a retry/create where sensible).
- **Bulk actions** where they make sense: row checkboxes + a bulk-action bar (appears when
  rows are selected) + a confirm before running.
- **Delete from a row** → `ConfirmDialog` first, then remove + toast.
- **Narrow screens:** the table scrolls sideways **inside its own box**; the page never breaks.

---

## 1.1. List view state — filters, search, sort, pagination, tab counts & navigation memory

Every list page (status tabs over a table) MUST implement the complete view
contract below. This is the behaviour a list is expected to have; a list missing
any point is a bug. Wire it through the shared list-view store and the shared
table component — never hand-roll per-page `useState` for tab / search / sort /
filters / page, which loses the memory in **B**.

**A. One independent view per tab.** Each status tab owns its OWN view:
`search`, `sort` (column + direction), every filter value (stage / type /
date-range / …), the current `page`, and the `page size`. A value set on one tab
NEVER bleeds into another; switching tabs restores that tab's own remembered
view.

**B. The view is remembered across navigation; it resets on refresh, on leaving
the section, or (WMS) when the navbar warehouse changes (§1.1-K).** The state lives
in an **in-memory, section-scoped store**
— not local component state, not the URL. All of these MUST hold:
  - Opening a row's **detail and pressing Back returns the list exactly as left**
    — same tab, filters, sort, page, and scroll position.
  - This holds whether the detail is **in the same section** (the list's own
    detail route) **or a shared detail that belongs to another section** reached
    from a row or from that detail (e.g. a document row, or a link on the detail,
    that opens a device / unit / record detail living under a different URL). The
    remembered view survives **every** such hop, in and back out.
  - A **full browser refresh** resets the view to defaults.
  - **Leaving the section entirely** (navigating to an unrelated module) resets
    the view to defaults, so re-entering starts clean. "The section" = the list's
    own URL subtree **plus every shared detail route a row can reach from it** —
    those all count as "still inside", so drilling into them never wipes the view.

**C. Everything is server-side.** Search, sort, filtering, and pagination are ALL
applied by the backend; never sort / filter / paginate a cached page in the
browser. If the backend can't yet do a genuinely-needed sort / filter / search,
**add the parameter on the backend** rather than faking it client-side.

**D. Any view change resets to page 1.** Changing the search, any filter, the
sort, or the active tab resets that tab's page to 1 (page 4 of a now-narrower
result reads as "no results", not "wrong page").

**E. Search.** Debounced (~300ms), server-side, over the row's key identifying
fields (number, name, main references), length-capped to the backend's limit.
The box is controlled by the view's stored `search`.

**F. Sort.** Server-side, **one column at a time**; a sortable column shows a
direction arrow and clicking toggles asc / desc. Only columns the backend
actually supports are marked sortable. Default order = newest first.

**G. Filters.** The one or two real filters are header dropdowns — a **fixed
enum** is the standard `Select`, an **API-backed list** the searchable
`AsyncSelect` — plus an **optional date range**. Every dropdown shows the human
**label** and submits the raw **value** (§18). The date range never sends an
inverted / impossible range, and a picked local day maps to the inclusive server
window.

**H. Tab counts follow the filters.** Each tab's badge reflects **that tab's own
filters** (search + every filter), never a global unfiltered total — applying a
filter MUST move the counts. Do it without waste: the **active tab reuses the
list query's `total`** (no second call), and **each inactive tab runs a slim
count query** (page size 1) **enabled only while it is inactive**. Because the
list keeps the previous tab's rows during a switch (keep-previous-data), the
active tab's count MUST fall back to its own count query while the list result is
still stale — so a just-left tab's number never flashes on the newly-selected
tab.

**I. Pagination.** Server-paginated always, with a **page-size selector**
(e.g. 10 / 25 / 50). Exactly page-size rows never produce a phantom empty next
page.

**J. Clear filters.** The empty-state "Clear filters" action (and any explicit
Clear control) resets the tab's **search + all filters** to empty and jumps to
**page 1**.

**K. Warehouse scope (WMS only).** The list follows the navbar global warehouse
pick; changing it is a fresh dataset, so **reset the whole view** (every tab back
to defaults). No per-page warehouse control.

---

## 2. Detail pages

**Frame:** the detail shell (breadcrumbs off). Header shows — **when present** — the
**title** (name/number), its **status badge**, a **back arrow**, and **action buttons**
top-right. Omit any piece that doesn't apply; the header still looks right.

- **Actions:** main ones top-right; the **destructive** one (Cancel/Delete) is **split
  off or in a `⋯` menu** and **always confirmed** (`ConfirmDialog`, destructive variant).
  Role/status-gated actions are **hidden**; data-blocked actions are **disabled + reason
  tooltip**.
- **Body layout depends on the page:** short → **stacked cards** in a fixed order
  (summary → line items → documents → history); heavy → **tabs** (`DetailTabs`). Be
  consistent across sibling detail pages.
- **Field : value = label on top (small, muted), value below** (stacked, never label-left).
- **Empty:** empty field → `—`; empty section → a small "Nothing yet" message.
- **Long text:** wrap inside cards; trim + tooltip inside embedded tables.
- **Reference numbers** (GRN/PO/PRET) look like **plain text** but **copy to clipboard on
  click** (+ a "Copied" toast) — no separate copy icon.
- **Back arrow** returns to the list **restoring its state** (tab / filters / page / scroll).
- **Not found** (deleted / cancelled / bad link) → friendly **not-found page**.
- **No access** (unauthorized) → a **no-access / not-found page** — never reveal data.
- **Always:** skeleton while loading; **refetch after any action** (status/data updates
  itself); **toast on every data change**; destructive actions confirm first.
- **Edit:** the whole record → the **full form page** (same as create); a few fields
  (e.g. logistics) → a **dialog**.
- **Documents:** view / add / remove (remove confirms); upload control at the **top** of
  the section; the list gets an **inner scroll after ~5** documents.

---

## 3. Forms

**Frame:** `FormPageShell` (no breadcrumbs), React Hook Form + Zod.

- **Layout:** default is **one column, full width, grouped into titled cards/sections**;
  a right sidebar is **only for genuinely big forms**.
- **Long / complex → numbered steps** (Step 1 / Step 2); **short → one page**.
- **Every field has:** a clear **label**, a **required red `*`** when mandatory (see the
  next bullet), and a **placeholder that accurately says what the field needs** — a real
  example / format (GST `e.g. 27ABCDE1234F1Z5`, phone `10-digit mobile`, date `DD MMM YYYY`),
  **never just a repeat of the label**. A failed field shows the error **two ways at once** —
  the **message inline under the field in red** AND the **field's own border turned red**
  — appearing **on blur**, updating live after, and clearing the instant the field is
  valid (full contract in §9).
- **Mandatory fields carry a RED `*`.** Every required field — on a **form page AND in a
  modal form** (§3.1) — shows a **red asterisk** next to its label, rendered through
  `<Label required>` (the shared `Label` component colours the `*` with the
  `text-destructive` token). **Never hand-write the marker** as
  `<span className="text-destructive">*</span>` (colour/spacing/a11y drift), and **never
  omit it** on a field the form actually requires. An **optional** field carries **no `*`**.
  The marker and the schema must agree: a `*` on a field the Zod schema doesn't require —
  or a required field (`.min(1)` / non-nullable) with no `*` — is a bug. The label is also
  associated to its control (`htmlFor` / `id`) so the `*` is announced to screen readers.
- **Field layout:** column count is chosen **per form** (commonly a 2-column grid on desktop
  that stacks to **1 column on mobile**). **Long / multi-line fields span full width**
  (address, notes, description, the main name/title); **short related fields share a row**,
  grouped logically (City · State · Pincode; Driver name · Phone).
- **Unsaved-changes guard.** A **dirty** form shows **"Discard changes? / Stay on page"**
  on **every** way out: **Cancel**, the page **back arrow**, **browser Back**, any
  **sidebar/menu link**, and **tab close / refresh** (native warning). A clean
  form leaves silently.
- **Edit dirty = value actually changed.** Compare against what the form opened with —
  touching a field and changing it back is **clean** (no popup).
- **Bad submit** (empty required / invalid): **block** the save, show every failed
  field's red message + red border (§9), and **scroll the page to the first bad field
  and focus it** so the user lands exactly where the error is — never leave them
  hunting for which field failed.
- **Always on:** Save **disables + shows a spinner** while saving (no double-submit); the
  **first field auto-focuses** on open; **Enter does not submit**; **whitespace is trimmed**
  before saving.
- **After a successful save → the item's detail page + a green "Saved" toast.**
- **Edit a record that no longer exists** → error toast + go back (never a broken form).
- **No edit permission** → the edit page is **hidden entirely** (they never reach it).
- **Save / Cancel** sit in a **sticky bottom footer bar pinned to the bottom of the page on
  EVERY form — short or long, whether or not it scrolls** — never inline right after the last
  field, and never floating with dead space beneath it on a short form. It stays visible while
  the body scrolls. Submit exits cleanly (bypasses the guard).

---

## 3.1. Modal forms — dialogs that create or edit

Modals appear all over the app for small create/edit tasks (assign engineer, move
stock, raise a service job, edit logistics, settle a return, reject a line…). A
modal form is **still a form** — every §3 rule applies — these are the
modal-specific additions. **When unsure, copy an existing `OperationDialog` form.**

- **Shell = `OperationDialog`, always.** Every create/edit/multi-field modal uses
  the shared `OperationDialog` (`components/common/dialogs/OperationDialog`), never
  a hand-rolled `<Dialog>`. It guarantees the fixed contract: a **sticky header**
  (title + optional one-line description), a **sticky footer** (the actions), and a
  **single scrolling body** — header and footer never scroll away no matter how long
  the form. A raw `<Dialog>` is only for a pure confirm (use **`ConfirmDialog`**) or
  a tiny reason-capture.
- **Unsaved-changes guard on EVERY close path.** A **dirty** modal prompts
  "Discard changes?" before closing via **Esc, backdrop click, the × button, AND
  Cancel** — all four. Wire it by passing `isDirty` to `OperationDialog` **and** a
  **render-prop `footer`** whose Cancel calls `requestClose` (so Cancel funnels
  through the same guard as Esc/backdrop). A clean modal closes silently. A
  Cancel/Esc that silently drops edits is a bug (§5).
- **One modal at a time — never a dialog on a dialog** (§5). A modal never opens
  another modal. The discard-confirm is the sole exception, and `OperationDialog`
  renders it **internally** — don't stack your own. A step that needs another
  surface replaces the modal's content or routes to a page.
- **Footer.** Cancel on the **left**, primary (Save / Create / Confirm) on the
  **right**. Save **disables + shows a spinner** while saving (no double-submit). A
  **destructive** action (reject, cancel request, scrap) uses the **`destructive`
  (red) confirm button** and **specific named buttons** ("Reject lines" / "Keep
  it"), never generic OK/Cancel.
- **Body = §3 fields.** Every field: label + red `*` when required + an **example
  placeholder** (never a label-repeat); errors **on blur**, inline. Dropdowns show
  the **label, never the id** (§7.2). Number fields **default to a literal `0` that
  clears on focus, with no leading zeros** — wired through `useNumberField` (§3.2 / §9).
  A long embedded list inside the modal
  (units, line items) **inner-scrolls** — the body scrolls, the sticky header/footer
  stay put; the modal **never scrolls horizontally**.
- **Placeholders are real examples, always.** Every free-text and number field
  carries a placeholder that shows a **concrete example or the expected format**
  (`AWB e.g. 1Z999AA10123456784`, `e.g. 27ABCDE1234F1Z5`, `10-digit mobile`, `0`),
  never a blank field and never a restatement of the label. A field whose only
  hint is its own label repeated (or no placeholder at all) is a bug.
- **Free-text is a `Textarea`, not a one-line `Input`.** Notes, remarks,
  description, reason, and address fields render as a **multi-line `Textarea`
  (2–4 rows)** so the field *looks* like it accepts a paragraph. A single-line
  `Input` for a notes/description field is a bug — the operator can't see they
  have room to write.
- **A boolean setting is a toggle row, not a naked checkbox.** A single yes/no
  option (Active, Include GST, Same vendor as before, Send now) renders as the
  **bordered tinted settings row** — label + one-line helper on the left, a
  `Switch` on the right — never a bare `Checkbox` with a text label floating
  beside it. (Multi-select item lists keep checkboxes; this rule is for a single
  on/off field.) See the Comprint Active-toggle pattern (`feedback` memory).
- **A new control must be symmetric with the same control elsewhere.** Any field,
  dropdown, or control added to a modal uses the **same shared component, size,
  label placement, placeholder style, and spacing** as its twin on other screens —
  a warehouse picker is the standard `AsyncSelect` everywhere, a status is the same
  `Select`, a note is the same `Textarea`. Never a one-off variant that makes the
  modal look different from the rest of the app. If the shared component is missing
  something you need, **extend the shared component** so every screen benefits —
  don't fork a local copy (§7).
- **Three states inside the modal too.** A modal that loads data shows a
  **skeleton / brief loading line**, a friendly **error**, and an **empty** state —
  never a blank body. Its dropdown options load **on open**, not on page mount (§11).
- **Focus & keyboard.** On open, focus moves **into** the modal (first field) and is
  **trapped**; on close it **returns to the trigger**. **Esc closes** (through the
  guard). **Enter does not submit** a multi-field modal.
- **Sizing.** Use the standard width (`OperationDialog` defaults to `sm:max-w-lg`;
  widen with `className="sm:max-w-xl"` only when the content needs it) and the capped
  height — the body scrolls, the modal never grows past the viewport.
- **Modal vs page (§4).** Small / quick / few fields → **modal**. Big / multi-step /
  line-item-heavy → a full **form page** (`FormPageShell`), not a giant modal. If the
  *whole* modal (not just a sub-list) needs its own scroll, it's probably a page.
- **Action-only dialogs** (no fields, just "are you sure") are **not** this — they use
  **`ConfirmDialog`** with a specific question title, a one-line consequence, and named
  buttons (§9). A reason-capture (reject/cancel with a required reason) is the small
  in-between: a lean dialog with one required field and a destructive confirm.

---

## 3.2. Field sizing & the right control per data type

Two failures make a form *look* wrong even when every field works: **controls
stretched too wide**, and the **wrong control for the data**. Decide both here,
once, so a form comes out right the first time. Reference: the Inward form
(`inward-form/*`) — `AsyncSelect` pickers, full-page cards, numbered step cards.

- **Full-page width — align with the sticky footer.** `FormPageShell` renders a
  **full-width sticky footer** (Save / Cancel) pinned to the bottom of the page.
  Let the form's **content fill that same width** — the cards span the full
  content area. Do **NOT** wrap the fields in a narrow `max-w` cap: a narrow,
  left-aligned island inside the full-width shell (a) leaves **dead space on the
  right**, and (b) **detaches the content from the footer** — the footer bar
  still spans the page, so its buttons sit far to the right and look like they
  belong to a different component. Keep the form the width of its footer. If a
  single row of fields would stretch too wide on a large screen, **add columns**
  (`sm:grid-cols-2 xl:grid-cols-3`) so each field lands at a comfortable width —
  never shrink the whole form to a narrow column.
- **Right control per data type.** The control is chosen by what the field holds,
  not by habit. The widths below are for a field that **stands alone on its own
  row**; a field **paired two-to-a-row fills its cell** (see rhythm below).

  | Field holds… | Standalone width | Control |
  |---|---|---|
  | Name / title / free text | full | `Input` |
  | Notes / address / description / reason | full, **multi-line** | `Textarea` (2–4 rows) |
  | Count / quantity / age | `max-w-40` (≈ 160px) | `Input type="number" inputMode="numeric"` |
  | Code / GST / PIN / short id | `max-w-xs` (≈ 320px) | `Input` |
  | Date | `max-w-xs` | shared **`DatePicker`** (popover calendar) — **never** native `<input type="date">` |
  | Money amount | `max-w-40`, right-aligned | currency `Input` |
  | Fixed enum (status / stage / type) | `sm:max-w-md` | **`Select` dropdown** |
  | API-backed list (any length) | `sm:max-w-md` | **`AsyncSelect`** — searchable, infinite-scroll (§16.11) |

- **Number fields: default `0`, clear on focus, no leading zero.** A count /
  quantity / age (any numeric `Input`) **shows `0` by default** — never a blank
  box — so the field reads as "zero", not "unset". On **focus**, a field still
  sitting at the default `0` **clears** so the operator types the real number
  straight in, without first deleting the `0` (a non-zero value stays put for
  editing). Typed input **never keeps a leading zero**: `013` becomes `13`, `007`
  becomes `7` (a lone `0`, and `0.x` on a decimal field, are fine). On **blur**,
  an emptied field **restores `0`**. Wire this through the shared
  **`useNumberField`** hook (spread its props onto `<Input>`) — never
  re-implement the focus / leading-zero handling per field. Applies on a form
  page, in a modal form, and in an inline table quantity cell alike. A `min`
  above `0` would snap the resting value off `0` and defeat the default, so a
  ">= 1" requirement is enforced at **submit-time** (schema), not as an input
  clamp.

- **`Select` vs `AsyncSelect` — the line that matters most.** A field whose
  options come from a **fixed enum** (stage, status, type, condition) is a plain
  **`Select` dropdown**. A field whose options come from an **API fetch** (a
  warehouse, GRN, part, engineer, vendor, customer — any list the server owns) is
  an **`AsyncSelect`**, always — even when the list is short or already loaded:
  wrap an already-fetched array with **`makeStaticAsyncOptions`** to get the same
  searchable dropdown without another round-trip. A plain `Select` fed a fetched
  list is the single most common wrong-component bug — it silently caps at the
  first page and looks foreign next to the app's other pickers (§16.11). Mirror
  the Inward form: every picker there is an `AsyncSelect`.
- **A segmented control is not for plain enums.** Reserve the segmented toggle
  (the Inward `SegmentedToggle`) for a **2–3 way choice where each option carries
  an icon or a one-line description** (Sale vs Rental; Staff-return vs Transfer).
  A bare enum with short labels (Inspection / Repair / QC) is a **`Select`
  dropdown**, not a row of buttons — do not turn a simple dropdown into a
  segmented control.
- **Field rhythm.** Label → control is `flex flex-col gap-1.5`; fields in a group
  are `gap-4`. **Two fields to a row** (`grid sm:grid-cols-2`), **each control
  filling its cell** (`w-full`). **Never cap an individual control *inside* a
  paired row** (it leaves half the cell empty and reads as broken); if a cell is
  too wide on a large screen, **add columns** to the row so each field lands at a
  comfortable ≈ 320–500px, never a lone capped control in a wide empty cell. A
  long / primary field (name, notes)
  may **stand alone at full width** on its own row.
- **Multi-step page form = numbered titled cards.** Each step is a `Card` with a
  **numbered header** (circle + `card-title` + one-line `helper` description) —
  the Inward `SectionHeader` pattern — not a bare field grid. Steps reveal
  progressively (a later step appears once the prior choice is made), in floor
  order.
- **Never hand-roll the Save / Cancel bar.** The actions come from
  `FormPageShell`'s **full-width sticky footer**, pinned flush to the bottom of
  the page (Cancel left of the primary, primary right, spinner while saving). Do
  not place buttons inside a card or at the end of the content — that is the
  "buttons on the wrong component" bug. Pass `onSave` / `onCancel` / `saveLabel`
  / `canSave` / `saving` / `isDirty` to the shell and let it render the bar.

Every colour comes from a **semantic token** (§8.5) and every label from
`<Typography>` (§8.4) — never a raw hex in a control.

### Form page recipe — copy this, fill the fields

The shape a correct create/edit page has. If a form page doesn't match this,
that's the fix list.

```tsx
<FormPageShell
  title={S.title}
  backHref="/module/thing"
  saveLabel={S.save}
  canSave={isValid}                 // disables the primary until valid (§3)
  saving={mutation.isPending}       // spinner + no double-submit (§3)
  isDirty={isDirty}                 // unsaved-changes guard on EVERY exit (§3)
  onSave={() => void handleSubmit()}
  onCancel={() => navigate(backHref)}
>
  {/* Full-page width: NO max-w cap, so the cards line up with the sticky
      footer bar (§3.2). */}
  <div className="flex flex-col gap-6">
    {/* One Card per group. Multi-step → numbered header per step. */}
    <Card>
      <CardHeader><CardTitle>{S.sectionTitle}</CardTitle></CardHeader>
      <CardContent>
        {/* Two fields to a row, each filling its cell. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f1" required>{S.field1}</Label>
            {/* Fixed enum → <Select>. API-backed list → <AsyncSelect>. */}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f2" required>{S.field2}</Label>
            {/* Real example placeholder, error on blur (§3). */}
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</FormPageShell>
```

Save / Cancel are the shell's sticky footer — never add your own. Copy is a
`*.strings.ts` constant (§16.12); every colour a token (§8.5); every label a
`<Typography>` (§8.4).

---

## 4. Which component to use (cheat-sheet)

| When you need… | Use |
|---|---|
| A data list/table | `BusinessMetricsTable` (tabs, server pagination, `cellFormatter`, `onRowClick`) |
| A status / type label | `StatusBadge` (variant from the `constants` map) |
| Long text that may overflow | `TruncatedText` / `TruncatedSerial` — **tables trim, detail cards wrap** |
| A risky confirm | `ConfirmDialog` (`variant="destructive"`) |
| Guard an unsaved form | `useUnsavedChangesGuard` + `UnsavedChangesDialog` |
| An API-backed dropdown | `AsyncSelect` (infinite scroll + debounced search) *(§16.11)* |
| Empty result | `EmptyState` |
| Loading | skeletons (never a bare page spinner) |
| Error | `LoadErrorState` / the standard error state |
| Success / failure feedback | a **toast** (`sonner`) |
| A date/time (display) | `formatIST` / `<DateDisplay/>` (IST) |
| A date **input** (form/filter) | shared **`DatePicker`** (popover calendar) — never native `<input type="date">` |
| Money | the currency util (`₹`, Indian grouping, 2 dp) |
| Any button | `Button` — solid = primary, `outline` = secondary, `destructive` = dangerous |
| Any icon | `lucide-react`, `size-4`, `data-icon="inline-start"` |
| Any text | `<Typography variant… tone…>` |
| A small-task surface (edit a few fields / pick items) | **decide per feature** — heuristic: small/quick = **dialog**, big/multi-step = **full page**; use a side-drawer only if deliberately chosen |

*(Number of primary/solid buttons per screen is situational — not a fixed limit.)*

---

## 5. Non-negotiables — a reviewer will reject these

- A naked user-facing string in JSX.
- A hand-typed colour (hex / rgb / hsl / `var(--x,#hex)`).
- Raw `<h1>`–`<h6>` or inline `text-*` sizing.
- A client-paginated (`.slice()`) list.
- A dropdown that fetches all rows and filters in the browser.
- A select / dropdown trigger that shows a raw **id / code / value** instead of the human
  **label** (a picked Part must read "Dell Latitude 5420", never its UUID).
- A `truncate` in a flex row without `min-w-0`, or a horizontal scrollbar anywhere other
  than a **data table** panning inside its own box as a last resort (§0.10 / §9).
- A raw `title=""` attribute used as a hover tooltip on ANY element — the native
  browser tooltip — instead of the project's styled `Tooltip` / `TruncatedText`
  (§0.14).
- Breadcrumbs rendered on a page.
- A destructive action with no confirm.
- A form whose Cancel/back silently discards edits (no guard).
- A validated field that fails but shows only ONE signal — a red message with no red
  border, or a red border with no message. Both are required, and both must clear when
  the field becomes valid (§9).
- A blocked Save that does NOT scroll to and focus the first invalid field, leaving the
  user to hunt a long form for what failed (§9 / §3).
- A mandatory field (form OR modal) with **no red `*`** on its label, or a `*`
  hand-written as `<span className="text-destructive">*</span>` instead of
  `<Label required>` (§3). Optional fields must carry no `*`.
- A greyed-out button the user's role/status can never enable (should be hidden).
- A blank cell / `null` / `undefined` shown to the user (should be `—`).
- A hand-rolled page layout instead of a page-shell.
- A dialog stacked on top of another dialog (nested popups) — one at a time; replace the
  dialog's content or use a page instead.
- An embedded list (documents, line items) that grows the page unbounded instead of
  inner-scrolling past its threshold.

---

## 6. Test-case checklist (run this to catch bugs)

Tick every box on the page you're checking. A failed box = a bug.

### 6.1 Every page
- [ ] Built in the right page-shell; **no breadcrumbs** visible.
- [ ] All text from `*.strings.ts`; all colours are tokens; all text via `Typography`.
- [ ] Loading → skeleton (not blank). Error → friendly state (not raw text).
- [ ] Every missing value shows `—`. Unknown status → grey badge.
- [ ] Nothing relies on colour alone (status/error also carry text/icon); inputs label-associated; errors announced.
- [ ] Booleans shown consistently (badge / Yes-No, not `true`/`false`); one term per concept; correct plurals; sentence-case labels.
- [ ] Nothing the user's role can't use is visible (hidden, not greyed).
- [ ] Absurdly long text in every slot → **no** horizontal scrollbar on the page, cards or
      rows (a data table may pan inside its own box only after cells truncate — §0.10).
- [ ] Keyboard: Tab through, Enter confirms, Esc closes. Icon buttons have `aria-label`.
- [ ] Action buttons: spinner + disable while running; blocked → disabled + why-tooltip; primary on the right; icon + label.
- [ ] Dates are IST + readable; money is `₹` + commas + 2 decimals.
- [ ] Text follows the **Typography map (§8)** — no picked-by-eye sizes.
- [ ] Same-job components match sibling pages (§7) — no ad-hoc variants; dropdowns are the standard ones.
- [ ] Looks identical to its sibling pages (compare to Inward).
- [ ] Load fails → error + Retry (a failed *refresh* keeps old data, not blank); a 401 → login (remembering the page).
- [ ] Server/offline errors (500 / 429 / no-net) → friendly message + Retry; long inactivity → warn then sign out.
- [ ] Quick actions wait for the server (no roll-back flicker); fast loads don't flash a skeleton.

### 6.2 Listing page
- [ ] `ListPageShell` + top-right **New** button (solid, `+` icon).
- [ ] Summary cards on top (only if the page has useful totals).
- [ ] Data is a `BusinessMetricsTable`; statuses are **tabs with counts**.
- [ ] Clicking **anywhere on a row** opens the detail.
- [ ] Clicking a **row button** (`⋯` / quick action) does **not** also open the detail.
- [ ] Change any filter / search / sort / tab → list **resets to page 1**.
- [ ] Default sort is **newest first**.
- [ ] Search is debounced and returns server-side results; "Clear filters" resets
      everything + page 1.
- [ ] Navbar warehouse change re-scopes the list and resets it (WMS).
- [ ] After create / edit / delete elsewhere, the list **auto-refreshes**.
- [ ] **No data at all** → toolbar/filters hidden, empty state + **Create** button only.
- [ ] **Search/filter with no matches** → filters stay, "No results" + **Clear filters**.
- [ ] Error loading → error state (not a blank grid).
- [ ] Long cell text trims with a tooltip; blank cells show `—`.
- [ ] Delete from a row asks to confirm, then removes + toasts.
- [ ] Bulk select (if present): checkboxes + bulk bar + confirm; "Select all" = current page only; runs on eligible rows and reports skipped.
- [ ] Narrow screen → table scrolls sideways inside its box; page intact.
- [ ] Only the **few necessary** filters, all **server-side**; dropdowns are the standard `AsyncSelect` / `Select` (§7).
- [ ] Applying any filter / search **updates the tab counts** to match.
- [ ] Active filters show as removable **chips + Clear all + result count**.
- [ ] Every over-long cell truncates to one line + tooltip (never widens the column).
- [ ] Sort/filter only on server-supported columns (add backend support if a needed one is missing); page-size selector present.
- [ ] Date-range filter blocks invalid ranges; real zeros show as `0` / `₹0.00` (only missing shows `—`).
- [ ] Cell alignment: numbers right / text left; header sticky on scroll; sort shows a direction arrow (single-column).
- [ ] Wide table: first column frozen; negative amounts / credits shown distinctly.
- [ ] Rows show a hover highlight + a selected/active highlight when picked.

### 6.3 Detail page
- [ ] Header: title + status badge + back arrow + actions (each shown only if it exists).
- [ ] Main actions top-right; destructive one split off / in `⋯` and **confirmed**.
- [ ] Role/status-gated actions are **hidden**; data-blocked ones are disabled + tooltip.
- [ ] Field:value is **label-on-top**; empty field → `—`; empty section → "Nothing yet".
- [ ] Reference number looks like plain text but **copies on click** (+ toast).
- [ ] Back arrow returns to the list **as it was left** (tab/filters/page/scroll).
- [ ] Non-existent / cancelled record → **not-found page**.
- [ ] Unauthorized record → **no-access page** (no data leak).
- [ ] After any action, the page **refetches** and the status/data updates; a toast fires.
- [ ] Edit whole record → full form page; edit a few fields → dialog.
- [ ] Documents: view/add/remove(confirm); upload at top; list scrolls after ~5.
- [ ] Comments / notes / activity use the shared components, newest first.

### 6.4 Form (create & edit)
- [ ] Every field: label + `*` if required + example placeholder.
- [ ] Invalid field shows **BOTH** a **red message under it** AND a **red field border**; both appear on blur, update live, and clear when valid (§9).
- [ ] A bad Save **scrolls to + focuses** the first invalid field (takes the user to the error).
- [ ] Save **disables + spinner** while saving (can't double-submit).
- [ ] First field **auto-focuses**; **Enter doesn't submit**; spaces trimmed on save.
- [ ] **Dirty form + any exit** (Cancel, back arrow, browser back, sidebar link, tab
      close/refresh) → **"Discard changes?"** popup. Clean form leaves silently.
- [ ] **Edit:** popup only if a value **actually changed** (revert = clean).
- [ ] Successful save → **item's detail page** + green toast.
- [ ] Edit a record that no longer exists → error toast + go back.
- [ ] No edit permission → the edit page is unreachable (hidden).
- [ ] Save conflict (record changed since opening) → warn + reload latest (no silent overwrite).
- [ ] Line-item forms: add/remove rows · ≥1 required · per-row validation · live totals · inner-scroll after ~10 rows.
- [ ] Cross-field rules checked client-side (clear message) + backend re-checks; duplicate unique value → field message (no duplicate created).
- [ ] Save/Cancel in the **bottom bar**; Cancel runs the guard.
- [ ] Long form → steps; short form → one page; full-width stacked (sidebar only if big).
- [ ] Number fields: whole quantities · 2-dp amounts · no negatives · no letters.
- [ ] Required fields marked with red `*`; unselected dropdowns show a muted placeholder (no auto-first).
- [ ] Placeholders describe what's needed (real example / format) — never just repeat the label.
- [ ] Field layout: long / multiline fields full-width; related short fields grouped on a row; stacks to 1 column on mobile.
- [ ] Right input type/keyboard · codes auto-uppercase · pasted spaces trimmed · max-length counter · sensible defaults prefilled.
- [ ] Read-only/auto fields shown greyed (labeled), not editable; dependent fields disable-until-parent + clear-on-change.
- [ ] The Save/Cancel bar is **pinned to the bottom on every form** (short or long, scrolling or not) and **sticky** (stays visible while the body scrolls) — never floating mid-page with dead space beneath.
- [ ] Multi-selects show removable chips (`+N` overflow).
- [ ] File upload: types+size shown · bad files rejected · progress shown · remove confirms · in-flight upload blocks Save + warns before leaving.
- [ ] Wizard: can't skip ahead (validate to advance); going back is free.
- [ ] Type validation runs: email · phone (10-digit) · GST/PAN/pincode · positive numbers · real dates — matching the backend rules.
- [ ] Date pickers restrict by meaning (future-only vs past-only); From–To stays ordered.

### 6.5 Dialogs & feedback
- [ ] A dialog closes via Cancel, **Esc**, or **click-outside** — but an **edited** dialog
      warns "Discard changes?" first.
- [ ] Destructive dialog uses the red/destructive confirm button.
- [ ] Every data change → a toast (green ok / red fail); no duplicate toast spam.
- [ ] Disabled buttons carry a tooltip saying **why**.
- [ ] Confirm dialogs use a **specific title + named buttons** (not generic OK/Cancel).
- [ ] Dialog focus: moves **in** on open, **traps** while open, **returns to the trigger** on close.
- [ ] No dialog opens another dialog (one at a time); embedded lists inner-scroll (docs ~5, line items ~10).

### 6.6 Navigation & API efficiency
- [ ] Back / Cancel returns to origin with its state restored.
- [ ] After create → the item's detail (+ toast); after edit → its detail.
- [ ] Page opens by URL & survives refresh; a bad id → not-found (no crash).
- [ ] Browser Back never dead-ends / loops / lands on a stale just-submitted form.
- [ ] Network tab: **no duplicate calls**, no whole-record fetch for one field.
- [ ] Dropdown / dialog data loads **on open + on scroll**, not on page mount.
- [ ] Mutations invalidate **only** the affected queries (no blanket refetch).
- [ ] Unknown URL → 404 page; detail's active tab is deep-linkable; no phantom empty page at exact page-size.

---

## 7. Consistency & symmetry — the same building blocks everywhere

The goal: a user should feel every page was built by one person. **Same job → same
component, same size, same place.** This is what stops the "distorted" mismatched look.

1. **One component per job — used everywhere.** If a job already has a chosen component,
   every page uses *that* one; don't invent a second. A page may deviate only with a
   written reason (a code comment) — and even then, prefer fixing the shared component so
   all pages benefit.
   - Table → `BusinessMetricsTable` · Status → `StatusBadge` · Confirm → `ConfirmDialog`
   - Unsaved guard → `UnsavedChangesDialog` · Empty → `EmptyState` · Long text → `TruncatedText`
   - Toast → `sonner` · Buttons → `Button` · Text → `Typography`
2. **One dropdown family — pick the TYPE by the data SOURCE (never a zoo of styles).** Choose
   from this set only; don't invent new ones, don't use a native `<select>`. The type is
   chosen by the **source** of the options, not their count: a **fixed enum** (status / stage
   / type / condition — any length) is a plain **`Select`**; an **API-backed** list is an
   **`AsyncSelect`**, always, even when short or already loaded (wrap it with
   `makeStaticAsyncOptions`) — see §3.2. Same trigger height, placeholder, clear-`×`, and
   chevron on every page. A dropdown never auto-selects the first option — unselected shows a
   muted placeholder.
   - **One control height per module; filters match forms.** Every interactive control in a
     module — text inputs, selects, pickers, and the toolbar search box — shares **one**
     height so a page reads as one piece (WMS = **h-10**, set centrally via the
     `.wms-search-scope` rule rather than per call site). A list-page **filter** dropdown
     uses the **same** canonical `Select` / `AsyncSelect` at the **default** size as a form
     field — **never** a compact `size="sm"` variant, a bespoke combobox, or a differently
     styled header control.

   - **Show the LABEL, never the value.** Once an option is chosen, the trigger displays its
     human-readable **label** (part name, warehouse name, vendor name) — **never** the
     underlying `id` / code / UUID that is the option's `value`. Base UI / shadcn `Select`
     renders the raw `value` when `<SelectValue>` has no children, so **always pass the label
     as the `SelectValue` children** (`<SelectValue>{selected?.name ?? placeholder}</SelectValue>`);
     `AsyncSelect` carries its own `{ id, label }` and shows the label by default. The same
     holds inside the open list — each `SelectItem` renders the label, not the id. A trigger
     (or a selected chip, or a detail read-back) that shows a raw id is a bug. *(§5)*

   | The data is… | Use |
   |---|---|
   | A fixed enum (status / stage / type / condition — any length) | **`Select`** (shadcn) |
   | Long / API-backed, single pick (warehouse, part, PO…) | **searchable `AsyncSelect`** — debounced server search + **loads the next page as you scroll** (infinite). Never fetch-all-then-filter. *(§16.11)* |
   | Pick MANY | the **multi-select** variant — **removable chips (`+N`)**; still server-searchable + scroll-loaded when API-backed |
   | Grouped / nested options | a **grouped** dropdown (section headers inside the list) |
3. **Minimal, server-side filters & sort.** Every list ships **only the few filters that
   are genuinely needed** — never add a filter "just in case." **All sorting and filtering
   is server-side**; never sort/filter a cached page in the browser. Primary split = status
   **tabs**; the 1–2 real filters = header dropdowns + (optional) date range. Default sort =
   newest first.
4. **Tab counts follow the filters.** When a filter / search is applied, the tab counts
   update to match — each tab's badge reflects *that* tab's own filters. A count never
   lies about what the tab would actually show.
5. **Truncate + tooltip for any single-line value.** Any single-line value — in a table
   cell **or** anywhere in the UI — that can exceed its space is trimmed to one line with an
   ellipsis and reveals the **full value in a hover tooltip** (`TruncatedText`) — the app's
   **styled** tooltip, **never** the native browser `title=""` box (§0.14). It never
   stretches or breaks the layout. *(Genuine multi-line content — notes, descriptions — may
   wrap, or clamp to N lines with a "Show more".)*
   - **The tooltip is required on EVERY truncated text cell — including formatter-rendered
     ones.** A cell whose `cellFormatter` returns a custom node (a styled part name, a
     linked code) must still surface its full value on hover once it's clipped; a truncated
     cell with no tooltip is a bug. (In `BusinessMetricsTable` this is the `maxCellChars`
     path, which tooltips the underlying value for formatter cells too — skipping only
     short values and raw ids.)
   - **A list table MAY also apply a fixed character cap** on top of the width clip so
     columns stay narrow and the table fits without sideways scroll. It's a hard ceiling
     layered over the width-based trim (§0.14), the full value always stays in the styled
     tooltip, and it's set once per module (WMS: ~20 chars via `WMS_LIST_MAX_CELL_CHARS`,
     passed as `maxCellChars`) so every list matches.
6. **Same spacing, buttons, icons.** Card padding, section gaps, button sizes, and icon
   sizes (`size-4`) come from the shared components — never hand-tuned per page.
7. **Long embedded lists get an inner scroll** so the page's header, totals, and action bar
   are never pushed away: **documents after ~5**, **line items after ~10**, and any other
   in-page repeated list past its comfortable height. The page itself never grows unbounded.

---

## 8. Typography map — one variant per job (no variance)

Every piece of text uses the row below, via `<Typography variant… tone…>`, so the same
kind of text looks identical on every page. **Never pick a size by eye.**

| Text | `variant` | `tone` |
|---|---|---|
| Page title (top of page) | `page-title` | default |
| Page subtitle (under the title) | `page-subtitle` | muted |
| Big section heading | `section-title` | default |
| Sub-section heading | `subsection-title` | default |
| Card / panel title | `card-title` | default |
| Stat-card number | `stat-value` | default (or a status tone) |
| Stat-card / small meta label | `card-meta` or `caption` | muted |
| Field label (form + detail key) | `caption` | muted |
| Field value / detail value | `body` | default (`body-strong` to emphasize a name) |
| Table cell text | `body` | default (muted for secondary) |
| Helper / hint under a field | `helper` | muted |
| Empty placeholder (`—`) | `body` | muted |
| Inline error message | `caption` | danger |
| Status / type pill text | *(handled by `StatusBadge`)* | — |
| Serial / code / barcode | `mono` (or `TruncatedSerial`) | default |

**Never** raw `<h1>`–`<h6>`, **never** an inline `text-[13px]` / `text-lg` / `font-*`. If a
new kind of text appears, add a row here first, then use it.

---

## 9. Fields, inputs, uploads, wizards & tables — detail rules

**Number & text inputs**
- Number fields: **quantities are whole numbers**, **amounts/prices allow 2 decimals**,
  **no negatives** (unless the field truly needs them), and **letters/symbols are blocked**.
- **Default to a literal `0` that clears on focus — via `useNumberField`.** A numeric field
  **shows a real `0` by default** (not a blank box, not a placeholder) so it reads as "zero";
  on **focus** a field still at the default `0` **clears** so the operator types straight in;
  **no leading zeros** (`0100` → `100`, `0153` → `153`; a lone `0` / `0.x` stay); on **blur**
  an emptied field **restores `0`**. Wire every numeric input — form page, modal, or inline
  table cell — through the shared **`useNumberField`** hook (`src/hooks/use-number-field.ts`);
  never hand-roll the focus / leading-zero handling or fall back to an empty-with-placeholder
  box. A `min` above `0` would snap the resting value off `0`, so enforce ">= 1" at
  submit-time (schema), not as an input clamp.
- **Required fields show a red `*`**; optional fields are unmarked.
- A dropdown with nothing chosen shows a **muted placeholder** ("Select warehouse…") —
  **never auto-select the first option** for the user.
- **A failed-validation field signals the error TWO ways at once — message + red
  border.** Whenever a field with validation is invalid, it shows **both**: the
  **error message directly under the field, in red** (`<Typography variant="caption"
  tone="danger">` — §8, from the Zod message, one line), **AND** the **input's
  own border turns red** (the control's error / invalid state via the
  `border-destructive` / `aria-invalid` token — never a hand-typed hex/red). The
  two appear **together** — on blur, then live as the user keeps typing — and
  **clear together** the instant the field becomes valid. A field that shows only
  the message with no red border, or a red border with no message, is a bug: the
  reader needs both the *where* (the red field) and the *why* (the message).
  Applies to every validated field on every form and modal (§3 / §3.1) — text,
  number, dropdown, date, upload alike. The invalid input is also marked
  `aria-invalid` and its message linked via `aria-describedby` so screen readers
  announce it (§14).
- **On a blocked submit the page jumps to the error.** When Save is pressed with any
  invalid field, the form **scrolls the first invalid field into view and focuses it**
  (RHF `shouldFocusError`, on by default — keep it) so the user is taken straight to
  the field that failed rather than left to search a long form. First in **DOM order**,
  which for a well-ordered form is the topmost error. The red message + red border are
  already showing on every failed field by then (above).

**Field behaviors**
- Use the **correct input type** so the right mobile keyboard shows (number pad for amounts,
  email keyboard for email). For dates use the shared **`DatePicker`** (§3.2) — **never**
  native `<input type="date">`.
- **Auto-uppercase** codes (GST / PAN) and **trim** stray spaces from pasted values.
- A field with a **max length** shows a live **`x/500` counter** and stops at the limit.
- **Prefill sensible defaults** where obvious (country = India, date = today).
- **Read-only / auto-filled fields** (generated numbers, derived/locked values) are shown
  **clearly read-only** — greyed, no cursor, labeled — not hidden, not editable.
- **Dependent fields:** a child is **disabled until its parent is chosen** and **clears when
  the parent changes** (pick Category → Parts narrows; pick PO → warehouse fixed).

**Validation by field type** (in the Zod schema; shown on blur)
- **Email** → a valid email. **Phone** → 10-digit Indian mobile. **GST** → 15-char format ·
  **PAN** → 10-char format · **Pincode** → 6 digits.
- **Amounts / quantities** → positive (quantities whole, amounts ≤ 2 dp). **Dates** → real,
  complete calendar dates. **Required** → non-empty after trim. Honour any **max length** the
  backend caps.
- Every field validates to the **same rule the backend enforces** — never send a value the
  client can already prove will 422.

**Calendar / date pickers**
- **Always the shared `DatePicker`** (`components/common/pickers/DatePicker`) — a popover
  calendar with the app's styling — **never** the browser's native `<input type="date">`.
  The native control opens an inconsistent, non-theme browser calendar and needs
  `showPicker()` click hacks; the shared picker keeps the same `value` / `onChange` / `min`
  / `max` string contract, so validation is unchanged. Ranges use `DateRangePicker`.
- Restrict by the field's **meaning**: a **future** field (delivery / expected date) blocks
  **past** dates; a **past** field (date of birth / received-on) blocks **future** dates; a
  **From–To** range keeps `To ≥ From` and disables impossible dates. Never send a date/range
  the server will reject.

**Multi-select**
- Selected items show as **removable chips** (each with an `×`), collapsing to **`+N`**
  when there are many — not a comma list, not just a count.

**File uploads**
- **State allowed types + max size up front** (e.g. "PDF, JPG, PNG · max 20 MB").
- **Reject** a wrong-type / oversize file with a clear message — never a silent fail.
- **Show progress / a spinner** while uploading.
- **Allow remove**; removing an already-saved file **asks to confirm**. Multiple files may
  upload at once, each becoming its own item.
- While a file is still uploading, **block Save and warn before leaving** so an in-flight
  upload isn't lost.
- **Viewing a file opens it *inside the app*, never a new browser tab.** A file preview is an
  in-app dialog titled with the **real file name** — images render inline, PDFs in an embedded
  viewer, and anything else offers a Download. Never open a generated object URL in a new tab:
  a `blob:` tab is titled with the file's random id instead of its name, so the user can't tell
  what they opened. The same dialog serves both a stored file (fetched through the authenticated
  client so the token travels) and a just-picked local file (previewed from memory).

**Step wizards (multi-step forms)**
- The user **cannot skip ahead** — advancing **validates the current step** and blocks with
  errors if invalid. **Going back** to earlier steps is always free. The step strip shows
  progress; the unsaved-changes guard applies to the whole flow.

**Confirm dialogs**
- Wording is **specific**: a question title ("Reject this unit?"), a one-line consequence,
  and **named buttons** ("Confirm rejection" / "Cancel") — never generic "Are you sure? /
  OK / Cancel". Destructive → red confirm button.

**Tables**
- A column is **sortable/filterable only if the server supports it** — never a fake
  client-side sort that lies. **If a genuinely-needed sort/filter isn't supported yet, add
  it on the backend** rather than faking it in the browser.
- A **page-size selector** (e.g. 10 / 25 / 50) with a sensible default.
- A **date-range** filter **prevents invalid ranges** (To-before-From, impossible dates)
  and never sends a range the server would reject.
- **Cell alignment:** amounts / quantities / dates **right-aligned** (tabular); text
  **left-aligned**; headers align with their cells.
- **Sticky header:** column headers stay pinned while the rows scroll.
- **Sort cue:** a sortable column shows a **direction arrow**; clicking toggles asc/desc;
  only **one** column sorts at a time.
- **Frozen identifier:** in a wide table that pans sideways, the **first column
  (name / number) stays frozen** so the row is always identifiable.
- **Row states:** a subtle **hover highlight**, and a clear **selected/active highlight**
  when a row is picked (bulk / selection).

**Buttons**
- A button that runs an action shows a **spinner + disables** until it finishes (no double-click).
- A button blocked by a **fixable data reason** is **disabled with a why-tooltip**;
  role/status-blocked buttons are **hidden** (§0).
- In a button row, the **primary action is on the right**; secondary / Cancel to its left.
- Buttons pair an **icon + label**; icon-only only for very common actions, always with an
  `aria-label`. Sizes / variants come from the shared `Button`.

**Zero vs missing**
- **Zero is a real value** — show `0` / `₹0.00`. Only a truly **missing/null** value shows
  `—`. Never render a real zero as a dash.

---

## 10. Navigation

- **Back / Cancel returns to origin.** A form's Cancel/back and a detail's back arrow go to
  **where the user came from** (the list or the parent detail) and **restore its state**
  (tab / filters / page / scroll). Never a hard-coded "always jump to the list root".
- **After create → the new item's detail page** (never a blank form or the bare list);
  **after edit → that item's detail**. Both with a toast.
- **Every page is URL-openable & refresh-safe.** Detail / edit / list pages open directly
  from their URL and survive a refresh (deep-linkable). An unknown/invalid id → a not-found
  state, never a crash. *(§11.1 — validate URL params before they hit the API.)*
- **Browser Back always behaves** — no dead-ends, no loops, and it never lands on a stale
  just-submitted form (the unsaved-guard + `navigate(…, { replace: true })` after a save
  handle this).
- Breadcrumbs stay **off** (§0); the back arrow + sidebar are the navigation cues.
- **Record identifiers are clickable + copyable, everywhere they appear.** Any
  identifier that has its own detail page — a document number (WA / dispatch /
  MI / GRN / PRET / Sales Order …), a barcode, an id — renders as an
  `<EntityRef>` (`components/common/display/EntityRef`), never plain text.
  **Single click opens** that record's detail page; **double click copies** the
  value. This holds in *every* place the identifier shows — detail headers,
  tables, timelines / activity feeds, cards, badges, inline text — not just on
  list pages.
  - **Redirect only if the role can open the target — otherwise copy-only.** If
    the logged-in user lacks access to the destination page, the identifier does
    **not** navigate (never bounce a user to a "No access" screen); it degrades
    to **copy-only** (a single click copies). Access is derived from the target
    route's RBAC bundle registered in `shared/lib/entityRoutes.ts`
    (`entityPermissionForPath`); superusers bypass. Cross-module links (a WMS
    page pointing at a CRM record, say) are gated the same way.
  - **The current record's own identifier is inert.** On a record's own detail
    page, its number/heading does not link — clicking it must not fire a
    redundant navigation to the page you are already on; `EntityRef` renders it
    as plain text.
  - **Never single-click-to-copy on a routable number.** A bare `CopyableText`
    (click copies) on an identifier that *has* a detail page is wrong — use
    `EntityRef` so a single click opens and a double click copies. `CopyableText`
    is only for values with no detail page. Reference: `EntityRef` +
    `shared/lib/entityRoutes.ts`.

**How to wire it — the exact patterns (a form page fails this without them):**

- **Cancel + back arrow go to the origin, not the list root.** Compute
  `const navigateBack = useNavigateBack('/module/list')` and pass
  `onCancel={navigateBack}`. `useNavigateBack` does `navigate(-1)` when there is
  in-app history (returns to the exact list/parent with its scroll + filters) and
  only falls back to the list root on a fresh load / deep link. **Never**
  `onCancel={() => navigate('/module/list')}` — that is the hard-coded jump the
  first rule forbids.
- **The back ARROW must run through the SAME unsaved-guard as Cancel.** Create the
  guard once (`const guard = useUnsavedChangesGuard({ isDirty })`) and hand it to
  the shell: `<FormPageShell guard={guard} …>`. The shell then routes **both** its
  back arrow and its Cancel through that guard and renders the discard dialog
  itself — so **remove any local `<UnsavedChangesDialog>`**. Passing only
  `isDirty` (or nothing) leaves the back arrow on an inert guard, so a dirty form
  leaves silently when the arrow is clicked — a §3 bug.
- **After a successful create/edit, REPLACE the form entry.**
  `navigate(\`/module/\${id}\`, { replace: true })` (after `guard.bypassOnce()` +
  `guard.popSentinelIfPresent()`). Without `replace`, Back from the new detail
  returns to the stale just-submitted form.
- Reference: `WorkAssignmentIssueBody` (form) + `useNavigateBack` +
  `FormPageShell`'s `guard` prop.

---

## 11. API efficiency — no wasted or duplicate calls

Unnecessary / duplicate API calls are a **bug**. On **every page you build or touch**, check
the network tab and remove waste — **including on the backend** (denormalize a field, add a
batch/stats endpoint) when the fix belongs there.

- **One fetch per data need** — fetched once and shared via the TanStack Query cache; never
  the same call fired from two places on one screen.
- **Don't fetch a whole record for one field.** If a row/detail needs a single label from a
  related record (warehouse name, supplier name…), the **backend denormalizes** it onto the
  response — don't fetch the whole related object per row.
- **No eager fetches.** A dropdown's / dialog's data loads **when it opens**, not on page
  mount; API-backed dropdowns are **paged on scroll**, never fetch-all. *(§16.11)*
- **No redundant count calls** — don't run a separate `count` query that equals a `total`
  you already have; derive it. Don't fetch a tab's count with a call that duplicates the list.
- **Server pagination, not fetch-then-`.slice()`.** *(§16.7)*
- **Targeted invalidation after a mutation** — refetch only the affected list/detail queries,
  never a blanket "refetch everything". *(§16.9)*
- **Global query config once** — defaults live in the global `QueryClient`, not per hook. *(§6.5.1)*

**Audit every interaction** on the page (fix it, or file it as a BE change):

| Interaction | Check |
|---|---|
| First load | Any call duplicated? Any call for data already on another response? |
| Refresh / refetch | Refetching more than needed? |
| Create / edit / delete | Invalidates only what changed (not everything)? |
| Listing | One list call + only the counts shown; **no per-row fetches**? |
| Detail | One detail call + only the sub-resources actually rendered? |
| Forms / dropdowns | Options load on **open** + on **scroll**, not eagerly on mount? |

---

## 12. Errors, sessions, bulk actions, feeds & export

**Load & refresh failures**
- First load fails → a friendly **error state with a Retry**. A failed **background refresh**
  keeps the existing data on screen + a small "couldn't refresh" note — never blank it.
- **Server / network errors** (500, 429 rate-limit, no internet) show a **friendly message +
  Retry** (an offline note when there's no connection) — never a raw stack trace or error code.

**Session expiry (401) & idle**
- Redirect to **login**, remember the page to return to afterwards, and show a "please sign
  in again" message. Never surface a raw 401.
- After long **inactivity**, **warn before auto sign-out**; on sign-out, return to login
  remembering the page (same flow as the 401).

**Save conflict**
- If the record changed on the server since it was opened, **warn** the user and let them
  **see / reload the latest** before overwriting — never silent last-write-wins.

**List memory**
- A list **remembers its tab / filters / page / scroll** across list → detail → back. A full
  browser refresh (or leaving the section) resets it to defaults.

**Bulk actions**
- **"Select all" selects the current page only** (with a note when more rows match).
- If some selected rows aren't eligible (wrong status / no permission), **run it on the
  eligible ones and report which were skipped and why** — don't fail the whole batch.
- A bulk action always **confirms** before running and **toasts the result**.

**Comments / notes / activity feeds**
- Use the **shared** comment / note / timeline components; **newest first**; an empty feed
  shows a friendly prompt ("No notes yet").

**Export / print (CSV, PDF)**
- Export **respects the current filters** (what's shown), shows a **loading state** while
  generating, and names the file **clearly** (with a date). Add export only where it's needed.

---

## 13. Interactions & polish

- **Quick actions are pessimistic.** A row toggle / approve / reject shows a brief loading
  and updates **only after the server confirms** — never show a state that might roll back.
- **Active filters are visible.** Applied filters show as **removable chips** with a
  **"Clear all"**, and the **result count** is shown ("24 results"). The user always sees
  what's narrowing the view.
- **No skeleton flicker.** Delay the skeleton slightly so a near-instant load doesn't flash
  skeleton → data. Show it only if loading takes more than a brief moment.
- **Dialog focus.** On open, focus moves **into** the dialog (first field / primary button)
  and is **trapped** inside; on close, focus **returns to the trigger** that opened it.

---

## 14. More test cases — line items, validation, a11y, content & routing

**Line-item sub-forms** (PO lines, return units, dispatch rows, BOM components)
- Rows can be **added / removed**; **at least one** is required to submit; **each row
  validates on its own**; **running totals / counts update live** as rows change. The
  line-item list gets an **inner scroll after ~10 rows** so the totals + Save bar stay reachable.

**Cross-field & business validation**
- Rules spanning fields (End ≥ Start date; can't return more than dispatched; line total =
  qty × price; sum of lines = header total) are **checked on the client with a clear message
  before submit** — and the **backend re-checks** as the source of truth.

**Unique / duplicate values**
- A value that must be unique (part number, vendor code, warehouse code…) shows a **clear
  message on that field** when it already exists ("This code is already used") and does
  **not** create a duplicate — mirror the existing part-number handling; never a raw 409 box.

**Colour is never the only signal (accessibility)**
- Anything conveyed by colour (status, error, success, over-capacity) **also carries text
  and/or an icon**, so colour-blind users can tell items apart. A `StatusBadge` always has a
  label; an error always has text.
- Form inputs are **label-associated** (`htmlFor`); the **focus ring is visible**; validation
  errors are **announced to screen readers** (`aria-live`). Touch targets are comfortably tappable.

**Boolean / flag display**
- A yes/no or on/off value (Active, Is Default, Tracked) is shown **consistently everywhere**
  — a badge or a clear "Yes / No" (with an icon), **never a bare `true` / `false`**, never a
  different style per page.

**Content & wording**
- **One term per concept** app-wide (always "Warehouse", never "WH" / "Store"). **Correct
  plurals** ("1 item" / "2 items"). **Sentence-case** labels. All copy still lives in the
  words file (§0).

**Routing**
- An **unknown URL** (bad link / typo) → a proper **404 "Page not found"** with a way home —
  never a blank screen or a crash. *(A valid route with a bad **id** → the detail not-found
  page, §2.)*
- A detail page's **active tab is deep-linkable** (reflected in the URL) so a refresh or a
  shared link reopens the same tab.

**Pagination edges**
- Exactly page-size results → **no phantom empty "next" page**; the last page shows its
  partial rows and the pager reflects the true total.

---

*Anything not covered here defaults to: copy the Inward pages, and keep it identical to
sibling pages. When a genuinely new situation appears (a new page type, a new component),
add its rule here first, then build.*
