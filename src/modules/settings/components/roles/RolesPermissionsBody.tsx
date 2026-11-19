import { useEffect, useMemo, useState } from 'react'
import { UI } from "@/shared/constants"
import { KeyRound, Loader2, Pencil, Plus, Save, Search, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Typography } from '@/components/ui/typography'
import { PageHeader } from '@/components/page-shells'
import { TablePagination } from '@/components/common/tables/TablePagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PAGINATION } from '@/shared/constants'
import { useAuth } from '@/shared/auth/use-auth'
import { PermissionGuard } from '@/shared/rbac'
import {
  useReplaceRolePermissions,
  useRolePermissionsInfinite,
  useRolesPage,
  type Role,
} from '@modules/users'

import { PermissionCodeMultiSelect } from '../../components/roles/PermissionCodeMultiSelect'
import { RoleFormDialog } from '../../components/roles/RoleFormDialog'
import { settingsPermissions } from '../../permissions'
import { isSystemRoleName } from '../../constants'
import { ROLES_STRINGS } from './roles.strings'


export const ROLES_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE
export const ASSIGNED_ROLE_PERMISSIONS_PAGE_SIZE = 200

export interface RoleRow extends Record<string, unknown> {
  id: number
  name: string
  raw: Role
}

export function getRoleInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}


export function RolesPermissionsBody() {
  const [rolesPage, setRolesPage] = useState(1)
  const [rolesPageSize, setRolesPageSize] = useState<number>(ROLES_PAGE_SIZE)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [permissionsRole, setPermissionsRole] = useState<Role | null>(null)
  const [roleSearch, setRoleSearch] = useState('')

  const rolesQuery = useRolesPage({
    page: rolesPage,
    pageSize: rolesPageSize,
    search: roleSearch,
  })

  const roleRows: RoleRow[] = useMemo(
    () => rolesQuery.items.map((r) => ({ id: r.id, name: r.name, raw: r })),
    [rolesQuery.items],
  )

  useEffect(() => {
    setRolesPage(1)
  }, [roleSearch])

  return (
    <div className="space-y-6">
      <PageHeader
        className="pb-2"
        title={ROLES_STRINGS.page.title}
        subtitle={ROLES_STRINGS.page.subtitle}
        actions={
          <PermissionGuard required={settingsPermissions.ROLE_UPDATE}>
            <Button
              onClick={() => {
                setEditingRole(null)
                setDialogOpen(true)
              }}
            >
              <Plus className="mr-1.5 size-4" />
              {ROLES_STRINGS.page.addRole}
            </Button>
          </PermissionGuard>
        }
      />

      <Card>
        <CardHeader className="md:flex-row md:items-center md:justify-start">
          <div className="settings-list-search cpt-search-field focus-within:!shadow-none w-full md:max-w-md">
            <Search className="size-[14px] opacity-60" />
            <input
              placeholder={ROLES_STRINGS.directory.searchPlaceholder}
              maxLength={UI.FILTER_SEARCH_MAX_LENGTH}
              value={roleSearch}
              onChange={(e) => setRoleSearch(e.target.value)}
            />
            {roleSearch && (
              <button
                type="button"
                onClick={() => setRoleSearch('')}
                className="opacity-40 transition-opacity hover:opacity-70"
                aria-label={ROLES_STRINGS.directory.clearSearch}
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[260px]">{ROLES_STRINGS.table.headRole}</TableHead>
                  <TableHead className="min-w-[240px]">{ROLES_STRINGS.table.headAssignedPermissions}</TableHead>
                  <TableHead className="w-[220px] text-right">{ROLES_STRINGS.table.headActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolesQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-28 text-center text-sm text-muted-foreground">
                      {ROLES_STRINGS.table.loadingBody}
                    </TableCell>
                  </TableRow>
                ) : rolesQuery.isError ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-28 text-center">
                      <div className="space-y-1">
                        <p className="font-medium text-destructive">{ROLES_STRINGS.table.errorTitle}</p>
                        <Typography tone="muted">
                          {rolesQuery.error instanceof Error
                            ? rolesQuery.error.message
                            : ROLES_STRINGS.table.errorFallback}
                        </Typography>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : roleRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-28 text-center">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {roleSearch.trim() ? ROLES_STRINGS.table.emptyFiltered : ROLES_STRINGS.table.emptyDefault}
                        </p>
                        <Typography tone="muted">
                          {roleSearch.trim()
                            ? ROLES_STRINGS.table.emptyFilteredHint
                            : ROLES_STRINGS.table.emptyDefaultHint}
                        </Typography>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  roleRows.map((row) => {
                    const isSystemRole = isSystemRoleName(row.name)
                    // Defensive: older API responses (or system roles) may omit
                    // `allowed_manager_role_ids`; default to [] so the badge
                    // count never reads `.length` off undefined.
                    const managerRoleIds = row.raw.allowed_manager_role_ids ?? []

                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                              {getRoleInitials(row.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium">{row.name}</div>
                              <Typography asChild variant="helper"><div>
                                {ROLES_STRINGS.table.rowSubtitle}
                              </div></Typography>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="font-normal">
                              {ROLES_STRINGS.table.badgeManagedInModal}
                            </Badge>
                            {isSystemRole ? (
                              <Badge variant="outline" className="font-normal">
                                {ROLES_STRINGS.table.badgeSystemRole}
                              </Badge>
                            ) : null}
                            {row.raw.data_scope === 'rental_orders' ? (
                              <Badge variant="outline" className="font-normal">
                                {ROLES_STRINGS.table.badgeRentalOrdersOnly}
                              </Badge>
                            ) : null}
                            {row.raw.data_scope === 'sales_team' ? (
                              <Badge variant="outline" className="font-normal">
                                {ROLES_STRINGS.table.badgeSalesTeam}
                              </Badge>
                            ) : null}
                            <Badge variant="outline" className="font-normal">
                              {managerRoleIds.length === 0
                                ? 'Any manager'
                                : `${managerRoleIds.length} manager role${managerRoleIds.length === 1 ? '' : 's'}`}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPermissionsRole(row.raw)}
                            >
                              <KeyRound className="mr-1.5 size-3.5" />
                              {ROLES_STRINGS.table.actionPermissions}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingRole(row.raw)
                                setDialogOpen(true)
                              }}
                            >
                              <Pencil className="mr-1.5 size-3.5" />
                              {ROLES_STRINGS.table.actionEdit}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={rolesPage}
            totalPages={rolesQuery.totalPages}
            pageSize={rolesPageSize}
            total={rolesQuery.total}
            isFetching={rolesQuery.isFetching}
            onPageChange={setRolesPage}
            onPageSizeChange={(size) => {
              setRolesPageSize(size)
              setRolesPage(1)
            }}
            pageSizeOptions={PAGINATION.PAGE_SIZE_OPTIONS}
          />
        </CardContent>
      </Card>

      {/* Permission Matrix intentionally commented out.
          Real role-permission assignment now lives in the Roles Directory table above. */}

      <RoleFormDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o) setEditingRole(null)
        }}
        role={editingRole}
      />
      <RolePermissionsDialog
        role={permissionsRole}
        open={permissionsRole !== null}
        onOpenChange={(open) => {
          if (!open) setPermissionsRole(null)
        }}
      />
    </div>
  )
}

function RolePermissionsDialog({
  role,
  open,
  onOpenChange,
}: {
  role: Role | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())
  const [dirty, setDirty] = useState(false)

  const assignedQuery = useRolePermissionsInfinite(role?.id ?? 0, {
    enabled: open && !!role,
    pageSize: ASSIGNED_ROLE_PERMISSIONS_PAGE_SIZE,
  })
  const replaceMutation = useReplaceRolePermissions(role?.id ?? 0)
  const { user, refreshUser } = useAuth()

  useEffect(() => {
    if (!open || !assignedQuery.data || dirty) return
    const allAssigned = assignedQuery.data.pages.flatMap((page) => page.items)
    setSelectedCodes(new Set(allAssigned.map((item) => item.code)))
    setDirty(false)
  }, [assignedQuery.data, dirty, open])

  useEffect(() => {
    if (!open || !assignedQuery.hasNextPage || assignedQuery.isFetchingNextPage) return
    void assignedQuery.fetchNextPage()
  }, [
    assignedQuery.fetchNextPage,
    assignedQuery.hasNextPage,
    assignedQuery.isFetchingNextPage,
    open,
  ])

  const assignedItems = assignedQuery.data?.pages.flatMap((page) => page.items) ?? []
  const isSystemRole = isSystemRoleName(role?.name)

  function handleSelectionChange(next: string[]) {
    setSelectedCodes(new Set(next))
    setDirty(true)
  }

  async function handleSave() {
    if (!role) return
    await replaceMutation.mutateAsync({
      permission_codes: Array.from(selectedCodes).sort(),
    })
    // If the edited role belongs to the current user, refresh /auth/me so the
    // new permission set takes effect immediately instead of waiting for the
    // 30s background poll in AuthProvider.
    if (user?.roles?.includes(role.name)) {
      void refreshUser()
    }
    setDirty(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-semibold tracking-tight">
            {ROLES_STRINGS.permissionsDialog.title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-muted-foreground">
            {role
              ? ROLES_STRINGS.permissionsDialog.descriptionForRole(role.name)
              : ROLES_STRINGS.permissionsDialog.descriptionGeneric}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {ROLES_STRINGS.permissionsDialog.roleLabel}
                </p>
                <div className="text-sm font-medium text-foreground/85">{role?.name ?? ROLES_STRINGS.permissionsDialog.roleFallback}</div>
              </div>
              <Badge variant="secondary" className="font-normal">
                {ROLES_STRINGS.permissionsDialog.selectedCount(selectedCodes.size)}
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{ROLES_STRINGS.permissionsDialog.permissionsLabel}</span>
              {isSystemRole ? <Badge variant="outline">{ROLES_STRINGS.permissionsDialog.badgeSystemRoleLocked}</Badge> : null}
            </div>
            <PermissionCodeMultiSelect
              value={Array.from(selectedCodes)}
              onValueChange={handleSelectionChange}
              disabled={replaceMutation.isPending || isSystemRole || assignedQuery.isLoading}
            />
            {assignedQuery.isLoading ? (
              <Typography asChild variant="helper"><p>{ROLES_STRINGS.permissionsDialog.loadingAssigned}</p></Typography>
            ) : assignedQuery.isFetchingNextPage ? (
              <Typography asChild variant="helper"><p>{ROLES_STRINGS.permissionsDialog.loadingMoreAssigned}</p></Typography>
            ) : null}
          </div>

          <div className="rounded-lg border bg-background p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{ROLES_STRINGS.permissionsDialog.currentlyAssigned}</p>
              <Badge variant="secondary">{ROLES_STRINGS.permissionsDialog.codesCount(assignedItems.length)}</Badge>
            </div>
            {assignedQuery.isLoading ? (
              <Typography asChild tone="muted"><div>{ROLES_STRINGS.permissionsDialog.loadingAssignedBody}</div></Typography>
            ) : assignedItems.length === 0 ? (
              <Typography asChild tone="muted"><div>{ROLES_STRINGS.permissionsDialog.noPermissionsAssigned}</div></Typography>
            ) : (
              <div className="flex flex-wrap gap-2">
                {assignedItems.map((item) => (
                  <Badge key={item.code} variant="outline" className="font-normal">
                    {item.code}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={replaceMutation.isPending}
          >
            {ROLES_STRINGS.permissionsDialog.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!dirty || replaceMutation.isPending || isSystemRole || assignedQuery.isLoading}
          >
            {replaceMutation.isPending ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 size-3.5" />
            )}
            {ROLES_STRINGS.permissionsDialog.savePermissions}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

