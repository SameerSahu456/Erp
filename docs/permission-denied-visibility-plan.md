# Plan — Show the missing permission on every "Access Denied"

## Problem

When a user is blocked by RBAC on the frontend (e.g. the **Closed Won** wizard), the
app renders a generic *"You don't have permission to view this content."* It never
tells the user (or an admin helping them) **which permission code is missing**.

### Root cause

The app already surfaces the missing code for **backend 403s** on data fetches:
`NoAccess` accepts a `description`, `LoadErrorState` calls `isForbidden(error)` +
`buildForbiddenMessage()`, and the backend sends `"…Missing permission: crm:account_read"`.

But the **client-side gates** throw that information away:

- `src/shared/rbac/RouteGuard.tsx` — knows its `required` / `requiredAll` codes and has
  the user's `permissions` via `usePermission()`, yet on denial renders a bare
  `<NoAccess />` with the generic text.
- `src/shared/rbac/PermissionGuard.tsx` — same, renders `fallback` (usually nothing).

The Closed Won page is exactly this: `<RouteGuard requiredAll={crmCanAll.closeWonLead}>`
requires write-lead **AND** write-account **AND** read-quote **AND** write-SO. A denied
user cannot tell which of the four they lack.

## Decision

Display style: **friendly label + code**, e.g.

```
⛨ Access Denied
You don't have permission to view this page.

Requires one of:
 • Edit Accounts (crm:account_write)
 • Manage CRM (crm:manage)
```

Matches the backend 403 style (code is present so an admin can grant it) while staying
readable. Copy routed through a `*.strings.ts` / label map per §16.12; text rendered via
`<Typography>` per §8.4.

## Phases

### Phase 1 — Compute missing codes in `usePermission`
`src/shared/rbac/usePermission.ts`: add, without changing `can`/`canAny`:
- `missing(required: string | string[]): string[]` → `[]` when satisfied or superuser,
  else the required OR-bundle the user does not satisfy.
- `missingAll(requiredAll): string[][]` → the list of unmet OR-bundles.

### Phase 2 — Central code → label map
New `src/shared/rbac/permission-labels.ts`:
- `PERMISSION_LABELS: Record<string, string>` covering every code in the per-module
  `permissions.ts` files (`crm`, `ims`, `procurement`, `settings`, `audit`).
- `describePermission(code)` → `"Edit Accounts (crm:account_write)"` (falls back to the
  raw code if unlabelled).
- `describeBundle(codes)` → human-readable "one of" line.

### Phase 3 — `NoAccess` renders the missing list
`src/shared/components/feedback/NoAccess.tsx`: add optional
`missingPermissions?: string[] | string[][]`. When present, render a "Requires…" block
under the description using the label map + `<Typography>`. Existing `description` path
(backend 403s) unchanged.

### Phase 4 — Wire the gates
- `RouteGuard.tsx`: on the failing branch, compute the missing codes and pass
  `missingPermissions` to `<NoAccess>`. Fixes Closed Won + every route gate in one edit.
- `PermissionGuard.tsx`: optional `showReason?: boolean` — when set, render a compact
  `<NoAccess>` reason instead of the silent `fallback`. Default preserves current
  hide-the-affordance behavior.

### Phase 5 — Consistency with backend 403 path
Route `LoadErrorState` / `buildForbiddenMessage` output through the same label formatting
so a backend `crm:account_read` reads identically to a client-side one. No structural change.

### Phase 6 — Verify
`pnpm typecheck` + `pnpm lint`, then confirm on `/crm/leads/:id/close-won` as a user
missing one bundle that the panel names the specific missing permission.

## Frontend permission-check inventory (context)

- **Primitives** (`src/shared/rbac/`): `can.ts`, `usePermission.ts`,
  `RouteGuard.tsx`→`NoAccess`, `PermissionGuard.tsx`→`fallback`; role-based
  `components/common/permissions/PermissionGate.tsx` (rentals only); 403 path
  (`NoAccess`, `LoadErrorState`, `shared/api/envelope.ts`).
- **~48 call sites**: route gates (all CRM/IMS/procurement pages + 3 Closed Won wizards
  via `routes.tsx`), component gates (Edit/Create/Delete/Approve/Convert buttons &
  Quotes/Tasks/Notes/MI/Activity sections & Audit/Approvals tabs via
  `usePermission().can()`), sidebar filtering (`Sidebar.tsx` /
  `sidebar-nav-config.ts`), and data-fetch 403s (`LoadErrorState`).
- **Codes** live in per-module `permissions.ts` as OR-bundles mirroring the backend.
