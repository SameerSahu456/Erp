import { lazy, Suspense } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { ErrorBoundary, ModuleErrorState } from "@shared/errors/ErrorBoundary"
import { AccessGuard } from "@shared/rbac"
import { Skeleton } from "@/components/ui/skeleton"

import { REPORT_ROLES } from "./constants/reports"

const ReportBuilderPage = lazy(() => import("./pages/ReportBuilderPage"))

function PageFallback() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

/** Mounted at `/reports/*`. The Report Builder renders at the index; any
 *  deeper path redirects back to it. */
export function ReportsRoutes() {
  return (
    <ErrorBoundary fallback={<ModuleErrorState module="Reports" />}>
      <AccessGuard rule={{ roles: REPORT_ROLES }} showReason>
        <Routes>
          <Route
            index
            element={
              <Suspense fallback={<PageFallback />}>
                <ReportBuilderPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/reports" replace />} />
        </Routes>
      </AccessGuard>
    </ErrorBoundary>
  )
}
