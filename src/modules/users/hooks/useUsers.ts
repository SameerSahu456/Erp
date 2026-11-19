import { useCallback, useMemo } from "react"
import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { API, PAGINATION, UI } from "@/shared/constants"
import { pinSelected, useDebounce, useOpenSnapshot } from "@/shared/hooks"

import {
  activateUser,
  createRole,
  createUser,
  deactivateUser,
  deleteUser,
  fetchPermissions,
  fetchRoles,
  fetchRolePermissions,
  fetchUser,
  fetchUsers,
  getUserDisplayName,
  replaceManagerRoles,
  replaceRolePermissions,
  replaceUserRoles,
  resetUserPassword,
  updateRole,
  updateUser,
} from "../api"
import type {
  CreateRolePayload,
  CreateUserPayload,
  FetchUsersParams,
  ReplaceManagerRolesPayload,
  ReplaceRolePermissionsPayload,
  ReplaceUserRolesPayload,
  ResetUserPasswordPayload,
  UserDetail,
  UserListItem,
  UpdateRolePayload,
  UpdateUserPayload,
} from "../types"
import { FIRST_PAGE, nextPage } from "@/shared/api/pagination"

// Query keys split into structural levels so mutations can invalidate
// precisely. `invalidateQueries({ queryKey: USERS_LIST })` only refetches
// list queries, NOT the detail query — and vice versa. See Coding-guideline
// §16.9 (targeted invalidation).
const USERS_LIST = ["users", "list"] as const
const USERS_DETAIL = ["users", "detail"] as const
const USERS_OPTIONS = ["users", "options"] as const
const USERS_OPTIONS_BY_ROLES = ["users", "options-by-roles"] as const
// Roles lives at a sibling top-level key — NOT under ["users", …] — because
// any prefix-match invalidate on ["users"] would otherwise refetch the
// (rarely-changing) role list on every user CRUD.
const ROLES_KEY = ["roles"] as const
const ROLES_INFINITE_KEY = ["roles", "infinite"] as const
// Server-paginated key for the settings → Roles management table.
// Distinct level under ["roles"] so mutations can refetch the active page
// (and the flat ROLES_KEY dropdown) without touching infinite-scroll caches
// used elsewhere.
const ROLES_PAGE_KEY = ["roles", "page"] as const
const PERMISSIONS_PAGE_KEY = ["permissions", "page"] as const
const PERMISSIONS_INFINITE_KEY = ["permissions", "infinite"] as const
const ROLE_PERMISSIONS_KEY = ["roles", "permissions"] as const
const ROLE_PERMISSIONS_INFINITE_KEY = ["roles", "permissions", "infinite"] as const

// Infinite-scroll variant for dropdown pickers (Coding-guideline §16.11).
// Page size = `PAGINATION.DEFAULT_PAGE_SIZE`. Gated by `enabled` so callers
// can defer the first fetch until the popover opens. Search is debounced
// and sent to the backend so role pickers stay API-driven.
//
// `scope` gives a caller its OWN cache entry. Without it every caller with the
// same search shares one cache, so a caller that pulls every page (e.g. the
// user form's role lookup) leaves a dropdown elsewhere opening with all pages
// already loaded — no first-page-then-scroll behaviour. Still under
// ROLES_INFINITE_KEY, so role mutations invalidate every scope together.
export function useRolesInfinite(
  options: { enabled?: boolean; search?: string; scope?: string } = {},
) {
  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE
  const search = useDebounce(options.search?.trim() ?? "", UI.DEBOUNCE_SEARCH_MS)
  const scope = options.scope
  return useInfiniteQuery({
    queryKey: [...ROLES_INFINITE_KEY, { pageSize, search, ...(scope ? { scope } : {}) }] as const,
    queryFn: ({ pageParam }) =>
      fetchRoles({ page: pageParam, page_size: pageSize, search: search || undefined }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
    staleTime: API.STALE_TIME_MS,
    enabled: options.enabled ?? true,
  })
}

export function useUsers(
  params: FetchUsersParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...USERS_LIST, params],
    queryFn: () => fetchUsers(params),
    staleTime: API.STALE_TIME_MS,
    enabled: options?.enabled ?? true,
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: [...USERS_DETAIL, id],
    queryFn: () => fetchUser(id),
    enabled: !!id,
    staleTime: API.STALE_TIME_MS,
  })
}

// Batch-fetch several user detail records by id, sharing the same
// USERS_DETAIL cache as `useUser`. For forms that hold multiple user
// references (e.g. an account's owners) and need each user's `channel_tags`
// (and roles) for validation — the list/options endpoints don't return those
// per picked row. Returns id → channel_tags and id → roles maps plus a
// combined loading flag.
export function useUsersByIds(ids: string[]) {
  const results = useQueries({
    // Per §6.5.1: inherit the global QueryClient defaults (staleTime/refetch);
    // only `queryKey`/`queryFn`/`enabled` are set per-call. Shares the
    // USERS_DETAIL cache with `useUser`.
    queries: ids.map((id) => ({
      queryKey: [...USERS_DETAIL, id],
      queryFn: () => fetchUser(id),
      enabled: !!id,
    })),
  })
  const channelTagsById: Record<string, string[] | null> = {}
  const rolesById: Record<string, string[]> = {}
  // Resolved display name per id — lets callers render a "by {name}" label
  // for a list of user ids (e.g. SO "Submitted By") without an N+1 of single
  // useUser() calls; shares the USERS_DETAIL cache.
  const displayNameById: Record<string, string> = {}
  // Full fetched record per id — lets a dropdown render a selected row that
  // sits on a page the picker has not loaded yet.
  const usersById: Record<string, UserDetail> = {}
  results.forEach((r, i) => {
    if (r.data) {
      usersById[ids[i]] = r.data
      channelTagsById[ids[i]] = r.data.channel_tags
      rolesById[ids[i]] = r.data.roles
      displayNameById[ids[i]] = getUserDisplayName(r.data)
    }
  })
  return {
    channelTagsById,
    rolesById,
    displayNameById,
    usersById,
    isLoading: results.some((r) => r.isLoading),
  }
}

/**
 * Rows for a user multi-select dropdown with the SELECTED users first.
 *
 * The option list is paginated, so a selected user may sit on a page that has
 * not loaded — pinning only the loaded ones would float some selections and
 * miss the rest. This resolves every selected id (as of when the dropdown
 * opened — see `useOpenSnapshot`): the loaded row when the page has it,
 * otherwise a cached by-id fetch. The paged list follows without the pinned
 * rows, so infinite scroll continues unchanged beneath them.
 */
export function usePinnedUserRows<
  T extends Pick<UserListItem, "id" | "first_name" | "last_name" | "email">,
>({
  open,
  selectedIds,
  loaded,
  search,
}: {
  open: boolean
  selectedIds: string[]
  loaded: T[]
  /** Active (debounced) search term — narrows the pinned block client-side. */
  search: string
}): T[] {
  const key = useOpenSnapshot(open, selectedIds.join(","))
  const pinnedIds = useMemo(() => (key ? key.split(",") : []), [key])
  const missingIds = useMemo(() => {
    const loadedIds = new Set(loaded.map((u) => u.id))
    return pinnedIds.filter((id) => !loadedIds.has(id))
  }, [pinnedIds, loaded])
  const { usersById } = useUsersByIds(open ? missingIds : [])
  const q = search.trim().toLowerCase()
  return pinSelected(
    loaded,
    pinnedIds,
    (id) => usersById[id] as unknown as T | undefined,
    (u) =>
      !q ||
      getUserDisplayName(u).toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q),
  )
}

// API-backed picker hook for user dropdowns (assignees, presales managers,
// BDEs). Mirrors `useOEMOptions` per Coding-guideline §16.11: server-paginated
// via page/page_size, debounced search sent as a query param, page size from
// PAGINATION constants — never a magic literal.
export function useUserOptions(
  rawSearch: string,
  filters: {
    role?: string
    role_names?: string[]
    /**
     * Filter to users who hold at least one role with this id. Used by the
     * manager picker when the subject's role has `allowed_manager_role_ids`
     * configured — the backend enforces the rule on save, the picker uses it
     * to pre-filter so the admin sees only valid choices.
     */
    role_ids?: number[]
    /**
     * Exclude users who hold ANY of these roles. Negative counterpart to
     * `role_names` — used by the Account Owner picker so the dropdown
     * shows every eligible owner except presales/BDE flavours. Both can
     * be combined; backend AND-s the include and exclude clauses.
     */
    exclude_role_names?: string[]
    /**
     * Optional channel-tag scope filter. When non-empty, only users whose
     * roles' `channel_tags` overlap with this list appear in the dropdown.
     * Used by the Account Owner picker so the visible owners match the
     * Account's `account_type` ("End Customer" | "Channel Partner" |
     * "Cloud / Data Center"). Wraps the backend `?channel_tags=` query.
     */
    channel_tags?: string[]
    is_active?: boolean
    /**
     * Transitive org-chart subtree filter — see FetchUsersParams.manager_id.
     * When set, only users who report (directly or transitively) to this
     * manager appear in the dropdown. The manager themselves is NOT included,
     * so callers that want "self + reports" must OR the actor id on the FE.
     * Used by the Sale Targets "set target for a team member" picker to scope
     * non-admin users to their own hierarchy.
     */
    manager_id?: string
  } = {},
  options?: { enabled?: boolean },
) {
  const search = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS)
  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE

  // Sort role_names / role_ids so reordering at the call site doesn't change
  // the cache key — the backend filter is set-equality on the role list.
  const roleNames = filters.role_names && filters.role_names.length > 0
    ? [...filters.role_names].sort()
    : undefined

  const roleIds = filters.role_ids && filters.role_ids.length > 0
    ? [...filters.role_ids].sort((a, b) => a - b)
    : undefined

  const excludeRoleNames =
    filters.exclude_role_names && filters.exclude_role_names.length > 0
      ? [...filters.exclude_role_names].sort()
      : undefined

  const channelTags = filters.channel_tags && filters.channel_tags.length > 0
    ? [...filters.channel_tags].sort()
    : undefined

  // Dropdown defaults to active users only; pass `is_active: false` for the
  // inactive bucket or `is_active: undefined` (admin views) to see all.
  const isActive = filters.is_active ?? true

  return useInfiniteQuery({
    queryKey: [
      ...USERS_OPTIONS,
      {
        search,
        role: filters.role,
        role_names: roleNames,
        role_ids: roleIds,
        exclude_role_names: excludeRoleNames,
        channel_tags: channelTags,
        is_active: isActive,
        manager_id: filters.manager_id ?? null,
      },
    ],
    queryFn: ({ pageParam }) =>
      fetchUsers({
        page: pageParam,
        page_size: pageSize,
        search: search || undefined,
        role: filters.role,
        role_names: roleNames,
        role_ids: roleIds,
        exclude_role_names: excludeRoleNames,
        channel_tags: channelTags,
        is_active: isActive,
        manager_id: filters.manager_id,
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
    staleTime: API.STALE_TIME_MS,
    enabled: options?.enabled ?? true,
  })
}

// Lazy, role-filtered list for combobox dropdowns. Mirrors `useUserOptions`
// shape (infinite-paginated) so callers can scroll-to-load more rows per
// §16.11. Gate with `enabled` so the request only fires when the dropdown
// opens; the cache key includes the role-name set so different dropdowns
// (assignees / presales / BDEs) don't collide.
//
// Role-name list is sorted before keying so reorderings at the call site
// don't fragment the cache.
export function useUserOptionsByRoles(
  roleNames: string[],
  options: {
    enabled?: boolean
    isActive?: boolean
    search?: string
    limit?: number
    /**
     * Channel-tag scope filter. When non-empty, only users whose roles'
     * `channel_tags` overlap with this list appear. Used by the CRM
     * Lead/Deal forms so the BDE / Assigned-To pickers are scoped to the
     * selected `channel_type` ("End Customer" | "Channel Partner" |
     * "Cloud / Data Center"). Wraps the backend `?channel_tags=` query.
     */
    channelTags?: string[]
    /**
     * Exclude users who hold ANY of these roles. Negative counterpart to
     * the `roleNames` positional arg — pass `roleNames: []` plus a
     * non-empty `excludeRoleNames` to express "every role except these".
     * The query is enabled when either include or exclude is non-empty.
     */
    excludeRoleNames?: string[]
  } = {},
) {
  const {
    enabled = true,
    isActive = true,
    search,
    limit = PAGINATION.DEFAULT_PAGE_SIZE,
    channelTags,
    excludeRoleNames,
  } = options
  const sortedRoleNames =
    roleNames.length > 0 ? [...roleNames].sort() : roleNames
  const sortedChannelTags =
    channelTags && channelTags.length > 0 ? [...channelTags].sort() : undefined
  const sortedExcludeRoleNames =
    excludeRoleNames && excludeRoleNames.length > 0
      ? [...excludeRoleNames].sort()
      : undefined
  return useInfiniteQuery({
    queryKey: [
      ...USERS_OPTIONS_BY_ROLES,
      {
        roleNames: sortedRoleNames,
        isActive,
        search,
        limit,
        channelTags: sortedChannelTags,
        excludeRoleNames: sortedExcludeRoleNames,
      },
    ],
    queryFn: ({ pageParam }) =>
      fetchUsers({
        role_names: sortedRoleNames,
        is_active: isActive,
        search: search || undefined,
        page: pageParam,
        page_size: limit,
        channel_tags: sortedChannelTags,
        exclude_role_names: sortedExcludeRoleNames,
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
    enabled:
      enabled &&
      (sortedRoleNames.length > 0 || (sortedExcludeRoleNames?.length ?? 0) > 0),
    staleTime: API.STALE_TIME_MS,
  })
}

// Reusable picker hook that PINS users holding `pinnedRoleNames` (e.g.
// admin / superadmin) to the TOP of a channel-tag-scoped user list — without
// a backend union.
//
// Why: `GET /users` AND-combines `channel_tags` + `role_names`, so a single
// call can't express "(tag match) OR (admin/superadmin)" (admins carry no
// channel_tags, so they'd be filtered out). When a channel tag is active we
// run TWO queries and stitch their pages together:
//   • pinned query — users in `pinnedRoleNames`, NOT channel-scoped, so they
//     always appear regardless of the selected tag (admins on top);
//   • scoped query — the normal channel-tag-filtered list, below them.
// When NO channel tag is active, only the scoped query runs (pinning is a
// no-op) — identical to the prior single-query behaviour.
//
// Consumers must dedupe the flattened rows by id (a user holding an admin role
// AND a tag-bearing role appears in both queries): `AsyncSelect` already does;
// other consumers should keep the first occurrence so the pinned row stays on
// top. Returns the `useInfiniteQuery`-shaped object `AsyncSelect` / the CRM
// pickers expect.
export function useUserOptionsWithPinnedRoles(
  search: string,
  opts: {
    /** Roles pinned on top while a channel tag is active (e.g. admin/superadmin). */
    pinnedRoleNames: string[]
    /** Channel-tag scope for the main list. When empty/undefined, only the
     *  scoped (now-unfiltered) query runs and pinning is skipped. */
    channelTags?: string[]
    /** Roles to exclude from the scoped list (e.g. presales / BDE flavours). */
    excludeRoleNames?: string[]
    isActive?: boolean
    /** Gate both queries (e.g. `open` for load-on-open pickers). */
    enabled?: boolean
  },
) {
  const {
    pinnedRoleNames,
    channelTags,
    excludeRoleNames,
    isActive = true,
    enabled = true,
  } = opts
  const hasChannelScope = (channelTags?.length ?? 0) > 0

  // Main, channel-tag-scoped list (today's behaviour).
  const scoped = useUserOptions(
    search,
    {
      is_active: isActive,
      exclude_role_names: excludeRoleNames,
      channel_tags: channelTags,
    },
    { enabled },
  )

  // Pinned list — admins/superadmins, NOT channel-scoped and NOT excluded, so
  // they surface regardless of the tag. Only fired when a tag is active;
  // otherwise they already appear in `scoped`.
  const pinned = useUserOptionsByRoles(pinnedRoleNames, {
    enabled: enabled && hasChannelScope,
    isActive,
    search,
  })

  const data = useMemo(() => {
    if (!hasChannelScope) return scoped.data
    return {
      pages: [
        ...(pinned.data?.pages ?? []),
        ...(scoped.data?.pages ?? []),
      ],
    }
  }, [hasChannelScope, pinned.data, scoped.data])

  const fetchNextPage = useCallback(
    (options?: { cancelRefetch?: boolean }) => {
      // Exhaust the (tiny) pinned list first, then page through the scoped one.
      if (hasChannelScope && pinned.hasNextPage) return pinned.fetchNextPage(options)
      return scoped.fetchNextPage(options)
    },
    [hasChannelScope, pinned.hasNextPage, pinned.fetchNextPage, scoped.fetchNextPage],
  )

  return {
    data,
    isLoading: scoped.isLoading || (hasChannelScope && pinned.isLoading),
    isError: scoped.isError || (hasChannelScope && pinned.isError),
    // Forward the underlying error so a 403 renders the NoAccess view instead
    // of the generic "Failed to load" — whichever query failed wins.
    error: scoped.error ?? (hasChannelScope ? pinned.error : null),
    hasNextPage:
      (hasChannelScope && (pinned.hasNextPage ?? false)) ||
      (scoped.hasNextPage ?? false),
    isFetchingNextPage:
      scoped.isFetchingNextPage || (hasChannelScope && pinned.isFetchingNextPage),
    fetchNextPage,
  }
}

// Mutations write the freshly-returned `UserDetail` straight into the
// detail cache via `setQueryData` and only invalidate the list. This keeps
// the dialog from refetching the same row it just saved (the network tab
// previously showed 3 GET /users/{id} hits per save — one before the
// dialog closed plus two from prefix-matching invalidates).
//
// `useUserOptions` (dropdown picker) intentionally is NOT invalidated by
// edits to a single user — its data changes only when users appear or
// disappear (create/delete/activate). See §16.9.

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateUserPayload) => createUser(body),
    onSuccess: (created) => {
      qc.setQueryData([...USERS_DETAIL, created.id], created)
      void qc.invalidateQueries({ queryKey: USERS_LIST })
      void qc.invalidateQueries({ queryKey: USERS_OPTIONS })
      toast.success("User created")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create user")
    },
  })
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateUserPayload) => updateUser(id, body),
    onSuccess: (updated) => {
      qc.setQueryData([...USERS_DETAIL, id], updated)
      void qc.invalidateQueries({ queryKey: USERS_LIST })
      toast.success("User updated")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update user")
    },
  })
}

// Activate / deactivate live as separate endpoints on the backend (POST
// /users/{id}/activate, /deactivate). Expose as one hook keyed by `is_active`
// so the caller doesn't have to pick the right endpoint.
export function useToggleUserActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      is_active ? activateUser(id) : deactivateUser(id),
    onSuccess: (updated, { id, is_active }) => {
      qc.setQueryData([...USERS_DETAIL, id], updated)
      void qc.invalidateQueries({ queryKey: USERS_LIST })
      void qc.invalidateQueries({ queryKey: USERS_OPTIONS })
      toast.success(is_active ? "User activated" : "User deactivated")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update user status")
    },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: [...USERS_DETAIL, id] })
      void qc.invalidateQueries({ queryKey: USERS_LIST })
      void qc.invalidateQueries({ queryKey: USERS_OPTIONS })
      toast.success("User deleted")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete user")
    },
  })
}

export function useReplaceUserRoles(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ReplaceUserRolesPayload) => replaceUserRoles(id, body),
    onSuccess: (updated) => {
      qc.setQueryData([...USERS_DETAIL, id], updated)
      void qc.invalidateQueries({ queryKey: USERS_LIST })
      toast.success("Roles updated")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update roles")
    },
  })
}

export function useResetUserPassword(id: string) {
  return useMutation({
    mutationFn: (body: ResetUserPasswordPayload) => resetUserPassword(id, body),
    onSuccess: () => {
      toast.success("Password reset")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reset password")
    },
  })
}

// Server-paginated role list for the settings → Roles management table.
// 1-indexed `page` like the rest of the app (UserManagementPage, leads…);
// sent as page/page_size on the wire. Global QueryClient
// defaults own staleTime/retry/refetch — no per-hook overrides per §6.5.1.
export function useRolesPage({
  page,
  pageSize,
  search,
  enabled = true,
}: {
  page: number
  pageSize: number
  search?: string
  enabled?: boolean
}) {
  const debouncedSearch = useDebounce(search?.trim() ?? "", UI.DEBOUNCE_SEARCH_MS)
  const query = useQuery({
    queryKey: [...ROLES_PAGE_KEY, { page, pageSize, search: debouncedSearch }],
    queryFn: () =>
      fetchRoles({
        page,
        page_size: pageSize,
        search: debouncedSearch || undefined,
      }),
    enabled,
  })
  const items = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)
  return {
    items,
    total,
    totalPages,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
  }
}

export function usePermissionsInfinite(
  options: { enabled?: boolean; search?: string } = {},
) {
  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE
  const search = useDebounce(options.search?.trim() ?? "", UI.DEBOUNCE_SEARCH_MS)
  return useInfiniteQuery({
    queryKey: [...PERMISSIONS_INFINITE_KEY, { pageSize, search }] as const,
    queryFn: ({ pageParam }) =>
      fetchPermissions({
        page: pageParam,
        page_size: pageSize,
        search: search || undefined,
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
    staleTime: API.STALE_TIME_MS,
    enabled: options.enabled ?? true,
  })
}

export function useRolePermissionsInfinite(
  roleId: number,
  options?: { enabled?: boolean; pageSize?: number },
) {
  const pageSize = options?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE
  return useInfiniteQuery({
    queryKey: [...ROLE_PERMISSIONS_INFINITE_KEY, roleId, { pageSize }] as const,
    queryFn: ({ pageParam }) =>
      fetchRolePermissions(roleId, {
        page: pageParam,
        page_size: pageSize,
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
    staleTime: API.STALE_TIME_MS,
    enabled: (options?.enabled ?? true) && roleId > 0,
  })
}

// Role create + rename. Both mutations invalidate every cache backing the
// role surface — the paged management table AND the flat dropdown caches
// (`useRoles` / `useRolesInfinite`) — because a newly-created or renamed
// role must show up in user-form pickers immediately.
function invalidateRoleCaches(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ROLES_KEY })
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateRolePayload) => createRole(body),
    onSuccess: () => {
      invalidateRoleCaches(qc)
      toast.success("Role created")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create role")
    },
  })
}

// Hook name preserved for back-compat with existing callers; the
// underlying PATCH now also accepts `channel_tags`, so the toast wording
// is generic ("Role updated") instead of "Role renamed".
export function useUpdateRoleName(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateRolePayload) => updateRole(id, body),
    onSuccess: () => {
      invalidateRoleCaches(qc)
      toast.success("Role updated")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update role")
    },
  })
}

export function useReplaceRolePermissions(roleId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ReplaceRolePermissionsPayload) =>
      replaceRolePermissions(roleId, body),
    onSuccess: () => {
      invalidateRoleCaches(qc)
      void qc.invalidateQueries({ queryKey: [...ROLE_PERMISSIONS_KEY, roleId] })
      void qc.invalidateQueries({ queryKey: PERMISSIONS_PAGE_KEY })
      toast.success("Role permissions updated")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update role permissions")
    },
  })
}

export function useReplaceManagerRoles(roleId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ReplaceManagerRolesPayload) =>
      replaceManagerRoles(roleId, body),
    onSuccess: () => {
      invalidateRoleCaches(qc)
      toast.success("Manager roles updated")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update manager roles")
    },
  })
}
