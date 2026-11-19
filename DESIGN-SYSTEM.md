# Comprint ERP — Design System

This document is the source of truth for design tokens (colour, typography, radius, elevation, animation) used across the Comprint ERP frontend. **Read this before reaching for a hex literal.**

If you only have 30 seconds to read this file, three rules:

1. **Pick a semantic Tailwind class.** `bg-primary`, `text-success`, `bg-destructive-soft`, `text-muted-foreground` — not `bg-[#0F1B2D]` or `text-[#f1416c]`.
2. **Never hardcode a colour — in any form.** Not raw hex (`bg-[#f1416c]`, `style={{color:'#…'}}`), not `rgb()`/`rgba()`/`hsl()` literals (`shadow-[…rgba(16,24,40,.05)]`), not `var(--token, #hex)` fallbacks (use `bg-card`, not `bg-[var(--card,#fff)]`), not hex in JS colour maps (use `var(--token)`). ESLint warns on `[#hex]`; the migration table below maps every legacy hex to its token. The only places raw colour values may live: this design system's source (`src/styles/tokens/colors.css`), `chartTheme.tsx`, and PDF/print HTML strings (no CSS vars render there). To re-skin or theme the app you edit **only** `src/styles/themes.css` (+ `colors.css` for new values) — every component follows.
3. **shadcn primitives are the canonical way to render coloured UI.** Use `<Button variant="success">` and `<Badge variant="destructive">` instead of rolling your own styled `<div>`.

---

## How to choose a colour

```
What are you colouring?
│
├─ Status, state, or action (success/danger/warning/info)?
│  → Use a semantic token: bg-success, text-destructive, bg-warning-soft
│
├─ A surface (page, card, popover, sidebar)?
│  → Use a surface token: bg-background, bg-card, bg-popover, bg-sidebar
│
├─ Brand chrome (header, primary button, brand mark)?
│  → Use the primary token: bg-primary, text-primary, border-primary
│
├─ Text?
│  → text-foreground (primary), text-muted-foreground (secondary),
│    text-success/destructive/warning/info (state)
│
├─ A border or form chrome?
│  → border-border, border-input (form fields), ring-ring (focus state)
│
└─ A truly custom colour (chart series, illustration accent)?
   → Either: (a) use a Tier-1 ramp value like bg-[var(--color-green-100)]
     for nuance, or (b) propose adding a new semantic token in a follow-up PR.
```

---

## Architecture — four tiers

```
src/styles/
├── tokens/colors.css   ← Tier 1: raw colour ramps (THE ONLY FILE WITH HEX)
├── themes.css          ← Tier 2: semantic tokens (light + dark)
├── index.css           ← Tier 3: Tailwind bridge (--color-* aliases)
└── comprint.css        ← Tier 4: component-utility CSS (.cpt-*, .crm-*, .bom-*)
```

| Tier | File | Hex allowed? | What lives here |
|------|------|:---:|---|
| 1 | `tokens/colors.css` | ✅ Yes — only here | Pure colour ramps: `--color-slate-700`, `--color-green-600`, `--color-amber-50`, … |
| 2 | `themes.css` | ❌ No | Semantic tokens: `--primary`, `--success`, `--background`, `--border`, … (light + dark variants) |
| 3 | `index.css` (`@theme inline`) | ❌ No | Tailwind bridge: `--color-primary` → `var(--primary)` so utilities like `bg-primary` work |
| 4 | `comprint.css` | ❌ No (a few intentional dark-mode chart-style escapes) | Component utility classes that compose tokens via `var()` and `color-mix()` |

**Invariant:** If you ever find yourself typing a hex value outside `tokens/colors.css`, stop. Either reuse an existing token, or propose a new ramp stop.

---

## Tier 2 — Semantic tokens (the ones you use 95% of the time)

Every token below has a light-mode and dark-mode value. Switch by toggling the `.dark` class on `<html>`. Pages that hardcode hex literals **won't** flip with dark mode — that's why the migration matters.

### Surface

| Token | Tailwind class | Light | Dark | Use for |
|-------|---|---|---|---|
| `--background` | `bg-background` | `#F6F7F9` | `#0A0D14` | Page background |
| `--foreground` | `text-foreground` | `#0F1B2D` | `#E8EAEF` | Primary body text |
| `--card` | `bg-card` | `#FFFFFF` | `#141820` | Card / panel surface |
| `--card-foreground` | `text-card-foreground` | `#0F1B2D` | `#E8EAEF` | Text on a card |
| `--popover` | `bg-popover` | `#FFFFFF` | `#141820` | Floating popover / dropdown panel |
| `--popover-foreground` | `text-popover-foreground` | `#0F1B2D` | `#E8EAEF` | Text in a popover |

### Primary (brand chrome)

| Token | Tailwind class | Light | Dark | Use for |
|-------|---|---|---|---|
| `--primary` | `bg-primary`, `text-primary`, `border-primary` | `#0F1B2D` (navy) | `#D0D5DD` (light slate) | Primary buttons, brand mark, brand-tinted accents |
| `--primary-foreground` | `text-primary-foreground` | `#FFFFFF` | `#0F1B2D` | Text **on** a primary surface |
| `--primary-hover` | `bg-primary-hover` | `#1E2A3D` | `#98A2B3` | Primary button hover state |

### Secondary / muted / accent

| Token | Tailwind class | Light | Dark | Use for |
|-------|---|---|---|---|
| `--secondary` | `bg-secondary` | `#EEF0F3` | `#1A1F2B` | Quiet chip surfaces, secondary buttons |
| `--secondary-foreground` | `text-secondary-foreground` | `#344054` | `#D0D5DD` | Text on a secondary surface |
| `--muted` | `bg-muted` | `#EEF0F3` | `#1A1F2B` | Disabled controls, quiet section backgrounds |
| `--muted-foreground` | `text-muted-foreground` | `#525C6F` | `#A8B1C0` | Secondary / supporting text |
| `--label-foreground` | `text-label-foreground` | `color-mix(foreground 70%, muted-foreground)` | same formula (dark inputs) | Table headers + KPI labels — darker than muted, lighter than body. Typography `tone="label"` |
| `--accent` | `bg-accent` | `#EEF1F6` (brand-tinted) | `#1E2535` | Sidebar hover, soft brand highlights |
| `--accent-foreground` | `text-accent-foreground` | `#0F1B2D` | `#D0D5DD` | Text on an accent surface |

### Semantic states — success, warning, info, destructive/danger

Every state has three forms: **solid** (`--success`), **soft** (`--success-soft`) for tinted backgrounds, and **foreground** (`--success-foreground`) for text rendered on a solid surface.

| Token group | Tailwind classes | Light solid | Light soft | Use for |
|---|---|---|---|---|
| **success** | `bg-success`, `bg-success-soft`, `text-success`, `text-success-foreground` | `#067647` | `#ECFDF3` | "Completed", "Approved", "On track" |
| **warning** | `bg-warning`, `bg-warning-soft`, `text-warning`, `text-warning-foreground` | `#B54708` | `#FFFAEB` | "Overdue soon", "Action needed", "Pending review" |
| **info** | `bg-info`, `bg-info-soft`, `text-info`, `text-info-foreground` | `#175CD3` | `#EFF4FF` | Informational notes, neutral highlights |
| **destructive / danger** | `bg-destructive`, `bg-destructive-soft`, `text-destructive` (`bg-danger…`, `text-danger…` are aliases) | `#B42318` | `#FEF3F2` | "Rejected", "Failed", "Cancel", "Delete" |

Every state token has a `-hover` variant too (`bg-success-hover` etc.) for hover states without reaching into the ramp.

### Form chrome

| Token | Tailwind class | Light | Dark | Use for |
|-------|---|---|---|---|
| `--border` | `border-border` | `#E4E7EC` | `#252A38` | Card / divider borders |
| `--input` | `border-input` | `#D0D5DD` | `#252A38` | Form-field borders |
| `--ring` | `ring-ring` | semi-transparent navy | semi-transparent slate | Focus ring on inputs/buttons |

### Sidebar

| Token | Tailwind class | Light | Dark |
|-------|---|---|---|
| `--sidebar` | `bg-sidebar` | `#FFFFFF` | `#10141C` |
| `--sidebar-foreground` | `text-sidebar-foreground` | `#344054` | `#98A2B3` |
| `--sidebar-primary` | — (used inside sidebar nav active item) | `#0F1B2D` | `#D0D5DD` |
| `--sidebar-accent` | `bg-sidebar-accent` | `#EEF1F6` | `#1E2535` |
| `--sidebar-border` | `border-sidebar-border` | `#E4E7EC` | `#252A38` |

### Chart palette

`--chart-1` through `--chart-5` map to: primary navy, success green, info blue, warning amber, destructive red. Same intent as the semantic tokens but explicitly named for chart series. Use them via `fill-chart-2` / `stroke-chart-3` etc.

---

## Tier 1 — Ramp reference (last resort)

These live in `src/styles/tokens/colors.css`. **Reach for a semantic token first** — only use a ramp value directly when no semantic token fits (e.g. a one-shade-darker hover state). If you find yourself wanting a ramp value often, propose a new semantic token.

### Slate (Comprint brand neutral — cool navy)

| Stop | Hex | Anchored to |
|---|---|---|
| `--color-slate-50` | `#EEF1F6` | `--accent` |
| `--color-slate-100` | `#D0D5DD` | dark `--primary`, dark `--accent-foreground` |
| `--color-slate-200` | `#98A2B3` | dark sidebar foreground |
| `--color-slate-300` | `#667085` | — |
| `--color-slate-350` | `#A8B1C0` | dark `--muted-foreground` |
| `--color-slate-400` | `#344054` | `--secondary-foreground` |
| `--color-slate-500` | `#525C6F` | `--muted-foreground` |
| `--color-slate-600` | `#1E2A3D` | `--primary-hover` |
| `--color-slate-650` | `#243248` | detail-head gradient stop |
| `--color-slate-700` | `#0F1B2D` | `--foreground`, `--primary` (brand navy) |
| `--color-slate-800` | `#0A1320` | — |
| `--color-slate-900` | `#050A12` | — |
| `--color-slate-950` | `#03060B` | — |

### Gray (pure neutral surfaces)

| Stop | Hex | Anchored to |
|---|---|---|
| `--color-gray-50` | `#FAFBFC` | card footer wash |
| `--color-gray-100` | `#F6F7F9` | `--background` |
| `--color-gray-150` | `#E8EAEF` | dark `--foreground` |
| `--color-gray-200` | `#EEF0F3` | `--secondary`, `--muted` |
| `--color-gray-300` | `#E4E7EC` | `--border` |
| `--color-gray-400` | `#D0D5DD` | `--input`, scrollbar thumb |
| `--color-gray-500` | `#98A2B3` | scrollbar thumb hover |
| `--color-gray-800` | `#1A1F2B` | dark `--secondary`, dark `--muted` |
| `--color-gray-850` | `#1E2535` | dark `--accent` |
| `--color-gray-870` | `#252A38` | dark `--border`, dark `--input` |
| `--color-gray-880` | `#10141C` | dark `--sidebar` |
| `--color-gray-900` | `#141820` | dark `--card`, dark `--popover` |
| `--color-gray-950` | `#0A0D14` | dark `--background` |

### State ramps

Each state ramp has the same three intent stops:

| Ramp | Soft (50) | Mid (100/200) | Solid (600) | Hover (700) | Deep (800) |
|---|---|---|---|---|---|
| **green** | `#ECFDF3` | `#D1FAE5`, `#A7F3D0` | `#067647` | `#055C38` | `#044D2E` |
| **red** | `#FEF3F2` | `#FEE2E2`, `#FECACA` | `#B42318` | `#991B14` | `#7A1610` |
| **amber** | `#FFFAEB` | `#FEF3C7`, `#FDE68A` | `#B54708` | `#9A3B06` | `#7F3005` |
| **blue** | `#EFF4FF` | `#DBEAFE`, `#BFDBFE` | `#175CD3` | `#1349A8` | `#0F3A87` |

Plus `--color-red-dark-1: #E05252` for the dark-mode destructive override.

---

## Migration table

Old hex literals (still found in feature pages) → new semantic class.

ESLint warns on every match. The `pnpm lint` baseline currently surfaces ~186 hits. Fix-as-you-touch: when you edit a file with one of these, swap the hex for the semantic class.

### Comprint canonical palette

| Old hex | New Tailwind class | Notes |
|---|---|---|
| `#0F1B2D` (text) | `text-foreground` or `text-primary` | depending on intent |
| `#0F1B2D` (bg) | `bg-primary` | brand navy chrome |
| `#1E2A3D` | `bg-primary-hover` | primary button hover |
| `#344054` | `text-secondary-foreground` | secondary button text, label text |
| `#525C6F` | `text-muted-foreground` | helper text |
| `#667085` | `text-muted-foreground` | sub-label, table caption |
| `#98A2B3` | `text-muted-foreground` (lighter) | very quiet text |
| `#D0D5DD` | `border-input` | form-field border |
| `#E4E7EC` | `border-border` | divider / card border |
| `#EEF0F3` | `bg-muted` or `bg-secondary` | quiet surface |
| `#EEF1F6` | `bg-accent` | brand-tinted hover |
| `#F6F7F9` | `bg-background` | page background |
| `#FAFBFC` | `bg-[var(--color-gray-50)]` | rare; use card footer wash |
| `#067647` | `text-success` / `bg-success` | "Approved" / "Completed" |
| `#055C38` | `bg-success-hover` | success button hover |
| `#ECFDF3` | `bg-success-soft` | success chip background |
| `#B54708` | `text-warning` / `bg-warning` | "Pending" / "Action needed" |
| `#9A3B06` | `bg-warning-hover` | warning button hover |
| `#FFFAEB` | `bg-warning-soft` | warning chip background |
| `#175CD3` | `text-info` / `bg-info` | informational |
| `#1349A8` | `bg-info-hover` | info button hover |
| `#EFF4FF` | `bg-info-soft` | info chip background |
| `#B42318` | `text-destructive` / `bg-destructive` | "Rejected" / "Failed" |
| `#991B14` | `bg-destructive-hover` | destructive button hover |
| `#FEF3F2` | `bg-destructive-soft` | destructive chip background |

### Legacy Metronic palette (the "drift" — replace on sight)

Earlier theme migrations left a brighter palette scattered across feature pages. These are visually similar to Comprint canonical but not identical — they break design consistency and never tracked dark mode. **Map them to the canonical token of the same intent:**

| Old hex (Metronic) | New Tailwind class |
|---|---|
| `#f1416c` (bright red) | `text-destructive` / `bg-destructive` |
| `#fff5f8` (red tint) | `bg-destructive-soft` |
| `#991930` (deep red) | `text-destructive` |
| `#50cd89` (bright green) | `text-success` / `bg-success` |
| `#e8fff3` (green tint) | `bg-success-soft` |
| `#0b5c22` (deep green) | `text-success` |
| `#f6c000` (bright amber) | `text-warning` / `bg-warning` |
| `#fff8dd` (amber tint) | `bg-warning-soft` |
| `#b88800` (deep amber) | `text-warning` |
| `#1379f0` (bright blue) | `text-info` / `bg-info` |
| `#eef5ff` (blue tint) | `bg-info-soft` |
| `#0d4b94` (deep blue) | `text-info` |
| `#7239ea` (Metronic violet) | `text-info` (closest semantic match — or propose a `--violet` token) |
| `#a1a5b7` (Metronic gray) | `text-muted-foreground` |

---

## Component patterns

The canonical way to produce coloured UI is via a shadcn primitive. **Don't roll your own:**

| Need a … | Use |
|---|---|
| primary action button | `<Button variant="default">Save</Button>` |
| secondary button | `<Button variant="secondary">Cancel</Button>` |
| destructive button | `<Button variant="destructive">Delete</Button>` |
| outline / quiet button | `<Button variant="outline">…</Button>` |
| ghost button (link-like) | `<Button variant="ghost">…</Button>` |
| coloured status pill | `<Badge variant="success">Approved</Badge>` (also `warning`, `info`, `destructive`) |
| info banner | `<Alert variant="info">…</Alert>` (when alert is added) |
| coloured progress bar | `<Progress color="success" />` (or `info`, `danger`, `warning`) |
| status dot on an avatar | `<AvatarBadge status="online" />` (or `busy`, `away`, `offline`) |
| status cell in a table | `className="success-cell"` / `"red-cell"` / `"warning-cell"` / `"info-cell"` |

---

## Typography

| Element | Class / token | Size | Weight | Notes |
|---|---|---|---|---|
| `<h1>` | inherited | 22 px | 650 | letter-spacing -0.015em |
| `<h2>` | inherited | 20 px (text-xl) | 600 | |
| `<h3>` | inherited | 18 px (text-lg) | 600 | |
| `<h4>` | inherited | 16 px (text-base) | 600 | |
| `<h5>` | inherited | 14 px (text-sm) | 500 | |
| `<h6>` | inherited | 13 px | 500 | |
| Body | `font-sans` + `text-foreground` | inherits 13 px from app | 400 | |
| UI label | `font-ui` | 13 px | 550 | input labels, buttons |
| Mono / SKU | `font-mono` | 12.5 px | 400 | tabular nums via `.num` |

### Dashboard roles (Typography variants)

One variant per text ROLE, so every dashboard widget renders the same role the same way
(sizes from the erp-demo scale). Plan: `comprint-erp-docs/modules/crm/dashboard/DASHBOARD_TYPOGRAPHY_PLAN.md`.

| Role | Variant | Size | Weight | Case / tracking | Default tone |
|---|---|---|---|---|---|
| Band / section heading | `eyebrow` (`<h2>`) | 11 px | 650 | uppercase 0.08em | default (dark) |
| Widget title | `card-title` | 13 px | 600 | — | default (dark) |
| Widget subtitle | `widget-subtitle` | 12.5 px | 400 | — | muted |
| KPI label | `kpi-label` | 11 px | 600 | uppercase 0.08em | label |
| KPI value (hero) | `kpi-value` | 24 px | 650 | -0.025em, tabular | default |
| KPI value (compact tile) | `kpi-value-sm` | 18 px | 600 | tabular | default |
| KPI label (dense tiles, 3-4 across in one widget) | `kpi-label-sm` | 10 px | 600 | uppercase 0.05em | label |
| KPI value (dense tiles) | `kpi-value-xs` | 15 px | 600 | tabular | default |
| Table header | `table-header` | 11 px | 600 | uppercase 0.06em | label |
| Table cell | `table-cell` | 13 px | 400 (key col 500, money 600) | — | default |
| Table secondary line / % | `table-secondary` | 12 px | 400 | — | muted |

Colour hierarchy: headings + content = `default`; headers + KPI labels = `label`; only
secondary text (sub-lines, %, captions, empty/loading) = `muted`. The 11 px roles are written
as `0.6875rem` so the legacy `[data-module] .text-[11px].uppercase` rule in `comprint.css`
(still used by the sidebar and several forms) doesn't re-weight them.

Per Coding-guideline §8.4, feature code uses `<Typography variant="…">` from `@/components/ui/typography` instead of raw `<h1>`–`<h6>` JSX or arbitrary `text-[Npx]` classes. ESLint warns on raw heading tags and `text-xs`/`text-sm`/… in feature files.

---

## Page layout & spacing

The app has ONE outer page frame, owned by `AppShell` (`src/app/layouts/AppShell.tsx`). Every routed page sits inside it, so the content never shifts when you switch nav items between modules or sub-modules.

| Concern | Value | Where it's set |
|---|---|---|
| Outer page padding (**the frame**) | `p-5 lg:p-7` — 20 px → 28 px, all sides | `AppShell` `<main>` — the **only** place it lives |
| Content width cap | `max-w-[1600px]`, centered (`mx-auto`) | `AppShell` |
| Section rhythm (between page sections) | `gap-6` (24 px) | `ListPageShell` / `DetailPageShell` / `FormPageShell` |
| Sticky-bar bleed (header/footer → frame edge) | `-mx-5 lg:-mx-7` (with `px-5 lg:px-7`) | `EntityHeader`, `FormPageShell` footer |

**A page's root element must NOT set its own outer padding / margin / `max-w` / `container`** (`p-*`, `px-*`, `py-*`, `m-*`, `mx-auto`, `max-w-*`, `container`). The frame is already applied; re-padding the root double-insets the page and makes it jump relative to its siblings. This holds for the loaded view AND every early-return loading / empty / error branch. A page-root `no-restricted-syntax` ESLint rule warns on this (`eslint.config.js`).

Padding **inside** a card or panel (e.g. a form-card body `px-6 py-5`) is fine — the rule targets only the page's outer frame.

To build a page, reach for a shell (`ListPageShell`, `DetailPageShell`, `FormPageShell`) — they assume the frame is applied and add only the `gap-6` rhythm. The frame value and the bleed negative-margins are coupled: if you ever change `p-5 lg:p-7`, change `-mx-5 lg:-mx-7` to match, or sticky headers/footers will overhang.

---

## Radius scale

`--radius` is the base value (currently `0.5rem` = 8 px). Tailwind utility scale is derived in the bridge:

| Class | Multiplier | Result |
|---|---|---|
| `rounded-sm` | 0.6× | 4.8 px |
| `rounded-md` | 0.8× | 6.4 px |
| `rounded-lg` | 1.0× | 8 px (default cards, inputs) |
| `rounded-xl` | 1.4× | 11.2 px |
| `rounded-2xl` | 1.8× | 14.4 px |
| `rounded-3xl` | 2.2× | 17.6 px |
| `rounded-4xl` | 2.6× | 20.8 px |
| `rounded-full` | — | pill shape |

---

## Elevation / shadow

The CRM module uses two layered shadow stacks defined inside `comprint.css`:

| Token | Use | Class to compose |
|---|---|---|
| `--crm-shadow-rest` | Card at rest | `.cpt-card` |
| `--crm-shadow-hover` | Card on hover | applied via `.cpt-card:hover` |
| `--crm-lux-rest` | Premium / luxury cards | `.crm-lux-card` |
| `--crm-lux-hover` | Premium hover state | applied via `.crm-lux-card:hover` |

**Don't compose shadows inline.** If you need card elevation, use the `.cpt-card` / `.crm-lux-card` utility class. If you need a one-off shadow that doesn't fit, propose a new `--*-shadow-*` token in `comprint.css`.

---

## Animation

Two semantic keyframes are available globally:

| Class | Duration | Use |
|---|---|---|
| `.animate-fade-in` | 0.2 s | mount transitions |
| `.animate-slide-up` | 0.2 s | drawer / panel reveal |

CRM module additionally uses `--crm-ease` (`cubic-bezier(0.22, 0.68, 0, 1)`) and `--crm-ease-lux` (`cubic-bezier(0.16, 1, 0.3, 1)`) — these are scoped to `.cpt-*` / `.crm-*` utilities. Reach for them only inside `comprint.css`.

---

## Dark mode

Dark mode is activated by toggling the `.dark` class on `<html>`. The ThemeProvider handles this; in DevTools you can simulate by adding `class="dark"` to the `<html>` element.

**What is correct in dark mode after this design system PR:**

- All shadcn primitives in `src/components/ui/**` (button, badge, card, input, dialog, popover, select, switch, progress, avatar, …).
- Page-shell components (ListPageShell, DetailPageShell, FormPageShell, EntityHeader, DetailTabs, …).
- Anything composed of theme classes (`bg-card`, `text-muted-foreground`, `border-input`, …).

**What is *not* yet correct in dark mode:**

- Feature pages that still hardcode hex literals (~186 hits surfaced by ESLint).
- Tables / lists that use arbitrary `[#hex]` classes for status colour.

**Migrating a page to dark mode:**

1. `pnpm lint <your-file>` shows every `bg-[#hex]` / `text-[#hex]` / `border-[#hex]` hit.
2. Look up each hex in the **Migration table** above.
3. Replace `bg-[#f1416c]` → `bg-destructive`, etc.
4. Test in light mode (visual parity) and dark mode (chrome flips automatically).

---

## How to add a new token

You probably don't need to. Try the existing token reference first. But if a real new intent appears:

1. **Add the ramp stop** (if needed) to `src/styles/tokens/colors.css`. Hex lives here only.
2. **Add the semantic token** to `src/styles/themes.css`. Define it for both `[data-theme='itasm']` (light) and `.dark [data-theme='itasm']` (dark). Use `var(--color-…)` to reference Tier 1.
3. **Bridge it to Tailwind** in `src/styles/index.css` `@theme inline`. Add `--color-foo: var(--foo);` so `bg-foo` / `text-foo` etc. become available.
4. **Document it** here in the "Tier 2 — Semantic tokens" tables.
5. **Mention the new token in the PR description** so reviewers can decide whether it belongs in the system or whether you should reuse an existing token.

---

## Out of scope (today)

- **Migrating the ~186 hex / arbitrary `[#hex]` Tailwind classes in feature pages.** Done fix-as-you-touch using the Migration table above; ESLint enforces the discipline at warning level until the count hits zero.
- **Full dark-mode page audit.** Only primitives are dark-mode-correct after this PR; feature pages with hardcoded hex stay light-only until migrated.
- **Chart palette (`chartTheme.tsx`).** Self-contained 16-accent palette for chart series. Lives outside the four-tier system intentionally.
- **Coding-guideline.md sweep.** It still references the old `itasm-*` / `status-*` tokens. Those still work via backward-compat aliases in `index.css` `@theme inline` — but the canonical names are the ones documented here.

---

## Where to make changes

| Want to change… | Edit |
|---|---|
| A ramp hex (rare!) | `src/styles/tokens/colors.css` |
| A semantic mapping (e.g. "primary should be slate-800 not slate-700") | `src/styles/themes.css` |
| A Tailwind alias (rare) | `src/styles/index.css` `@theme inline` |
| A component utility class (`.cpt-kpi`, `.bom-*`, …) | `src/styles/comprint.css` |
| A shadcn primitive variant | `src/components/ui/<name>.tsx` |

When in doubt, ask in the design channel before touching Tier 1 — ramp changes ripple across every page.
