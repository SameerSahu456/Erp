// Insight data layer — one deterministic "closed-revenue records" set that
// powers BOTH the dashboard widgets and their detail pages. Every widget
// aggregates these records; the detail page filters the SAME records through
// the shared filter bar, so a drill-down always ties back to the tile.
//
// This file is a BARREL. The layer is split by concern so no single module
// grows past the size limit (§14):
//
//   core.ts         — RevRecord + deterministic generation (dependency root)
//   filters.ts      — RevFilters + faceted filtering
//   aggregations.ts — ranked breakdowns, per-rep roll-ups, funnel, quotes
//   periods.ts      — period bucketing + the derived time series
//
// TEMPORARY — see the note in `seed.ts`. Phase 2 replaces the whole folder.

export * from './core'
export * from './filters'
export * from './aggregations'
export * from './periods'
