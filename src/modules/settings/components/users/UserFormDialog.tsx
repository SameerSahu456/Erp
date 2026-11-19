import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Typography } from '@/components/ui/typography'
import { FieldError } from '@/components/common/forms/FieldError'
import { useFormErrors } from '@/hooks/use-form-errors'
import { useAuth } from '@/shared/auth/use-auth'
import { useTransformedInput } from '@/shared/hooks'
import { isPhoneInput, validateEmail, validatePhoneIndia } from '@/shared/lib/validation'

import { USERS_STRINGS } from './users.strings'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getUserDisplayName,
  useCreateUser,
  useReplaceUserRoles,
  useRolesInfinite,
  useUpdateUser,
  useUser,
  type UserListItem,
} from '@modules/users'

import { ManagerMultiPicker, type ManagerOption } from './ManagerMultiPicker'
import { RoleMultiPicker } from './RoleMultiPicker'

// Minimum password length on create — matches the "Min 8 chars" field hint.
const USERS_PASSWORD_MIN_LENGTH = 8

// Yearly target input shape, mirroring the backend's `YearlyTarget` schema and
// the NUMERIC(18, 2) column: at most 18 digits total — 16 before the point, 2
// after. Rejects a sign and, crucially, an exponent: an out-of-range target
// reached Postgres (and 500'd) because `<input type="number">` happily accepts
// "1e29" as a valid Number. Digits and one dot only, so that can't recur.
//
// Anchored and applied per keystroke, so it also bounds length: 16 integer
// digits is the most that can ever be typed. Allows a trailing "." and an
// empty string so the field stays editable mid-typing.
const USERS_TARGET_PATTERN = /^\d{0,16}(?:\.\d{0,2})?$/

// Yearly target sent when the field is left empty, mirroring
// `UserCreateRequest.current_target`'s own `default: "0"` on the backend.
// Deliberately applied at the API boundary only, NOT as the input's value: the
// field stays empty (and keeps showing its placeholder) so an untouched target
// still reads as "nothing entered" rather than as a deliberate zero.
//
// It has to be '0' rather than null because POST /users does not accept null
// for this field — its anyOf is number | string with no null member, so a blank
// field previously submitted `null` and 422'd. PATCH /users/{id} does accept
// null, but empty maps to '0' there too so both flows mean the same thing.
const USERS_TARGET_DEFAULT = '0'

function isYearlyTargetInput(value: string): boolean {
  return value === '' || USERS_TARGET_PATTERN.test(value)
}

// Uppercase every letter as the user types (so "john doe" → "JOHN DOE").
// Applied through `useTransformedInput` so rewriting the keystroke doesn't
// throw the caret to the end of the field mid-word.
function capitalizeName(value: string): string {
  return value.toLocaleUpperCase()
}


interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserListItem | null
  onSaved?: () => void
}

export function UserFormDialog({ open, onOpenChange, user, onSaved }: UserFormDialogProps) {
  const isEdit = !!user

  // The list row (`UserListItem`) does not carry phone/department/designation —
  // only `GET /users/{id}` does. Fetch the detail when editing so the form
  // hydrates with the full record instead of blanking those fields. See
  // Coding-guideline §6.7 mismatch #2 (wrong-shape typing).
  const detailQuery = useUser(open && isEdit ? user!.id : '')

  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser(user?.id ?? '')
  const replaceRolesMutation = useReplaceUserRoles(user?.id ?? '')
  const { user: currentUser, refreshUser } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [department, setDepartment] = useState('')
  const [designation, setDesignation] = useState('')
  // Yearly target is held as a string because it's bound to a text-ish input —
  // '' means "nothing entered", which submit converts to USERS_TARGET_DEFAULT.
  // `initialTarget` is the PATCH-diff snapshot, same role as
  // `initialManagerIds`: the backend rolls `current_target` into
  // `previous_target` on every real change, so an unchanged target must be
  // omitted from the payload rather than re-sent.
  const [yearlyTarget, setYearlyTarget] = useState('')
  // Snapshot of the hydrated text, compared as text so the diff never routes
  // the value through a float. '' means "no target".
  const [initialTarget, setInitialTarget] = useState('')
  // 2026-05-19: multi-manager. The dialog tracks chips locally for the
  // picker; `initialManagerIds` is the snapshot we PATCH-diff against so
  // we can preserve the spec's three-state semantics (omit / [] / replace).
  const [managerOptions, setManagerOptions] = useState<ManagerOption[]>([])
  const [initialManagerIds, setInitialManagerIds] = useState<string[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const { errors, setErrors, clearError, clearAll } = useFormErrors()

  // Both name fields rewrite each keystroke to uppercase, so the caret has to
  // be restored or it lands at the end of the field on every mid-word edit.
  const firstNameInput = useTransformedInput(capitalizeName, (value) => {
    setFirstName(value)
    clearError('firstName')
  })
  const lastNameInput = useTransformedInput(capitalizeName, setLastName)

  // Reset the hydration flag whenever the dialog closes or switches to a
  // different user, so the next open re-seeds the form once.
  useEffect(() => {
    if (!open) {
      setHydrated(false)
      clearAll()
    }
  }, [open, user?.id, clearAll])

  // Hydrate once per open: seed the form when the detail arrives (or
  // immediately for the create flow). Don't re-run on every detail refetch —
  // that would clobber the user's in-progress edits.
  useEffect(() => {
    if (!open || hydrated) return
    if (isEdit && !detailQuery.data) return
    const detail = detailQuery.data
    setEmail(user?.email ?? '')
    setPassword('')
    setFirstName(detail?.first_name ?? user?.first_name ?? '')
    setLastName(detail?.last_name ?? user?.last_name ?? '')
    setPhone(detail?.phone ?? '')
    setDepartment(detail?.department ?? '')
    setDesignation(detail?.designation ?? '')
    // Already a decimal string on the wire — bind it as-is. Parsing it to a
    // Number here and back would round anything past 2^53.
    const hydratedTargetText = detail?.current_target ?? user?.current_target ?? ''
    setYearlyTarget(hydratedTargetText)
    setInitialTarget(hydratedTargetText)
    // Hydrate manager chips from the nested `managers` array (already
    // shaped {id, first_name, last_name, email}). `manager_ids` is the
    // canonical id source — soft-deleted managers stay in ids but drop
    // from `managers`, so we use ids for the dirty-diff snapshot.
    const hydratedManagers = detail?.managers ?? user?.managers ?? []
    setManagerOptions(
      hydratedManagers.map((m) => ({ id: m.id, label: getUserDisplayName(m) })),
    )
    setInitialManagerIds(detail?.manager_ids ?? user?.manager_ids ?? [])
    setRoles(detail?.roles ?? user?.roles ?? [])
    setIsActive(detail?.is_active ?? user?.is_active ?? true)
    setHydrated(true)
  }, [open, isEdit, hydrated, user, detailQuery.data])

  const isSaving =
    createMutation.isPending || updateMutation.isPending || replaceRolesMutation.isPending
  const isHydrating = isEdit && detailQuery.isLoading

  // Load all roles so we can look up each role's `allowed_manager_role_ids`
  // dynamically (set by the admin in Settings → Roles). Auto-fetch all pages
  // since there are typically ≤ 20 roles and a single page covers them all.
  //
  // Only while the dialog is OPEN: this component is mounted on the Users page
  // permanently, and an ungated query pulled every roles page on page load.
  // `scope` keeps it out of the cache the Role filter dropdown uses, so that
  // dropdown still opens on page 1 and loads more as you scroll.
  const rolesQuery = useRolesInfinite({ enabled: open, scope: 'user-form-lookup' })
  useEffect(() => {
    if (!open || !rolesQuery.hasNextPage || rolesQuery.isFetchingNextPage) return
    void rolesQuery.fetchNextPage()
  }, [open, rolesQuery.hasNextPage, rolesQuery.isFetchingNextPage, rolesQuery.fetchNextPage])

  const roleByName = useMemo(() => {
    const flat = rolesQuery.data?.pages.flatMap((p) => p.items) ?? []
    return new Map(flat.map((r) => [r.name, r]))
  }, [rolesQuery.data])

  // Derive which role IDs are valid managers for the subject's selected roles.
  // Logic: union of `allowed_manager_role_ids` across all CONSTRAINED roles
  // (those with a non-empty list). Roles with an empty list are unconstrained
  // (any manager is allowed). If no selected role is constrained → null (no filter).
  const allowedManagerRoleIds = useMemo((): number[] | null => {
    const constrainedRoles = roles
      .map((name) => roleByName.get(name))
      .filter(
        (r): r is NonNullable<typeof r> =>
          r !== undefined && (r.allowed_manager_role_ids?.length ?? 0) > 0,
      )
    if (constrainedRoles.length === 0) return null
    const union = new Set<number>()
    for (const r of constrainedRoles) {
      for (const id of r.allowed_manager_role_ids ?? []) union.add(id)
    }
    return [...union]
  }, [roles, roleByName])

  async function handleSave() {
    const e: Record<string, string> = {}
    if (!firstName.trim()) e.firstName = USERS_STRINGS.validation.firstNameRequired
    if (roles.length === 0) e.roles = USERS_STRINGS.validation.rolesRequired
    if (!email.trim()) {
      e.email = USERS_STRINGS.validation.emailRequired
    } else {
      // Same email regex the Contact form uses (shared validation.ts).
      const emailErr = validateEmail(email)
      if (emailErr) e.email = emailErr
    }
    // Phone is optional — validate format only when the user typed something.
    const phoneErr = validatePhoneIndia(phone)
    if (phoneErr) e.phone = phoneErr
    // Yearly target is optional — '' submits as 0. The keystroke filter already
    // guarantees the shape the backend accepts (digits only, ≤16 before the
    // point, ≤2 after = 18 total), so the only thing left to reject is input
    // that is shaped like a number but isn't one: a lone "." or ".".
    if (yearlyTarget.trim() && !Number.isFinite(Number(yearlyTarget))) {
      e.yearlyTarget = USERS_STRINGS.validation.yearlyTargetInvalid
    }
    if (!isEdit) {
      if (!password) e.password = USERS_STRINGS.validation.passwordRequired
      else if (password.length < USERS_PASSWORD_MIN_LENGTH)
        e.password = USERS_STRINGS.validation.passwordMinLength
    }
    if (Object.keys(e).length > 0) {
      setErrors(e)
      toast.error(USERS_STRINGS.validation.fixHighlighted)
      return
    }
    clearAll()

    const nextManagerIds = managerOptions.map((o) => o.id)
    // Sent as a STRING, not a Number. The column is NUMERIC(18, 2) — up to 16
    // integer digits — but JS only represents integers exactly below 2^53 (~9
    // quadrillion, 16 digits). So `Number("9999999999999999")` is 10^16, a
    // value the column would then reject. The backend takes a string for a
    // Decimal field and parses it losslessly, so the typed digits reach
    // Postgres exactly as typed and the full column range stays usable.
    // Empty input means "no target entered", which the API expresses as 0 —
    // see USERS_TARGET_DEFAULT. The substitution happens here, at the boundary,
    // so the input itself is free to stay blank.
    const nextTarget = yearlyTarget.trim() === '' ? USERS_TARGET_DEFAULT : yearlyTarget.trim()

    try {
      if (isEdit && user) {
        // 2026-05-19 PATCH semantics for manager_ids:
        //   • unchanged → omit field (preserves backend snapshot)
        //   • cleared   → send [] (clears all managers)
        //   • changed   → send replacement array (NOT append)
        const managersChanged =
          nextManagerIds.length !== initialManagerIds.length ||
          nextManagerIds.some((id, i) => id !== initialManagerIds[i])
        const nextEmail = email.trim()
        const emailChanged = nextEmail !== (user.email ?? '')
        // Same omit-unless-changed rule as manager_ids, and load-bearing here:
        // the backend rolls the outgoing current_target into previous_target on
        // every real change, so re-sending an unchanged target on a routine save
        // is exactly what would overwrite the history with a duplicate. The
        // backend guards against this too — the two defences should agree
        // rather than one silently covering for the other.
        const targetChanged = yearlyTarget.trim() !== initialTarget
        await updateMutation.mutateAsync({
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          phone: phone.trim() || null,
          department: department.trim() || null,
          designation: designation.trim() || null,
          ...(emailChanged ? { email: nextEmail } : {}),
          ...(managersChanged ? { manager_ids: nextManagerIds } : {}),
          ...(targetChanged ? { current_target: nextTarget } : {}),
        })
        const before = new Set(user.roles)
        const after = new Set(roles)
        const changed = before.size !== after.size || [...after].some((r) => !before.has(r))
        if (changed) {
          await replaceRolesMutation.mutateAsync({ role_names: roles })
          // Edited self → refresh /auth/me so the new role set takes effect now,
          // not after the next 30s background poll in AuthProvider.
          if (currentUser?.id === user.id) {
            void refreshUser()
          }
        }
      } else {
        await createMutation.mutateAsync({
          email: email.trim(),
          password,
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          phone: phone.trim() || null,
          department: department.trim() || null,
          designation: designation.trim() || null,
          manager_ids: nextManagerIds,
          current_target: nextTarget,
          role_names: roles,
        })
      }
      onSaved?.()
      onOpenChange(false)
    } catch {
      // mutation hooks already toast errors
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        Fixed height, not `max-h`: the body's natural height swings a lot
        (role chips wrap to 3+ lines, the password field only exists on
        create, field errors appear and vanish), and a `max-h` frame resizes
        on every one of those. Pinning the height keeps the header, footer,
        and the user's scroll position still while they edit. `min()` keeps it
        from overflowing a short viewport.

        `overflow-y-hidden` overrides the `overflow-y-auto` DialogContent
        applies by default — otherwise the whole popup scrolls (title and
        Save button included) instead of just the body below. Both axes are
        named explicitly because a lone `overflow-y-*` promotes the other axis
        from `visible` to `auto` and reintroduces sideways scroll.
      */}
      <DialogContent className="flex h-[min(38rem,calc(100vh-2rem))] flex-col gap-0 overflow-x-hidden overflow-y-hidden sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEdit ? USERS_STRINGS.dialog.titleEdit : USERS_STRINGS.dialog.titleCreate}</DialogTitle>
        </DialogHeader>
        {/* The only scroller. `min-h-0` is what lets a flex child actually
            shrink below its content height — without it this div sizes to its
            content and pushes the footer off the frame.

            `overflow-x-hidden` is required, not belt-and-braces: CSS computes
            a `visible` overflow on one axis to `auto` when the other axis is
            not `visible`, so `overflow-y-auto` alone silently turns on
            horizontal scrolling too (§8.7 — no component may scroll
            sideways). `px-1` keeps focus rings off the clipped edge. */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1">
        {isHydrating ? (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="user-fname">{USERS_STRINGS.fields.firstName}</Label>
              <Input
                id="user-fname"
                value={firstName}
                {...firstNameInput}
                aria-invalid={Boolean(errors.firstName)}
              />
              <FieldError message={errors.firstName} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-lname">{USERS_STRINGS.fields.lastName}</Label>
              <Input
                id="user-lname"
                value={lastName}
                {...lastNameInput}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-email">{USERS_STRINGS.fields.email}</Label>
            <Input
              id="user-email"
              type="email"
              // Don't let Chrome autofill the logged-in admin's saved email —
              // this is a create-another-user form, not a login.
              autoComplete="off"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                clearError('email')
              }}
              aria-invalid={Boolean(errors.email)}
            />
            <FieldError message={errors.email} />
          </div>
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="user-pwd">{USERS_STRINGS.fields.password}</Label>
              <Input
                id="user-pwd"
                type="password"
                // "new-password" stops Chrome from injecting the admin's own
                // saved login password into this new-user field.
                autoComplete="new-password"
                placeholder={USERS_STRINGS.fields.passwordPlaceholder}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  clearError('password')
                }}
                aria-invalid={Boolean(errors.password)}
              />
              <FieldError message={errors.password} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="user-phone">{USERS_STRINGS.fields.phone}</Label>
            <Input
              id="user-phone"
              inputMode="tel"
              autoComplete="off"
              value={phone}
              onChange={(e) => {
                // Keystroke filter — only digits, +, -, space reach state.
                if (isPhoneInput(e.target.value)) {
                  setPhone(e.target.value)
                  clearError('phone')
                }
              }}
              aria-invalid={Boolean(errors.phone)}
            />
            <FieldError message={errors.phone} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="user-dept">{USERS_STRINGS.fields.department}</Label>
              <Input id="user-dept" value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-desig">{USERS_STRINGS.fields.designation}</Label>
              <Input id="user-desig" value={designation} onChange={(e) => setDesignation(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-target">{USERS_STRINGS.fields.yearlyTarget}</Label>
            <Input
              id="user-target"
              // Deliberately `text`, not `number`, so the keystroke filter
              // below actually works: a `number` input reports `value === ''`
              // for anything it considers invalid, so "1e29" arrives
              // indistinguishable from an empty field and can't be rejected.
              // `inputMode="decimal"` still opens the numeric keypad on mobile.
              // Same trade-off the Phone field above makes.
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder={USERS_STRINGS.fields.yearlyTargetPlaceholder}
              value={yearlyTarget}
              onChange={(e) => {
                // Keystroke filter — out-of-shape input never reaches state, so
                // a >18-digit (or exponent) target can't be typed at all.
                if (isYearlyTargetInput(e.target.value)) {
                  setYearlyTarget(e.target.value)
                  clearError('yearlyTarget')
                }
              }}
              aria-invalid={Boolean(errors.yearlyTarget)}
            />
            <FieldError message={errors.yearlyTarget} />
          </div>
          <div className="space-y-1.5">
            <Label>{USERS_STRINGS.fields.roles}</Label>
            <RoleMultiPicker
              value={roles}
              onValueChange={(next) => {
                setRoles(next)
                clearError('roles')
              }}
            />
            <FieldError message={errors.roles} />
          </div>
          <div className="space-y-1.5">
            <Label>{USERS_STRINGS.fields.managers}</Label>
            <ManagerMultiPicker
              value={managerOptions}
              onValueChange={setManagerOptions}
              excludeUserId={user?.id}
              allowedRoleIds={allowedManagerRoleIds ?? undefined}
              disabled={roles.length === 0}
            />
            <Typography asChild variant="caption"><p>
              {roles.length === 0
                ? USERS_STRINGS.managerHint.noRoles
                : `${USERS_STRINGS.managerHint.base}${allowedManagerRoleIds ? USERS_STRINGS.managerHint.filtered : ''}`}
            </p></Typography>
          </div>
          {isEdit && (
            <div className="flex items-center justify-between">
              <Label htmlFor="user-active">{USERS_STRINGS.fields.active}</Label>
              <Switch
                id="user-active"
                checked={isActive}
                onCheckedChange={(v) => setIsActive(v as boolean)}
                disabled
              />
            </div>
          )}
        </div>
        )}
        </div>
        {/* Pinned: sits outside the scroller, so Save/Cancel stay on screen
            no matter how far the body scrolls. `mt-4` replaces the `gap-4`
            DialogContent drops when we set `gap-0` above. */}
        <DialogFooter className="mt-4 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {USERS_STRINGS.dialog.cancel}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isHydrating}>
            {isSaving ? USERS_STRINGS.dialog.saving : isEdit ? USERS_STRINGS.dialog.saveChanges : USERS_STRINGS.dialog.createUser}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
