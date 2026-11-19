import { lazy } from "react"
import { Route, Routes } from "react-router-dom"

import { ErrorBoundary, ModuleErrorState } from "@shared/errors/ErrorBoundary"
import { RouteGuard } from "@shared/rbac"

const ProfilePage = lazy(() => import("./pages/profile/ProfilePage"))
const UserManagementPage = lazy(
  () => import("./pages/users/UserManagementPage"),
)
const UserDetailPage = lazy(() => import("./pages/users/UserDetailPage"))
const RolesPermissionsPage = lazy(
  () => import("./pages/roles/RolesPermissionsPage"),
)
const AppSettingsPage = lazy(() => import("./pages/app/AppSettingsPage"))

export function SettingsRoutes() {
  return (
    <ErrorBoundary fallback={<ModuleErrorState module="Settings" />}>
      <Routes>
        <Route path="profile" element={<ProfilePage />} />
        <Route
          path="users"
          element={
            <RouteGuard superuserOnly>
              <UserManagementPage />
            </RouteGuard>
          }
        />
        <Route
          path="users/:id"
          element={
            <RouteGuard superuserOnly>
              <UserDetailPage />
            </RouteGuard>
          }
        />
        <Route
          path="roles"
          element={
            <RouteGuard superuserOnly>
              <RolesPermissionsPage />
            </RouteGuard>
          }
        />
        <Route
          path="app"
          element={
            <RouteGuard superuserOnly>
              <AppSettingsPage />
            </RouteGuard>
          }
        />
      </Routes>
    </ErrorBoundary>
  )
}
