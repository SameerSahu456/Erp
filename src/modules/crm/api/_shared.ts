// Shared CRM API primitives used across multiple domain modules.

export interface CrmIdNameRef {
  id: string
  name: string
}

// Per-entity relation counts for a lead/deal detail page — one call powers
// every tab-count badge (notes, comments, tasks, quotes, material inquiries,
// audit trail). Backed by GET /crm/leads/{id}/stats and /crm/deals/{id}/stats
// (schema `EntityStatsResponse`). Counts are soft-delete-aware; the parent
// visibility guard runs first, so a viewer who can't see the entity gets a
// 404 rather than zeros.
export interface CrmEntityStats {
  notes: number
  comments: number
  tasks: number
  quotes: number
  material_inquiries: number
  sales_orders: number
  audit_trail: number
}
