import type * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Typography } from "@/components/ui/typography"

import { CRM_SHARED_STRINGS } from "../crm-shared.strings"
import { BmtEmptyState } from "./BmtEmptyState"
import { CellTooltip } from "../CellTooltip"
import { renderCellContent } from "./renderCellContent"
import type { CrmDataTableController } from "./useCrmDataTable"
import type { CellFormatter, EmptyStateConfig } from "./types"

// Sort-direction glyphs. Not user-facing copy — purely decorative indicators
// hoisted to module scope so the literal-string lint doesn't flag them in JSX.
const SORT_GLYPH = { asc: "↑", desc: "↓", none: "↕" } as const

interface CrmTableGridProps {
  controller: CrmDataTableController
  stickyHeader: boolean
  onRowClick?: (row: Record<string, unknown>) => void
  cellFormatter?: CellFormatter
  emptyNode?: React.ReactNode
  emptyState?: EmptyStateConfig
}

/** The table itself: header (sortable/filterable), body rows, loading + empty
 *  states. Pure presenter driven by the controller. */
export function CrmTableGrid({
  controller,
  stickyHeader,
  onRowClick,
  cellFormatter,
  emptyNode,
  emptyState,
}: CrmTableGridProps) {
  const {
    activeTabConfig,
    paginatedData,
    showIndexColumn,
    totalColumns,
    effectiveCurrentPage,
    effectivePageSize,
    effectiveSortColumn,
    effectiveSortDirection,
    handleSort,
    showLoadingState,
    effectiveSearch,
    effectiveColumnFilters,
    toolbarFiltersActive,
    handleClearAllFilters,
  } = controller

  if (showLoadingState) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <Typography variant="body" tone="muted" className="mt-3">
          {CRM_SHARED_STRINGS.dataTable.loadingData}
        </Typography>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto no-scrollbar">
      <table className="cpt-tbl">
        <thead className={cn(stickyHeader && "sticky top-0 z-10")}>
          <tr>
            {showIndexColumn && (
              <th className="text-center" style={{ width: 64 }}>
                {CRM_SHARED_STRINGS.dataTable.srNo}
              </th>
            )}
            {activeTabConfig?.columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  col.align === "right" && "right",
                  col.align === "center" && "text-center",
                  col.label === "" && "w-0",
                  col.truncate && "cpt-cell-truncate",
                )}
                style={{
                  cursor: col.sortable ? "pointer" : undefined,
                  width: col.width,
                  // Truncated columns cap at `width` so a long value can't
                  // stretch the column past it (keeps the header aligned with
                  // the ellipsized body cells below).
                  maxWidth: col.truncate ? col.width : undefined,
                  // Inline text-align so center/right header labels win over
                  // `.cpt-tbl thead th { text-align: left }` (a class selector
                  // the Tailwind `text-center` utility can't outrank).
                  textAlign: col.align,
                }}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                {col.headerHelp ? (
                  <CellTooltip text={col.headerHelp} className="inline">
                    {col.label}
                  </CellTooltip>
                ) : (
                  col.label
                )}
                {col.sortable && (
                  <span
                    className={cn(
                      "ml-1 text-[10px] transition-opacity",
                      effectiveSortColumn === col.key ? "opacity-80" : "opacity-30",
                    )}
                    aria-hidden
                  >
                    {effectiveSortColumn === col.key && effectiveSortDirection === "asc"
                      ? SORT_GLYPH.asc
                      : effectiveSortColumn === col.key && effectiveSortDirection === "desc"
                        ? SORT_GLYPH.desc
                        : SORT_GLYPH.none}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedData.length > 0 ? (
            paginatedData.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={onRowClick ? { cursor: "pointer" } : undefined}
                className={onRowClick ? "hover:bg-accent/50 transition-colors" : undefined}
              >
                {showIndexColumn && (
                  <td className="text-center tabular-nums text-muted-foreground">
                    {effectiveCurrentPage * effectivePageSize + rowIdx + 1}
                  </td>
                )}
                {activeTabConfig?.columns.map((col) => {
                  const value = row[col.key]
                  const formatted = cellFormatter ? cellFormatter(value, col.key, row) : null
                  const rendered =
                    formatted?.display !== undefined
                      ? formatted.display
                      : value != null
                        ? String(value)
                        : ""
                  const isBarcodeCol = col.key === "barcode" && value != null && value !== ""
                  const model = (row.model ?? row.deviceModel) as string | undefined
                  const serial = (row.serialNumber ?? row.serial) as string | undefined
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        col.align === "right" && "right",
                        col.align === "center" && "text-center",
                        col.label === "" && "w-0",
                        col.truncate && "cpt-cell-truncate",
                        formatted?.className,
                      )}
                      style={col.truncate ? { maxWidth: col.width } : undefined}
                      // No native `title` here — plain string/number cells get the
                      // styled tooltip from `renderCellContent`.
                    >
                      {renderCellContent(value, rendered, isBarcodeCol, model, serial)}
                    </td>
                  )
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={totalColumns} className="px-0 py-0">
                {emptyNode ?? (
                  <BmtEmptyState
                    filtered={
                      effectiveSearch.trim() !== "" ||
                      Object.keys(effectiveColumnFilters).length > 0 ||
                      toolbarFiltersActive
                    }
                    onClearFilters={handleClearAllFilters}
                    config={emptyState}
                  />
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
