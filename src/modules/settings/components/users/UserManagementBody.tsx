import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Ban, CheckCircle2, History, KeyRound, Pencil, Plus, Trash2, UserCheck, Users, UserX, X } from 'lucide-react'

import { USERS_STRINGS } from './users.strings'

import { PageHeader } from '@/components/page-shells'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { StatsRow } from '@/components/common/display/StatsRow'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { OverflowPillList } from '@/components/common/display/OverflowPillList'
import { HoverTip } from '@/components/common/display/HoverTip'
import { TruncatedText } from '@/components/common/display/TruncatedText'
import { BusinessMetricsTable, type CellFormatter } from '@/components/common/tables/BusinessMetricsTable'
import { formatINRCompact } from '@/lib/currency'
import { PAGINATION, UI } from '@/shared/constants'
import { formatIST_date } from '@shared/lib/date'
import { useDebounce, usePageSizeParam } from '@/shared/hooks'
import { usePermission } from '@/shared/rbac/usePermission'
import { useAccess } from '@shared/rbac'
import {
  useDeleteUser,
  useToggleUserActive,
  useUsers,
  type UserListItem,
} from '@modules/users'

import { useRememberUsersListSearch } from '../../hooks/users/usersListHref'
import { ResetPasswordDialog } from '../../components/ResetPasswordDialog'
import { RolePicker } from '../../components/users/RolePicker'
import { UserFormDialog } from '../../components/users/UserFormDialog'
import { UserActivityLog } from './UserActivityLog'
import { USER_ACTIVITY_LOG_ACCESS } from './user-activity-access'
import { Typography } from '@/components/ui/typography'


export const USERS_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE
export const ALL = '__all__'

// Widths are declared, not left to the browser. `premium-table` is
// `table-layout: auto`, so an undeclared table hands ALL its leftover width to
// whichever columns happen to hold the longest text — here that meant NAME and
// EMAIL sprawling while ROLE→YEARLY TARGET bunched together, and the gaps
// shifting again as soon as someone had a longer email. Declaring a share per
// column makes the rhythm intentional and stable across pages.
//
// Shares total 100%. Identity columns get the room they need for real values
// (long names, long emails); the fixed-shape columns (status pill, a date, an
// amount, the 5 action icons) get just enough and no more.
export const columns = [
  { key: 'name', label: USERS_STRINGS.columns.name, sortable: true, width: '18%' },
  { key: 'email', label: USERS_STRINGS.columns.email, sortable: true, width: '22%' },
  { key: 'role', label: USERS_STRINGS.columns.role, width: '14%' },
  { key: 'status', label: USERS_STRINGS.columns.status, width: '10%' },
  { key: 'lastLogin', label: USERS_STRINGS.columns.lastLogin, sortable: true, width: '12%' },
  // Not sortable: the backend's list endpoint has no ordering param for it, and
  // a sort that silently only reorders the current page would lie.
  // Right-aligned per the money convention — amounts compare by their last
  // digit, and `premium-table .right` adds tabular-nums so they line up.
  { key: 'yearlyTarget', label: USERS_STRINGS.columns.yearlyTarget, align: 'right' as const, width: '12%' },
  { key: 'actions', label: USERS_STRINGS.columns.actions, align: 'right' as const, width: '12%' },
]

export interface Row extends Record<string, unknown> {
  id: string
  name: string
  email: string
  role: string
  status: 'Active' | 'Inactive'
  lastLogin: string
  yearlyTarget: string
  raw: UserListItem
}

export function toRow(user: UserListItem): Row {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email
  return {
    id: user.id,
    name,
    email: user.email,
    role: user.roles.join(', ') || '—',
    status: user.is_active ? 'Active' : 'Inactive',
    lastLogin: user.last_login_at ? formatIST_date(user.last_login_at) : '—',
    // `!= null` rather than a truthiness check: a target of 0 is a real,
    // deliberately-set value and must render as ₹0, not as "no target".
    // Compact (no decimals) keeps the column skimmable — targets are large
    // round numbers, and the exact paise live in the edit dialog.
    // The decimal string goes straight to the formatter; Number() would round
    // it past 2^53 (see `UserListItem.current_target`).
    yearlyTarget: user.current_target != null ? formatINRCompact(user.current_target) : '—',
    raw: user,
  }
}


export function UserManagementBody() {
  const navigate = useNavigate()
  // Remember this view (page / size / filters) so the detail page's back arrow
  // can return to it even after a refresh on the detail page.
  useRememberUsersListSearch()
  const [searchParams, setSearchParams] = useSearchParams()

  // Table page lives in the URL so browser-back (from a user detail page or the
  // activity sidebar's linked records) lands the user back on the same page.
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  // Rows per page — same URL-backed selector the Leads / Deals tables use
  // (`?users_size=`); changing it clears `?page` atomically.
  const [pageSize, setPageSize] = usePageSizeParam({
    key: 'users_size',
    defaultSize: USERS_PAGE_SIZE,
  })
  const setPage = (next: number) =>
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next <= 1) p.delete('page')
        else p.set('page', String(next))
        return p
      },
      { replace: true },
    )

  // Activity-log slide-over: the inspected user's id lives in the URL (`log`)
  // so the sheet — and its own paged state (`logPage`/`logTab`/…, owned by the
  // timeline) — reopens on back-navigation from a linked record. Its display
  // name (header copy only) is read back off the current page's rows.
  const activityUserId = searchParams.get('log')

  // Filters live in the URL too (`status` / `role` / `q`) so search, role and
  // status all survive back-navigation and a refresh — same contract as `page`.
  const statusParam = searchParams.get('status')
  const activeFilter: 'all' | 'active' | 'inactive' =
    statusParam === 'active' || statusParam === 'inactive' ? statusParam : 'all'
  const roleFilter = searchParams.get('role') ?? ALL
  // The search box stays local for a responsive input; its debounced value is
  // mirrored to `?q=` (see effect below). Seeded from the URL on first render.
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const debouncedSearch = useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null)
  const [resetTarget, setResetTarget] = useState<UserListItem | null>(null)

  // Mirrors the backend's superuser-only gate on POST /users/{id}/reset-password
  // — only superadmins see the reset action, so non-superusers never click a
  // button that would 403.
  const { isSuperuser } = usePermission()

  // Activity Log gate: superuser / admin roles / crm:user_log_read holders.
  // Hides the row action AND the sheet so a hand-typed `?log=` URL can't open
  // it either. Mirrors the backend activity-log permission (see the rule).
  const { hasAccess } = useAccess()
  const canViewActivity = hasAccess(USER_ACTIVITY_LOG_ACCESS)

  // Status / role setters write straight to the URL and reset the page (§16.7).
  const setActiveFilter = (next: 'all' | 'active' | 'inactive') =>
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === 'all') p.delete('status')
        else p.set('status', next)
        p.delete('page')
        return p
      },
      { replace: true },
    )
  const setRoleFilter = (next: string) =>
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === ALL) p.delete('role')
        else p.set('role', next)
        p.delete('page')
        return p
      },
      { replace: true },
    )

  // Mirror the debounced search into `?q=` and reset the page on a NEW term.
  //
  // "New" means: differs from what the URL already holds. This replaces a
  // "skip the first mount" flag, which StrictMode defeats — React keeps refs
  // across its simulated remount, so in dev the effect's second run was not
  // skipped and it deleted `?page=` every time the list mounted (so coming back
  // from a detail page, or refreshing, always landed on page 1). Comparing with
  // the URL is idempotent: a restored `?q=` equals the seeded search, so it's a
  // no-op however many times the effect runs.
  //
  // `setSearchParams` / `searchParams` are NOT stable in react-router v7 (their
  // identity changes on every URL change), so they stay out of the dependency
  // array — read the latest off refs instead.
  const setSearchParamsRef = useRef(setSearchParams)
  const urlQueryRef = useRef(searchParams.get('q') ?? '')
  useEffect(() => {
    setSearchParamsRef.current = setSearchParams
    urlQueryRef.current = searchParams.get('q') ?? ''
  })
  useEffect(() => {
    if (debouncedSearch === urlQueryRef.current) return
    setSearchParamsRef.current(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (debouncedSearch) p.set('q', debouncedSearch)
        else p.delete('q')
        p.delete('page')
        return p
      },
      { replace: true },
    )
  }, [debouncedSearch])

  const is_active =
    activeFilter === 'active' ? true : activeFilter === 'inactive' ? false : undefined

  const usersQuery = useUsers({
    page,
    page_size: pageSize,
    search: debouncedSearch || undefined,
    role: roleFilter !== ALL ? roleFilter : undefined,
    is_active,
  })

  const statusLabel =
    activeFilter === 'active'
      ? USERS_STRINGS.filters.active
      : activeFilter === 'inactive'
        ? USERS_STRINGS.filters.inactive
        : USERS_STRINGS.filters.allStatus

  const toggleActive = useToggleUserActive()
  const deleteUser = useDeleteUser()

  const rows: Row[] = useMemo(
    () => (usersQuery.data?.items ?? []).map(toRow),
    [usersQuery.data?.items],
  )

  // Sheet header copy — resolved from the row on the current page. Null until
  // the list query settles (harmless: the sheet just renders no subtitle).
  const activityUserName = useMemo(
    () => (activityUserId ? (rows.find((r) => r.id === activityUserId)?.name ?? null) : null),
    [activityUserId, rows],
  )

  // Open/close the activity sidebar by writing the `log*` params. Opening resets
  // the timeline's own paged params so a freshly opened sheet starts clean.
  const openActivity = (id: string) =>
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev)
      p.set('log', id)
      p.delete('logPage')
      p.delete('logTab')
      p.delete('logFrom')
      p.delete('logTo')
      return p
    })
  const closeActivity = () =>
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.delete('log')
        p.delete('logPage')
        p.delete('logTab')
        p.delete('logFrom')
        p.delete('logTo')
        return p
      },
      { replace: true },
    )

  const cellFormatter: CellFormatter = (value, key, row) => {
    const r = row as Row
    if (key === 'name') {
      // Primary link to the user detail page. stopPropagation so it doesn't also
      // trigger the row-click (which opens the edit dialog).
      return {
        display: (
          <Typography variant="body-strong" tone="primary" asChild>
            <button
              type="button"
              className="max-w-full truncate text-left hover:underline"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/settings/users/${r.id}`)
              }}
            >
              <TruncatedText value={String(value)} className="max-w-full" />
            </button>
          </Typography>
        ),
      }
    }
    if (key === 'email') {
      return { display: <TruncatedText value={String(value)} className="max-w-[260px]" /> }
    }
    if (key === 'role') {
      const roles = r.raw.roles ?? []
      // First role as a pill, the rest collapsed into a "+N" badge that reveals
      // every role on hover — the same overflow pattern the CRM tables use for
      // multi-value cells (see OverflowPillList).
      return {
        display: (
          <OverflowPillList
            items={roles}
            getItemLabel={(role) => role}
            hoverTitle={USERS_STRINGS.columns.role}
          />
        ),
      }
    }
    if (key === 'status') {
      return {
        display: (
          <StatusBadge variant={value === 'Active' ? 'success' : 'neutral'}>
            {String(value)}
          </StatusBadge>
        ),
      }
    }
    if (key === 'actions') {
      const toggleLabel = r.raw.is_active ? USERS_STRINGS.actions.deactivateUser : USERS_STRINGS.actions.activateUser
      return {
        display: (
          <TooltipProvider delay={150}>
            <div className="flex items-center justify-end gap-1">
              {canViewActivity && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openActivity(r.id)
                        }}
                        aria-label={USERS_STRINGS.actions.viewActivityLog}
                      >
                        <History className="size-3.5" />
                      </Button>
                    }
                  />
                  <TooltipContent>{USERS_STRINGS.actions.viewActivityLog}</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingUser(r.raw)
                        setDialogOpen(true)
                      }}
                      aria-label={USERS_STRINGS.actions.editUser}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  }
                />
                <TooltipContent>{USERS_STRINGS.actions.editUser}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleActive.mutate({ id: r.id, is_active: !r.raw.is_active })
                      }}
                      aria-label={toggleLabel}
                    >
                      {r.raw.is_active ? (
                        <Ban className="size-3.5" />
                      ) : (
                        <CheckCircle2 className="size-3.5" />
                      )}
                    </Button>
                  }
                />
                <TooltipContent>{toggleLabel}</TooltipContent>
              </Tooltip>
              {isSuperuser && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setResetTarget(r.raw)
                        }}
                        aria-label={USERS_STRINGS.actions.resetPassword}
                      >
                        <KeyRound className="size-3.5" />
                      </Button>
                    }
                  />
                  <TooltipContent>{USERS_STRINGS.actions.resetPassword}</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(USERS_STRINGS.actions.deleteConfirm(r.name))) deleteUser.mutate(r.id)
                      }}
                      aria-label={USERS_STRINGS.actions.deleteUser}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  }
                />
                <TooltipContent>{USERS_STRINGS.actions.deleteUser}</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        ),
      }
    }
    return null
  }

  // Stats come from the list response itself — the BE returns `stats:
  // {total, active, inactive}` alongside `items`, so no separate round-trip.
  // Counts respect the active filters (search, role, is_active).
  const apiStats = usersQuery.data?.stats
  const stats = [
    { label: USERS_STRINGS.stats.total, value: apiStats?.total ?? 0, icon: Users, accent: 'primary' as const },
    { label: USERS_STRINGS.stats.active, value: apiStats?.active ?? 0, icon: UserCheck, accent: 'success' as const },
    { label: USERS_STRINGS.stats.inactive, value: apiStats?.inactive ?? 0, icon: UserX, accent: 'warning' as const },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={USERS_STRINGS.page.title}
        subtitle={USERS_STRINGS.page.subtitle}
        actions={
          <Button
            onClick={() => {
              setEditingUser(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="mr-1.5 size-4" />
            {USERS_STRINGS.page.addUser}
          </Button>
        }
      />

      <StatsRow stats={stats} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-72">
          <HoverTip
            text={USERS_STRINGS.filters.filterTip(
              USERS_STRINGS.filters.searchLabel,
              search.trim() || USERS_STRINGS.filters.searchPlaceholder,
            )}
          >
          <Input
            placeholder={USERS_STRINGS.filters.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-outline-dark h-9 w-full pr-8"
          />
          </HoverTip>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label={USERS_STRINGS.filters.clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <Select value={activeFilter} onValueChange={(v) => setActiveFilter((v as typeof activeFilter) ?? 'all')}>
          {/* HoverTip is a full-width block; as a direct child of this wrapping
              flex toolbar it took the whole row and pushed Role onto the next
              line. A fixed-width box keeps the three controls on one row. */}
          <div className="w-36">
            <HoverTip text={USERS_STRINGS.filters.filterTip(USERS_STRINGS.filters.statusLabel, statusLabel)}>
              {/* `all` isn't the `__all__` sentinel ui/select treats as empty, so
                  without this it drew a ✕ on "All Status". Show the ✕ only
                  for a real choice; clearing returns to All. */}
              <SelectTrigger
                className="h-9 w-full"
                clearable={activeFilter !== 'all'}
                onClear={() => setActiveFilter('all')}
              >
                <SelectValue>{statusLabel}</SelectValue>
              </SelectTrigger>
            </HoverTip>
          </div>
          <SelectContent>
            <SelectItem value="all">{USERS_STRINGS.filters.allStatus}</SelectItem>
            <SelectItem value="active">{USERS_STRINGS.filters.active}</SelectItem>
            <SelectItem value="inactive">{USERS_STRINGS.filters.inactive}</SelectItem>
          </SelectContent>
        </Select>
        <div className="w-64">
          <RolePicker
            value={roleFilter === ALL ? null : roleFilter}
            onValueChange={(next) => setRoleFilter(next ?? ALL)}
          />
        </div>
      </div>

      <BusinessMetricsTable
        tabs={[{ id: 'users', label: USERS_STRINGS.tabs.users, columns, data: rows }]}
        cellFormatter={cellFormatter}
        pageSize={pageSize}
        searchable={false}
        onRowClick={(row) => navigate(`/settings/users/${(row as Row).id}`)}
        serverPagination={{
          page,
          pageSize,
          total: usersQuery.data?.total ?? 0,
          isFetching: usersQuery.isFetching,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
          pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
        }}
        emptyState={{
          title: usersQuery.isLoading ? USERS_STRINGS.table.loading : USERS_STRINGS.table.empty,
          description: usersQuery.isError
            ? usersQuery.error instanceof Error
              ? usersQuery.error.message
              : USERS_STRINGS.table.loadError
            : USERS_STRINGS.table.emptyDescription,
        }}
      />

      <UserFormDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o) setEditingUser(null)
        }}
        user={editingUser}
      />

      {resetTarget && (
        <ResetPasswordDialog
          open={!!resetTarget}
          onOpenChange={(o) => {
            if (!o) setResetTarget(null)
          }}
          userId={resetTarget.id}
          userName={toRow(resetTarget).name}
        />
      )}

      {canViewActivity && (
        <UserActivityLog
          userId={activityUserId}
          userName={activityUserName}
          open={activityUserId !== null}
          onOpenChange={(open) => {
            if (!open) closeActivity()
          }}
        />
      )}
    </div>
  )
}

