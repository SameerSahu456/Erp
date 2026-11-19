import type { LucideIcon } from 'lucide-react'

import type { ReportCategory, ReportDefinition } from '../types'

import { DIRECTOR_CATEGORY } from './catalog/director'
import { FINANCE_CATEGORY } from './catalog/finance'
import { INVENTORY_CATEGORY } from './catalog/inventory'
import { OPERATIONS_CATEGORY } from './catalog/operations'
import { PURCHASE_CATEGORY } from './catalog/purchase'
import { RENTALS_CATEGORY } from './catalog/rentals'
import { SALES_CATEGORY } from './catalog/sales'
import { TAX_CATEGORY } from './catalog/tax'
import { TEAM_CATEGORY } from './catalog/team'

/** Every report the Reports Center offers, grouped by business area. Order is
 *  the order shown in the navigation. */
export const REPORT_CATEGORIES: readonly ReportCategory[] = [
  DIRECTOR_CATEGORY,
  SALES_CATEGORY,
  PURCHASE_CATEGORY,
  INVENTORY_CATEGORY,
  OPERATIONS_CATEGORY,
  FINANCE_CATEGORY,
  TAX_CATEGORY,
  RENTALS_CATEGORY,
  TEAM_CATEGORY,
]

export interface ReportEntry extends ReportDefinition {
  categoryId: string
  categoryLabel: string
  categoryIcon: LucideIcon
  /** 1-based position inside its business area, for "Report 3 of 14". */
  position: number
  categorySize: number
}

export const ALL_REPORTS: readonly ReportEntry[] = REPORT_CATEGORIES.flatMap((c) =>
  c.reports.map((r, i) => ({
    ...r,
    categoryId: c.id,
    categoryLabel: c.label,
    categoryIcon: c.icon,
    position: i + 1,
    categorySize: c.reports.length,
  })),
)

const BY_ID = new Map<string, ReportEntry>(ALL_REPORTS.map((r) => [r.id, r]))

/** Shown when the page opens with no `?report=` param. */
export const DEFAULT_REPORT_ID = SALES_CATEGORY.reports[0].id

export const isReportId = (v: string | null | undefined): v is string => !!v && BY_ID.has(v)

export const findReport = (id: string): ReportEntry | undefined => BY_ID.get(id)

/** Case-insensitive match on label, description or category. Empty query →
 *  everything. Categories with no match are dropped so the nav stays short. */
export function searchReports(query: string): ReportCategory[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...REPORT_CATEGORIES]
  return REPORT_CATEGORIES.map((c) => ({
    ...c,
    reports: c.reports.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        c.label.toLowerCase().includes(q),
    ),
  })).filter((c) => c.reports.length > 0)
}
