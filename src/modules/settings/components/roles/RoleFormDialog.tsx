import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MultiSelect } from '@/components/ui/multi-select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Typography } from '@/components/ui/typography'
import { FieldError } from '@/components/common/forms/FieldError'
import { useFormErrors } from '@/hooks/use-form-errors'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CHANNEL_TAG_OPTIONS } from '@/constants/channel-tags'
import {
  useCreateRole,
  useReplaceManagerRoles,
  useRolesInfinite,
  useUpdateRoleName,
  type Role,
  type RoleDataScope,
} from '@modules/users'

import { isSystemRoleName } from '../../constants'
import { PermissionCodeMultiSelect } from './PermissionCodeMultiSelect'
import { ROLES_STRINGS } from './roles.strings'

interface RoleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role | null
  onSaved?: () => void
}

// Mirrors backend `_validate_role_name` in
// app/modules/auth/schemas/auth_schema.py: lowercase letters, digits, and
// internal spaces; must start with a letter; ≤ 2 digits total; 2–50 chars
// after the normalise-then-validate pass. Normalisation matches the
// backend pre-validator (`_normalise_role_name`).
const ROLE_NAME_PATTERN = /^[a-z][a-z0-9 ]*$/
const ROLE_NAME_MAX_DIGITS = 2
function normalizeRoleName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

function validateRoleName(value: string): string | null {
  if (value.length < 2) return 'Role name must be at least 2 characters.'
  if (value.length > 50) return 'Role name must be at most 50 characters.'
  if (!ROLE_NAME_PATTERN.test(value)) {
    return 'Use lowercase letters, numbers and spaces only; must start with a letter.'
  }
  const digitCount = [...value].filter((c) => c >= '0' && c <= '9').length
  if (digitCount > ROLE_NAME_MAX_DIGITS) {
    return `Role name may contain at most ${ROLE_NAME_MAX_DIGITS} digits.`
  }
  return null
}

export function RoleFormDialog({ open, onOpenChange, role, onSaved }: RoleFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          // Body only mounts when the dialog opens — that way the form state
          // is seeded once via `useState` initial values from props, with no
          // `useEffect` + setState dance to keep the input in sync.
          <RoleFormBody
            role={role}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function RoleFormBody({
  role,
  onSaved,
  onClose,
}: {
  role: Role | null
  onSaved?: () => void
  onClose: () => void
}) {
  const isEdit = !!role
  // Blocks updates on the superuser roles (admin / superadmin) — their
  // access bypasses permission checks, so edits here would be misleading.
  const isSystemRole = isSystemRoleName(role?.name)

  const createMutation = useCreateRole()
  const updateMutation = useUpdateRoleName(role?.id ?? 0)
  const replaceManagerMutation = useReplaceManagerRoles(role?.id ?? 0)

  const [name, setName] = useState(role?.name ?? '')
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())
  // Channel tags — multi-select. Prefilled from the role on edit (the
  // list endpoint returns `channel_tags` per row, so no extra fetch).
  // Empty array = "no restriction" — valid save state.
  const [channelTags, setChannelTags] = useState<string[]>(role?.channel_tags ?? [])
  // Record scope (RBAC-H2). Prefilled from the list row on edit.
  const [dataScope, setDataScope] = useState<RoleDataScope>(role?.data_scope ?? 'all')

  // Manager roles — edit mode only. Initialized from allowed_manager_role_ids.
  // Empty selection → sends null (any manager allowed) on save.
  // Non-empty → sends the selected role IDs (restricted set).
  const [managerRoleIds, setManagerRoleIds] = useState<Set<number>>(
    new Set(role?.allowed_manager_role_ids ?? []),
  )
  const [managerRolesDirty, setManagerRolesDirty] = useState(false)

  const { errors, setErrors, clearError, clearAll } = useFormErrors()

  // Load all roles for the manager role picker (edit mode only).
  // Starts fetching when the body mounts because `enabled` is always true
  // here (the body only renders while the dialog is open).
  const managerRolesQuery = useRolesInfinite({ enabled: isEdit })

  // Auto-fetch remaining pages to build the complete role list (there are
  // usually ≤ 20 roles so one page covers all, but guard just in case).
  useEffect(() => {
    if (!isEdit || !managerRolesQuery.hasNextPage || managerRolesQuery.isFetchingNextPage) return
    void managerRolesQuery.fetchNextPage()
  }, [isEdit, managerRolesQuery.hasNextPage, managerRolesQuery.isFetchingNextPage, managerRolesQuery.fetchNextPage])

  const allRoles = managerRolesQuery.data?.pages.flatMap((p) => p.items) ?? []
  // Exclude the current role from its own manager picker.
  const otherRoles = allRoles.filter((r) => r.id !== role?.id)

  function toggleManagerRole(id: number) {
    setManagerRoleIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setManagerRolesDirty(true)
  }

  const isSaving =
    createMutation.isPending || updateMutation.isPending || replaceManagerMutation.isPending

  const normalizedName = normalizeRoleName(name)
  const charCount = normalizedName.length

  async function handleSave() {
    const normalized = normalizeRoleName(name)
    // Name validation runs only on create — edit form treats the name
    // as read-only display and does not send it on save.
    if (!isEdit) {
      const err = validateRoleName(normalized)
      if (err) {
        setErrors({ name: err })
        toast.error(ROLES_STRINGS.formDialog.toastFixField)
        return
      }
    }
    clearAll()
    try {
      if (isEdit && role) {
        // Edit form is channel-tags-only — name is shown read-only and
        // not sent. Backend PATCH semantics: omitted fields stay as-is,
        // so the rename path isn't reachable from this dialog by design.
        await updateMutation.mutateAsync({
          channel_tags: channelTags,
          data_scope: dataScope,
        })
        // Only call the manager-roles endpoint if the selection changed.
        // Empty selection → null (any manager allowed); non-empty → restricted.
        if (managerRolesDirty) {
          const ids = Array.from(managerRoleIds)
          await replaceManagerMutation.mutateAsync({
            manager_role_ids: ids.length > 0 ? ids : null,
          })
        }
      } else {
        await createMutation.mutateAsync({
          name: normalized,
          permission_codes: Array.from(selectedCodes).sort(),
          channel_tags: channelTags,
          data_scope: dataScope,
        })
      }
      onSaved?.()
      onClose()
    } catch {
      // mutation hooks already toast errors
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void handleSave() }}>
      <DialogHeader>
        <DialogTitle className="text-[18px] font-semibold tracking-tight">
          {isEdit ? ROLES_STRINGS.formDialog.titleEdit : ROLES_STRINGS.formDialog.titleCreate}
        </DialogTitle>
        <DialogDescription className="text-sm leading-6 text-muted-foreground">
          {isEdit
            ? ROLES_STRINGS.formDialog.descriptionEdit
            : ROLES_STRINGS.formDialog.descriptionCreate}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        {!isEdit && (
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {ROLES_STRINGS.formDialog.storedValueLabel}
                </p>
                <code className="text-sm font-medium text-foreground/85">
                  {normalizedName || ROLES_STRINGS.formDialog.storedValueFallback}
                </code>
              </div>
              <Typography asChild variant="helper"><p>{charCount}/50</p></Typography>
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="role-name">
            {isEdit ? ROLES_STRINGS.formDialog.roleNameLabel : ROLES_STRINGS.formDialog.roleNameRequired}
          </Label>
          <Input
            id="role-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              clearError('name')
            }}
            onBlur={() => setName(normalizeRoleName(name))}
            placeholder={ROLES_STRINGS.formDialog.roleNamePlaceholder}
            disabled={isEdit}
            aria-invalid={Boolean(errors.name)}
            autoFocus={!isEdit}
          />
          <FieldError message={errors.name} />
          <Typography asChild variant="helper"><p>
            {isEdit
              ? ROLES_STRINGS.formDialog.roleNameHintEdit
              : ROLES_STRINGS.formDialog.roleNameHintCreate}
          </p></Typography>
        </div>
        {!isEdit && (
          <div className="space-y-3 rounded-lg border bg-background p-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm">{ROLES_STRINGS.formDialog.permissionsOnCreate}</Label>
                <Badge variant="secondary" className="font-normal">
                  {ROLES_STRINGS.permissionsDialog.selectedCount(selectedCodes.size)}
                </Badge>
              </div>
            </div>
            <PermissionCodeMultiSelect
              value={Array.from(selectedCodes)}
              onValueChange={(next) => setSelectedCodes(new Set(next))}
              disabled={isSaving}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm">{ROLES_STRINGS.formDialog.channelTagsLabel}</Label>
            <Badge variant="secondary" className="font-normal">
              {ROLES_STRINGS.permissionsDialog.selectedCount(channelTags.length)}
            </Badge>
          </div>
          {isSystemRole ? (
            <>
              <div className="rounded-[7px] border border-input bg-muted/30 px-[10px] py-2 text-[13.5px] text-muted-foreground">
                {ROLES_STRINGS.formDialog.channelTagsSystemNote}
              </div>
              <Typography asChild variant="helper"><p>
                {ROLES_STRINGS.formDialog.channelTagsSystemHint}
              </p></Typography>
            </>
          ) : (
            <>
              <MultiSelect
                options={CHANNEL_TAG_OPTIONS}
                value={channelTags}
                onValueChange={setChannelTags}
                placeholder={ROLES_STRINGS.formDialog.channelTagsPlaceholder}
              />
              <Typography asChild variant="helper"><p>
                {ROLES_STRINGS.formDialog.channelTagsHint}
              </p></Typography>
            </>
          )}
        </div>

        {/* Record scope — hidden for superuser roles, which bypass it. */}
        {!isSystemRole && (
          <div className="space-y-1.5">
            <Label className="text-sm">{ROLES_STRINGS.formDialog.dataScopeLabel}</Label>
            <RadioGroup
              value={dataScope}
              onValueChange={(next) => setDataScope(next as RoleDataScope)}
              disabled={isSaving}
            >
              <div className="space-y-1">
                <label className="flex items-center gap-3" htmlFor="role-scope-all">
                  <RadioGroupItem id="role-scope-all" value="all" />
                  <Label htmlFor="role-scope-all">{ROLES_STRINGS.formDialog.dataScopeAll}</Label>
                </label>
                <Typography asChild variant="helper" tone="muted">
                  <p className="pl-8">{ROLES_STRINGS.formDialog.dataScopeAllHelp}</p>
                </Typography>
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-3" htmlFor="role-scope-rental">
                  <RadioGroupItem id="role-scope-rental" value="rental_orders" />
                  <Label htmlFor="role-scope-rental">{ROLES_STRINGS.formDialog.dataScopeRental}</Label>
                </label>
                <Typography asChild variant="helper" tone="muted">
                  <p className="pl-8">{ROLES_STRINGS.formDialog.dataScopeRentalHelp}</p>
                </Typography>
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-3" htmlFor="role-scope-sales-team">
                  <RadioGroupItem id="role-scope-sales-team" value="sales_team" />
                  <Label htmlFor="role-scope-sales-team">
                    {ROLES_STRINGS.formDialog.dataScopeSalesTeam}
                  </Label>
                </label>
                <Typography asChild variant="helper" tone="muted">
                  <p className="pl-8">{ROLES_STRINGS.formDialog.dataScopeSalesTeamHelp}</p>
                </Typography>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Manager role configuration — edit mode only */}
        {isEdit && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm">Allowed Manager Roles</Label>
              <Badge variant="secondary" className="font-normal">
                {managerRoleIds.size === 0 ? 'Any manager' : `${managerRoleIds.size} role${managerRoleIds.size === 1 ? '' : 's'}`}
              </Badge>
            </div>
            <div className="max-h-44 overflow-y-auto rounded-md border">
              {managerRolesQuery.isLoading ? (
                <Typography asChild variant="helper" align="center">
                  <div className="py-5">Loading roles…</div>
                </Typography>
              ) : otherRoles.length === 0 ? (
                <Typography asChild variant="helper" align="center">
                  <div className="py-5">No other roles found.</div>
                </Typography>
              ) : (
                <div className="p-1">
                  {otherRoles.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleManagerRole(r.id)}
                      disabled={isSystemRole || isSaving}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                        'hover:bg-accent disabled:pointer-events-none disabled:opacity-50',
                        managerRoleIds.has(r.id) && 'bg-accent/50',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded border',
                          managerRoleIds.has(r.id)
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input',
                        )}
                      >
                        {managerRoleIds.has(r.id) && <Check className="size-3" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{r.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Typography asChild variant="helper"><p>
              {isSystemRole
                ? 'Manager role config is not applicable to system roles.'
                : 'Which roles are valid managers for users holding this role. Leave empty to allow any manager.'}
            </p></Typography>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
          {ROLES_STRINGS.formDialog.cancel}
        </Button>
        <Button type="submit" disabled={isSaving || isSystemRole}>
          {isSaving
            ? ROLES_STRINGS.formDialog.saving
            : isEdit
              ? ROLES_STRINGS.formDialog.saveChanges
              : ROLES_STRINGS.formDialog.createRole}
        </Button>
      </DialogFooter>
    </form>
  )
}
