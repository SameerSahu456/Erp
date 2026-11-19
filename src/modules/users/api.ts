// Thin typed wrappers over the admin user-management endpoints
// (`/api/v1/users/*`). All calls go through the shared axios `apiClient`
// which unwraps the `ApiResponse` envelope, so wrappers return the inner
// `data` shape — never the envelope.
//
// Verified live against the running backend (admin@comprint.com) on
// 2026-05-04. See `comprint-erp-backend/app/modules/auth/api/v1/admin_endpoints.py`.

import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import type { PageParams } from "@/shared/api/pagination"
import { PAGINATION } from "@/shared/constants"

import type {
  CreateRolePayload,
  CreateUserPayload,
  FetchUsersParams,
  PaginatedPermissionsResponse,
  PaginatedRolesResponse,
  PaginatedUsersResponse,
  ReplaceManagerRolesPayload,
  ReplaceRolePermissionsPayload,
  ReplaceUserRolesPayload,
  ResetUserPasswordPayload,
  RoleDetail,
  UpdateRolePayload,
  UpdateUserPayload,
  UserDetail,
  UserListItem,
} from "./types"

export async function fetchUsers(
  params: FetchUsersParams = {},
): Promise<PaginatedUsersResponse> {
  // The backend has no `role` param — it filters on `role_names` (a list).
  // Fold the single-select `role` slug into `role_names` so the UI's
  // single-role filter and multi-select callers share one backend param.
  const roleNames = [
    ...(params.role ? [params.role] : []),
    ...(params.role_names ?? []),
  ]
  return apiClient.get<PaginatedUsersResponse>(endpoints.users.list, {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      search: params.search?.trim() || undefined,
      role_names: roleNames.length ? roleNames : undefined,
      role_ids: params.role_ids?.length ? params.role_ids : undefined,
      exclude_role_names: params.exclude_role_names?.length
        ? params.exclude_role_names
        : undefined,
      exclude_role_ids: params.exclude_role_ids?.length
        ? params.exclude_role_ids
        : undefined,
      channel_tags: params.channel_tags?.length ? params.channel_tags : undefined,
      is_active: params.is_active,
      manager_id: params.manager_id || undefined,
    },
  })
}

export async function fetchUser(id: string): Promise<UserDetail> {
  return apiClient.get<UserDetail>(endpoints.users.detail(id))
}

export async function createUser(body: CreateUserPayload): Promise<UserDetail> {
  return apiClient.post<UserDetail>(endpoints.users.list, body)
}

export async function updateUser(
  id: string,
  body: UpdateUserPayload,
): Promise<UserDetail> {
  return apiClient.patch<UserDetail>(endpoints.users.detail(id), body)
}

export async function activateUser(id: string): Promise<UserDetail> {
  return apiClient.post<UserDetail>(`${endpoints.users.detail(id)}/activate`)
}

export async function deactivateUser(id: string): Promise<UserDetail> {
  return apiClient.post<UserDetail>(`${endpoints.users.detail(id)}/deactivate`)
}

export async function deleteUser(id: string): Promise<void> {
  return apiClient.delete<void>(endpoints.users.detail(id))
}

export async function replaceUserRoles(
  id: string,
  body: ReplaceUserRolesPayload,
): Promise<UserDetail> {
  return apiClient.put<UserDetail>(`${endpoints.users.detail(id)}/roles`, body)
}

export async function resetUserPassword(
  id: string,
  body: ResetUserPasswordPayload,
): Promise<void> {
  return apiClient.post<void>(`${endpoints.users.detail(id)}/reset-password`, body)
}

// Accepts any object with the three name/email fields — UserListItem,
// UserDetail, and ManagerNested all satisfy this shape.
export function getUserDisplayName(user: {
  first_name?: string | null
  last_name?: string | null
  email: string
}): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim()
  return name || user.email
}

export async function fetchRoles(
  params: PageParams & { search?: string } = {},
): Promise<PaginatedRolesResponse> {
  return apiClient.get<PaginatedRolesResponse>("/api/v1/roles", {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      search: params.search?.trim() || undefined,
    },
  })
}

export async function createRole(body: CreateRolePayload): Promise<RoleDetail> {
  return apiClient.post<RoleDetail>("/api/v1/roles", body)
}

export async function updateRole(
  roleId: number,
  body: UpdateRolePayload,
): Promise<RoleDetail> {
  return apiClient.patch<RoleDetail>(`/api/v1/roles/${roleId}`, body)
}

export async function fetchPermissions(
  params: PageParams & { search?: string } = {},
): Promise<PaginatedPermissionsResponse> {
  return apiClient.get<PaginatedPermissionsResponse>("/api/v1/permissions", {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      search: params.search?.trim() || undefined,
    },
  })
}

export async function fetchRolePermissions(
  roleId: number,
  params: PageParams = {},
): Promise<PaginatedPermissionsResponse> {
  return apiClient.get<PaginatedPermissionsResponse>(`/api/v1/roles/${roleId}/permissions`, {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
    },
  })
}

export async function replaceRolePermissions(
  roleId: number,
  body: ReplaceRolePermissionsPayload,
): Promise<RoleDetail> {
  return apiClient.put<RoleDetail>(`/api/v1/roles/${roleId}/permissions`, body)
}

export async function replaceManagerRoles(
  roleId: number,
  body: ReplaceManagerRolesPayload,
): Promise<RoleDetail> {
  return apiClient.put<RoleDetail>(`/api/v1/roles/${roleId}/manager-roles`, body)
}
