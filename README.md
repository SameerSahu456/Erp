# Comprint Frontend

React + Vite + TypeScript frontend for the Comprint ERP — consumes the comprint-backend API.

## Stack

Vite 8 · React 19 · TypeScript 6 (strict) · React Router 7 · TanStack Query 5 · Tailwind CSS v4 · shadcn/ui + @base-ui/react · React Hook Form · Zod · Vitest.

## Getting started

```bash
npm install
cp .env.example .env         # point VITE_API_BASE_URL at comprint-backend (default http://localhost:8000)
npm run dev                  # http://localhost:5173
```

## Scripts

```bash
npm run dev         # Vite dev server
npm run build       # TypeScript build + production bundle
npm run test        # Vitest run (once)
npm run test:watch  # Vitest watch mode
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
```

## Layout

- `src/components/ui/` — shadcn primitives ported from `../theme/` (buttons, dialogs, tables, etc.)
- `src/components/layout/` — app shell pieces (AppShell, Sidebar, Header) — to be ported
- `src/modules/<name>/` — business modules mirroring the backend (identity, ims, crm, oms, procurement, wms)
- `src/app/` — app-level wiring (router, providers, dashboard)
- `src/shared/` — cross-cutting helpers (api client, auth context, hooks)
- `src/styles/` — Comprint design tokens (`index.css`, `themes.css`, `comprint.css`)
- `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)

## Design system

Ported verbatim from `../theme/`: Tailwind v4 via `@tailwindcss/vite`, Inter font, 9 theme variants, Comprint-specific `.cpt-*` utility classes from the design handoff prototype. See `src/styles/index.css`.

## Documents

- Architecture: [docs/design/2026-04-22-frontend-architecture.md](docs/design/2026-04-22-frontend-architecture.md)
- Phase 1 plan: [docs/plans/2026-04-22-phase1-frontend-scaffold.md](docs/plans/2026-04-22-phase1-frontend-scaffold.md)
- Module task lists: [docs/plans/2026-04-22-modules-task-lists.md](docs/plans/2026-04-22-modules-task-lists.md)

## Relationship to `../theme`

The theme repo is a **UI reference prototype**. We ported its design system (CSS tokens + shadcn primitives + hooks + contexts) and walk it forward here against the live backend. No runtime dependency on the theme repo.
