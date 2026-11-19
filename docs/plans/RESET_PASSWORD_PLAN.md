# Reset Password (Superadmin) — Implementation Plan

**Date:** 2026-05-30
**Scope:** Allow a superadmin to reset any user's password from the User Management screen.
**Decisions:**
- **Authorization:** Superadmin-only. Only users with `is_superuser = true` (the `admin` / `superadmin` roles imply this) may reset passwords, and they may reset *any* user — including other admins.
- **Password source:** The acting admin **types** the new password (+ confirm). The system does not auto-generate.

---

## 0. TL;DR — What already exists vs. what we build

The reset-password machinery is ~80% built. This is mostly a **wiring + authorization-tightening** task, not a greenfield feature.

| Layer | Already exists | We add/change |
| --- | --- | --- |
| Backend endpoint | `POST /api/v1/users/{user_id}/reset-password` | Swap gate from `require_permission(AUTH_USERS_MANAGE)` → superuser-only |
| Backend service | `UserService.reset_user_password()` (+ audit, JWT invalidation) | No change (optionally guard against acting-on-self) |
| Backend schema | `AdminResetPasswordRequest{ new_password }` | No change |
| Frontend API wrapper | `resetUserPassword(id, body)` | No change |
| Frontend hook | `useResetUserPassword(id)` | No change |
| Frontend types | `ResetUserPasswordPayload` | No change |
| **Frontend UI** | **— nothing —** | **Reset-Password row action + confirm dialog (the real work)** |
| Frontend visibility | — | Show action only when `is_superuser` (mirror backend) |

---

## 1. Backend

### 1.1 Add a `require_superuser` dependency

There is currently **no** superuser-only dependency — every route uses `require_permission(...)`, which *bypasses* for superusers but also allows any role holding the permission code. We need a stricter gate.

**File:** `app/core/rbac/dependencies.py`
**Add** (next to `require_permission`, ~line 117):

```python
def require_superuser() -> Callable[[User], User]:
    """Gate a route on is_superuser. Stricter than require_permission."""
    def _dep(user: Annotated[User, Depends(get_current_user)]) -> User:
        if not user.is_superuser:
            raise ForbiddenError("Superuser privilege required")
        return user
    return _dep
```

> Note: confirm the existing import of `get_current_user` / `ForbiddenError` in this module; reuse whatever `require_permission` already imports.

### 1.2 Tighten the reset endpoint

**File:** `app/modules/auth/api/v1/admin_endpoints.py` (lines 317–325)
**Change** the dependency:

```python
@router.post("/{user_id}/reset-password")
async def reset_password(
    user_id: uuid.UUID,
    body: AdminResetPasswordRequest,
    svc: UserServiceDep,
    actor: Annotated[User, Depends(require_superuser())],   # ← was require_permission(codes.AUTH_USERS_MANAGE)
) -> ApiResponse[None]:
    await svc.reset_user_password(user_id, body.new_password, actor=actor)
    return ApiResponse[None].ok(data=None, message="Password reset")
```

### 1.3 Service — no functional change (optional hardening)

**File:** `app/modules/auth/services/user_service.py` (`reset_user_password`, lines 476–496). It already:
- hashes the new password (`hash_password`),
- bumps `password_changed_at` → **invalidates all of the target user's existing JWTs** (`get_current_user` checks `token.iat >= password_changed_at`),
- writes an audit row (`action="user_password_reset"`).

Optional hardening to consider:
- **Self-reset guard:** if `user_id == actor.id`, raise `ValidationError("Use change-password for your own account")` — keeps the self-serve and admin-override flows separate. (Low priority; can skip.)
- The `new_password` length is validated by the schema (`min_length=8, max_length=128`). Keep as-is.

### 1.4 Existing schema — no change

**File:** `app/modules/auth/schemas/auth_schema.py` (lines 305–308) — `AdminResetPasswordRequest` already matches the "admin types the password" decision.

### 1.5 Tests

**File:** `app/modules/auth/tests/` (mirror existing test layout; `asyncio_mode=auto`).
- ✅ Superuser can reset another user's password → 200, hash changed, `password_changed_at` advanced, audit row written.
- ✅ Superuser can reset an **admin** user → 200 (explicitly allowed).
- ⛔ Non-superuser holding `AUTH_USERS_MANAGE` → **403** (this is the behavior change — guard it).
- ⛔ Unauthenticated → 401.
- ⛔ `new_password` < 8 chars → 422.
- ✅ Target's old JWT rejected after reset (401 on a subsequent `/me`).

---

## 2. Frontend

The API wrapper, hook, and type all exist. The work is the **UI** plus a **superuser visibility gate**.

### 2.1 Reset-Password dialog component (new)

**New file:** `src/modules/settings/components/ResetPasswordDialog.tsx`
Follow the existing `UserFormDialog` / `RoleFormDialog` conventions (shadcn `Dialog`, manual `useState`, `useFormErrors`, `FieldError`, `sonner` toasts).

Props:
```ts
interface ResetPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string   // for the dialog title / confirmation copy
}
```

Body:
- `new_password` input (`type="password"`, min 8 chars).
- `confirm_password` input — client-side equality check.
- Validation: required, length ≥ 8, match. On failure `setErrors(...)` + `toast.error('Please fix the highlighted fields.')`.
- Submit calls the existing hook:

```ts
const reset = useResetUserPassword(userId)

async function handleSubmit() {
  // validate -> setErrors / return on failure
  await reset.mutateAsync({ new_password: newPassword })
  onOpenChange(false)            // hook already fires toast.success("Password reset")
}
```

- Footer: `Cancel` (outline) + `Reset Password` (disabled while `reset.isPending`).
- Copy a clear warning: "This signs <userName> out of all sessions." (true — backend invalidates their JWTs).

### 2.2 Wire the row action into User Management

**File:** `src/modules/settings/pages/UserManagementPage.tsx` (row actions block, lines 113–156).
Add a `KeyRound`/`Lock` icon button alongside Edit / Deactivate / Delete:

```tsx
{isSuperuser && (
  <Button
    variant="ghost"
    size="icon-sm"
    onClick={() => openResetDialog(r.raw)}
    aria-label="Reset password"
  >
    <KeyRound className="size-3.5" />
  </Button>
)}
```

- Add page state: `const [resetTarget, setResetTarget] = useState<UserListItem | null>(null)`.
- Render `<ResetPasswordDialog open={!!resetTarget} ... userId={resetTarget?.id} userName={getUserDisplayName(resetTarget)} onOpenChange={(o) => !o && setResetTarget(null)} />`.

### 2.3 Superuser visibility gate

Mirror the backend so non-superusers never see a button that would 403.

```ts
const { isSuperuser } = usePermission()   // src/shared/rbac/usePermission.ts
```

Gate both the row-action button (`{isSuperuser && ...}`) and the dialog. (Using `usePermission().isSuperuser` directly is simpler than `PermissionGuard` here since there's no permission code — it's a flag check.)

### 2.4 No change needed

- `src/modules/users/api.ts` — `resetUserPassword()` ✅
- `src/modules/users/hooks/useUsers.ts` — `useResetUserPassword()` ✅ (already toasts success/error)
- `src/modules/users/types.ts` — `ResetUserPasswordPayload` ✅

---

## 3. End-to-end flow

1. Superadmin opens **Settings → User Management**.
2. Row actions show a **key** icon (only because `is_superuser === true`).
3. Click → `ResetPasswordDialog` opens for that user.
4. Admin types new password + confirm → **Reset Password**.
5. `POST /api/v1/users/{id}/reset-password` → backend re-gated to superuser-only.
6. Service hashes password, bumps `password_changed_at`, writes audit row.
7. Target user's existing tokens are invalidated → forced re-login.
8. Toast: "Password reset"; dialog closes.

---

## 4. Build checklist

**Backend**
- [ ] Add `require_superuser()` to `app/core/rbac/dependencies.py`.
- [ ] Re-gate `reset_password` endpoint in `admin_endpoints.py`.
- [ ] (Optional) self-reset guard in `reset_user_password()`.
- [ ] Tests: superuser-allow, non-superuser-403, admin-target-allow, 401, 422, JWT-invalidation.

**Frontend**
- [ ] New `ResetPasswordDialog.tsx`.
- [ ] Add key-icon row action in `UserManagementPage.tsx`, gated by `isSuperuser`.
- [ ] Page state + dialog render wiring.
- [ ] Manual QA: superuser sees & uses it; non-superuser sees nothing; mismatch/short-password validation; target forced to re-login.

---

## 5. Open / future (out of scope here)

- Self-serve **forgot-password** (email + token) — no public reset flow exists today.
- Tiered authorization (admin-resets-non-admins) — explicitly **not** chosen; superuser-only was selected.
- Password history / expiry / MFA-on-reset.
