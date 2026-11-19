import type { SalesOrderWire } from "../../../api"
import { SALES_ORDERS_STRINGS as S } from "../sales-orders.strings"

export function SoViewerBanner({ so }: { so: SalesOrderWire }) {
  // Viewer-context banner — surfaced when a role-restricted user is
  // seeing a filtered subset of lines.
  if (!so.viewer_context || so.viewer_context.lines_hidden === 0) return null

  return (
    <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-900/20 dark:text-amber-100">
      {S.detail.viewerBanner.viewingAs}
      <strong>{so.viewer_context.role}</strong>
      {S.detail.viewerBanner.hiddenSuffix(so.viewer_context.lines_hidden)}
    </div>
  )
}
