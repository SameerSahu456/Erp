// Permission codes for the audit module.
// Seeded by migration 202605191000_seed_audit_read_permission.py — ungranted
// to any role today; only users.is_superuser=true users pass the gate via
// require_permission()'s superuser bypass.

export const AUDIT_PERMISSIONS = {
  READ: "audit:read",
} as const;
