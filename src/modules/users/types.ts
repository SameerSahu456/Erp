import type { PageParams, PageResponse } from "@/shared/api/pagination"

// User types — mirror the backend `auth_schema.py` shapes 1:1 (snake_case
// preserved). The backend returns role names as lowercase strings
// (e.g. "sales", "presales", "admin"). Do not re-key to uppercase here —
// see Coding-guideline §6.7 mismatch #3.

// Compact nested manager view — backend `ManagerNested` schema. The
// detail/list responses ship `managers: ManagerNested[]` parallel to
// `manager_ids: string[]`. Soft-deleted managers stay in `manager_ids`
// but are filtered out of `managers`, so always render from `managers`.
export interface ManagerNested {
  id: string
  first_name: string
  last_name: string | null
  email: string
}

export interface UserListItem {
  id: string
  email: string
  first_name: string
  last_name: string | null
  is_active: boolean
  is_superuser: boolean
  last_login_at: string | null
  // 2026-05-19: single `manager_id` / `manager` removed; users can now
  // report to multiple managers. See Fields_changes.md §3.
  manager_ids: string[]
  managers: ManagerNested[]
  roles: string[]
  // 2026-05-25: effective channel-tag scope (union across the user's roles).
  // `null` = unrestricted (superuser, no roles, or any role has empty tags).
  // Used by Lead/Deal/Account forms to validate the picked user still matches
  // the chosen channel type when it changes.
  channel_tags: string[] | null
  // 2026-07-16: yearly sales target. `null` = no target set.
  //
  // A decimal STRING, not a number (backend `DecimalAsString`). The column is
  // NUMERIC(18, 2), which reaches past JS's 2^53 exact-integer range — a
  // stored 9090909090909105 came back as ...104 when this was a JSON number.
  // Keep it a string end-to-end: bind it straight to inputs and format it with
  // Intl.NumberFormat (which takes a decimal string). Do NOT call Number() on
  // it — that reintroduces exactly the rounding this avoids.
  //
  // `previous_target` is detail-only — see `UserDetail`.
  current_target: string | null
}

export interface UserDetail extends UserListItem {
  phone: string | null
  employee_id: string | null
  department: string | null
  designation: string | null
  location: string | null
  branch: string | null
  mfa_enabled: boolean
  permissions: string[]
  // Server-owned history: the backend rolls the outgoing `current_target` into
  // this whenever a NEW target is saved. Read-only — deliberately absent from
  // every payload type below so the FE can't desync it. `null` = no target has
  // ever been replaced. Decimal string, same as `current_target`.
  previous_target: string | null
}

export interface UserStats {
  total: number
  active: number
  inactive: number
}

export interface PaginatedUsersResponse extends PageResponse<UserListItem> {
  stats: UserStats
}

export interface FetchUsersParams extends PageParams {
  search?: string
  role?: string
  role_names?: string[]
  role_ids?: number[]
  /** Exclude users who hold ANY of these role names. Applied after role_names. */
  exclude_role_names?: string[]
  /** Exclude users who hold ANY of these role ids. Applied after role_ids. */
  exclude_role_ids?: number[]
  /**
   * Return users who hold a role whose `channel_tags` contains ANY of these
   * values. Allow-list: "End Customer", "Channel Partner", "Cloud / Data Center", "End User".
   * Exact match — unrestricted users / superusers are NOT included.
   */
  channel_tags?: string[]
  is_active?: boolean
  /**
   * Transitive org-chart subtree filter — returns every user who reports
   * (directly or transitively) to the given manager via ``users.manager_ids``.
   * The manager themselves is NOT included; callers that want "self + reports"
   * must OR their own id into the result on the FE.
   */
  manager_id?: string
}

export interface CreateUserPayload {
  email: string
  password: string
  first_name: string
  last_name?: string | null
  phone?: string | null
  employee_id?: string | null
  department?: string | null
  designation?: string | null
  location?: string | null
  branch?: string | null
  // 2026-05-19: multi-manager. Reports-to chain — backend rejects
  // self-managing and cyclic chains (service-layer guard). Default `[]`,
  // max 10. All managers are equal — no primary manager.
  manager_ids?: string[]
  role_names: string[]
  is_superuser?: boolean
  // Yearly target. Nothing to roll on a brand-new user, so `previous_target`
  // starts null and is not accepted here.
  // `string` is accepted (and preferred) alongside `number`: the backend parses
  // a Decimal from either, and a string avoids the float round-trip that would
  // mangle values above JS's 2^53 exact-integer range. See UserFormDialog.
  // NOT nullable, unlike the PATCH counterpart below: `UserCreateRequest`
  // declares `number | string` with `default: "0"` and no null member, so an
  // explicit null is a 422. Omit the field or send '0' — never null.
  current_target?: number | string
}

export interface UpdateUserPayload {
  email?: string
  first_name?: string
  last_name?: string | null
  phone?: string | null
  employee_id?: string | null
  department?: string | null
  designation?: string | null
  location?: string | null
  branch?: string | null
  // 2026-05-19: multi-manager PATCH semantics
  //   • omit         → leave existing managers untouched
  //   • []           → clear all managers
  //   • [uuid1, ...] → REPLACE the entire set (not append)
  manager_ids?: string[]
  mfa_enabled?: boolean
  // Yearly target PATCH semantics — the backend rolls history off this field,
  // so the tri-state matters more here than anywhere else:
  //   • omit  → leave the target alone; `previous_target` is NOT rolled
  //   • null  → clear the target; old value rolls into `previous_target`
  //   • value → set the target; old value rolls into `previous_target`
  // Send it ONLY when it actually changed — re-sending the same number is
  // what the backend's change-guard defends against; don't lean on that.
  // Prefer a `string` — see the note on `CreateUserPayload.current_target`.
  current_target?: number | string | null
}

export interface ReplaceUserRolesPayload {
  role_names: string[]
}

export interface ResetUserPasswordPayload {
  new_password: string
}

// A role's record scope (RBAC-H2): `rental_orders` holds a user to rental
// records; `sales_team` to the requests on sales orders they (or their
// reporting team) can see. A user is held only when NO role they hold is `all`.
export type RoleDataScope = 'all' | 'rental_orders' | 'sales_team'

export interface Role {
  id: number
  name: string
  data_scope?: RoleDataScope
  // Lead/deal visibility scope (NOT NULL JSONB on backend, default '[]').
  // Empty array = no channel restriction. Allowed values are in
  // `src/constants/channel-tags.ts:CHANNEL_TAG_OPTIONS`.
  channel_tags: string[]
  // IDs of roles whose users are valid managers for someone holding this role.
  // Empty array = no rule (lane root / unconfigured — any manager accepted).
  // Set via PUT /api/v1/roles/{id}/manager-roles.
  allowed_manager_role_ids: number[]
}

export type PaginatedRolesResponse = PageResponse<Role>

export interface PermissionItem {
  id: number
  code: string
  description: string | null
}

export type PaginatedPermissionsResponse = PageResponse<PermissionItem>

// Role write surfaces — POST /roles + PATCH /roles/{id}. Response is the
// full RoleDetail (id + name + permission_codes). Backend rules mirrored in
// the FE Zod schema (RoleFormDialog): 2–50 chars, ^[a-z][a-z0-9 ]*$, ≤2
// digits total; normalised to lowercase + collapsed whitespace.
export interface RoleDetail {
  id: number
  name: string
  permission_codes: string[]
  channel_tags: string[]
  manager_role_ids: number[]
  data_scope?: RoleDataScope
}

export interface CreateRolePayload {
  name: string
  permission_codes?: string[]
  channel_tags?: string[]
  data_scope?: RoleDataScope
}

export interface UpdateRolePayload {
  // PATCH /roles/{id} — partial. Send only what's changing; either or
  // both fields, both optional. Empty body is a valid no-op.
  name?: string
  channel_tags?: string[]
  data_scope?: RoleDataScope
}

export interface ReplaceRolePermissionsPayload {
  permission_codes: string[]
}

export interface ReplaceManagerRolesPayload {
  // null = clear rule (any manager accepted); [] = explicit no managers; [id,...] = restricted set
  manager_role_ids: number[] | null
}
