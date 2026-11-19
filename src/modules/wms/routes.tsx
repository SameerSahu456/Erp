import { Route, Routes } from "react-router-dom"

import { ErrorBoundary, ModuleErrorState } from "@shared/errors/ErrorBoundary"
import { EmptyState } from "@/components/common/feedback/EmptyState"

import { WMS_ACCESS_STRINGS } from "./components/access/access.strings"
import { hiddenRoutes } from "./routes/hidden"
import { outwardRoutes } from "./routes/outward"
import { returnRoutes } from "./routes/returns"
import { inwardRoutes } from "./routes/inward"
import { operationsRoutes } from "./routes/operations"
import { mastersRoutes } from "./routes/masters"

/** WMS routes. Area files are CALLED (not rendered): <Routes> only accepts <Route> children. */
export function WmsRoutes() {
  return (
    <ErrorBoundary fallback={<ModuleErrorState module="WMS" />}>
      {/* `wms-search-scope` is a layout-transparent (display:contents) hook that
          caps every WMS list/table search box at one consistent width (the
          Material Issue reference, 20rem) instead of letting it stretch to fill
          the toolbar. One place, every current and future WMS page. */}
      <div className="wms-search-scope">
        <Routes>
          {hiddenRoutes()}
          {outwardRoutes()}
          {returnRoutes()}
          {inwardRoutes()}
          {operationsRoutes()}
          {mastersRoutes()}
          {/* Unknown /wms/* paths render a not-found state, never a blank page. */}
          <Route
            path="*"
            element={
              <EmptyState
                title={WMS_ACCESS_STRINGS.pageNotFoundTitle}
                description={WMS_ACCESS_STRINGS.pageNotFound}
              />
            }
          />
        </Routes>
      </div>
    </ErrorBoundary>
  )
}
