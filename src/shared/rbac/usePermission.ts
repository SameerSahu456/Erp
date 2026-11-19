import { useAuth } from "@shared/auth/use-auth";
import { can, canAny } from "./can";

// Superuser bypass mirrors the backend's `require_permission` dependency
// (app/core/rbac/dependencies.py) — `is_superuser=true` users skip the
// Layer-2 permission check at the API gate, so they shouldn't be blocked
// at the UI gate either. Without this, admin sees Forbidden buttons even
// though the underlying request would succeed.
// Role names treated as privileged by name (in addition to the is_superuser
// bypass). Used by gates that should open for an admin/superadmin *role* even
// when `is_superuser` was never set on the row. NOT folded into `can()` — that
// stays permission-only so the rest of the app's RBAC is unchanged.
// Compared case-insensitively — role names are stored lowercase in the DB
// (`admin` / `superadmin`) but may surface in any case, so we normalize both
// sides before matching.
const ADMIN_ROLE_NAMES = ["superadmin", "admin"];

export function usePermission() {
  const { user } = useAuth();
  const isSuperuser = !!user?.is_superuser;
  const permissions: string[] = user?.permissions ?? [];
  const roles: string[] = user?.roles ?? [];
  const isAdminRole = roles.some((r) =>
    ADMIN_ROLE_NAMES.includes(r.toLowerCase()),
  );

  return {
    /** True when the user is a backend superuser (Layer-2 bypass). */
    isSuperuser,
    /** True when the user holds an `admin`/`superadmin` role by name. */
    isAdminRole,
    can: (required: string | readonly string[]) =>
      isSuperuser || can(permissions, required),
    canAny: (required: readonly string[]) =>
      isSuperuser || canAny(permissions, required),
    /**
     * Which codes the user lacks for a single OR-bundle. Returns `[]` when the
     * bundle is satisfied (or the user is a superuser); otherwise the codes the
     * user would need one of. Lets a denied UI name the specific missing
     * permission instead of a generic "access denied".
     */
    missing: (required: string | readonly string[]): string[] => {
      if (isSuperuser) return [];
      const list = Array.isArray(required) ? [...required] : [required as string];
      return can(permissions, list) ? [] : list;
    },
    /**
     * The unmet OR-bundles for an AND-of-OR requirement (same shape as
     * `RouteGuard.requiredAll`). Returns `[]` when every bundle is satisfied;
     * otherwise one entry per bundle the user fails, so the UI can show every
     * missing step of a multi-resource flow (e.g. Closed Won).
     */
    missingAll: (
      requiredAll: readonly (string | readonly string[])[],
    ): string[][] => {
      if (isSuperuser) return [];
      const groups: string[][] = [];
      for (const bundle of requiredAll) {
        const list = typeof bundle === "string" ? [bundle] : [...bundle];
        if (!can(permissions, list)) groups.push(list);
      }
      return groups;
    },
  };
}
