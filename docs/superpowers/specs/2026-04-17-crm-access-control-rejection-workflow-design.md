# CRM Access Control & Lead Rejection Workflow — Design Spec

**Date:** 2026-04-17
**Status:** Approved
**Scope:** CRM module access control foundation + lead rejection workflow

---

## 1. Overview

Two features built together because they share the same role/permission infrastructure:

1. **CRM Access Control** — Module-scoped roles with Pre-Sales/Post-Sales access levels and product category mapping for data visibility filtering.
2. **Lead Rejection Workflow** — Early-stage leads (New/Contacted) can be rejected with a reason, moved to a dedicated Rejected Leads queue, and reinstated by managers.

### 1.1 Architecture Decision

**Module-scoped role configs with a single auth layer.** Each module (CRM, WMS, Procurement, etc.) will own its role definitions in a config file (e.g., `crm-roles.ts`). The central `AuthContext` reads the active module's config to determine sidebar filtering, access levels, and permissions. Other modules will follow this pattern when they add their own role hierarchies.

---

## 2. CRM Roles & Access Levels

### 2.1 Role Definitions

Eight new CRM-specific roles added alongside existing operational roles:

| Role Key | Label | Group | Access Level | Can Delete |
|---|---|---|---|---|
| `CRM_CHANNEL_MANAGER` | Channel Manager | Channel Sales | Both | No |
| `CRM_SR_ACCOUNT_MANAGER` | Sr. Account Manager | Channel Sales | Both | No |
| `CRM_AREA_MANAGER` | Area Manager | Channel Sales | Pre-Sales | No |
| `CRM_BDE_CHANNEL` | BDE (Channel) | Channel Sales | Pre-Sales | No |
| `CRM_INSIDE_SALES_MANAGER` | Inside Sales Manager | End Customer | Both | No |
| `CRM_INSIDE_SALES_REP` | Inside Sales Rep | End Customer | Pre-Sales | No |
| `CRM_BDE_END_CUSTOMER` | BDE (End Customer) | End Customer | Pre-Sales | No |
| `CRM_SUPPORT_MANAGER` | Support Manager | Support | Post-Sales | No |
| `CRM_SUPPORT_AGENT` | Support Agent | Support | Post-Sales | No |

**Existing roles behavior:** SUPERADMIN and ADMIN get `accessLevel: 'both'` and bypass all category restrictions. PRODUCT_MANAGER, SALES_MANAGER, SALES_REP also get `accessLevel: 'both'` for backward compatibility. All new CRM roles get `module: 'crm'` access — they only see the CRM sidebar group (plus Settings for profile access).

**Permissions:** Only SUPERADMIN and ADMIN can delete records. All other roles can view, create, and edit.

### 2.2 Manager Hierarchy

```
Channel Sales:
  Channel Manager → Sr. Account Manager → Area Manager → BDE (Channel)

End Customer Sales:
  Inside Sales Manager → Inside Sales Rep → BDE (End Customer)

Support:
  Support Manager → Support Agent
```

Managers see data of users reporting to them, within their assigned categories.

### 2.3 Access Level → Page Mapping

**Pre-Sales pages:** Dashboard, Leads, Rejected Leads, Deals, Accounts, Contacts, Quotes, Quote Builder, Material Inquiries, Demo Requests

**Post-Sales pages:** Dashboard, Sales Orders, Purchase Requests, PM Approvals, Invoices

**Both:** All CRM pages

---

## 3. Product Category Mapping

### 3.1 How It Works

- Every non-admin CRM user is mapped to one or more product categories via `assignedCategories: string[]` on their User profile.
- CRM records (Lead, Deal) already have `categories: string[]` — this is the matching field.
- List pages filter records to show only those matching the user's assigned categories.
- When creating a record, the category dropdown only shows the user's assigned categories.
- SUPERADMIN and ADMIN see all records regardless of category mapping.

### 3.2 Existing Infrastructure

- `User.assignedCategories` already exists in `src/types/auth.ts`.
- `PermissionGate` already supports `categoryScope` prop.
- Only one mock user (Rahul Mehta) currently has categories set — more will be added.

---

## 4. Lead Rejection Workflow

### 4.1 Type Changes

Lead stage union adds `'Rejected'`:
```
'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost' | 'Rejected'
```

`LEAD_STAGES` const keeps the pipeline order and excludes `Rejected` (it's a side-exit, not a pipeline stage).

New fields on Lead:
```typescript
rejectedAt?: string
rejectedBy?: string
rejectionReason?: string
```

Activity type union adds `'rejection' | 'reinstatement'`.

### 4.2 Reject Action (LeadDetailPage)

- "Reject" button visible only when lead stage is `New` or `Contacted`.
- Opens a dialog with a required textarea for rejection reason.
- On confirm: stage → `Rejected`, logs an Activity with type `'rejection'` and metadata `{ reason, previousStage }`.

### 4.3 Reinstate Action (LeadDetailPage — managers only)

- When viewing a Rejected lead, manager roles see a "Move to Qualified" button.
- Eligible roles: `CRM_CHANNEL_MANAGER`, `CRM_SR_ACCOUNT_MANAGER`, `CRM_INSIDE_SALES_MANAGER`, `SALES_MANAGER`, `ADMIN`, `SUPERADMIN`.
- Opens a dialog with an optional textarea for reinstatement note.
- On confirm: stage → `Qualified`, logs an Activity with type `'reinstatement'` and metadata `{ note, previousStage: 'Rejected' }`.

### 4.4 LeadsPage Changes

- Kanban board excludes Rejected leads from the pipeline.
- List view excludes Rejected leads (they have their own dedicated page).

### 4.5 RejectedLeadsPage (new)

- Route: `/crm/rejected-leads`
- Table view using `BusinessMetricsTable`.
- Columns: Name, Company, Owner, Rejection Reason, Rejected Date, Categories.
- Filters: Rejection Reason (text search), Owner (dropdown), Date Range (date picker).
- Row click navigates to `LeadDetailPage` where managers can reinstate.
- Sidebar nav: "Rejected Leads" between Leads and Deals, `XCircle` icon.

---

## 5. Sidebar & Navigation Integration

### 5.1 NavItem Type Extension

```typescript
interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  module?: string
  requiredRole?: string
  accessLevel?: 'pre-sales' | 'post-sales'  // NEW — unset = visible to all
}
```

### 5.2 CRM Nav Items with Access Level Tags

| Nav Item | accessLevel |
|---|---|
| Dashboard | _(none — always visible)_ |
| Leads | `pre-sales` |
| Rejected Leads | `pre-sales` |
| Deals | `pre-sales` |
| Accounts | `pre-sales` |
| Contacts | `pre-sales` |
| Quotes | `pre-sales` |
| Quote Builder | `pre-sales` |
| Material Inquiries | `pre-sales` |
| Demo Requests | `pre-sales` |
| Sales Orders | `post-sales` |
| Purchase Requests | `post-sales` |
| PM Approvals | `post-sales` |
| Invoices | `post-sales` |

### 5.3 Sidebar Filtering Logic

Current: `hasModuleAccess(group.module)` + `requiredRole` check.

New filter added: if nav item has `accessLevel`, check user's derived access level via `getAccessLevel('crm')`.

Resolution: look up user's role in `crm-roles.ts` config → get `accessLevel`. If role not in CRM config (e.g., SUPERADMIN, ADMIN), default to `'both'`. Access level `'both'` passes all filters.

### 5.4 AuthContext Addition

New method: `getAccessLevel(module: string): 'pre-sales' | 'post-sales' | 'both'`

For now only the CRM module implements this. Returns `'both'` for unknown modules.

---

## 6. File Changes

### New Files

| File | Purpose |
|---|---|
| `src/modules/crm/crm-roles.ts` | CRM role definitions, access levels, manager hierarchy |
| `src/modules/crm/pages/RejectedLeadsPage.tsx` | Rejected leads queue with filters |

### Modified Files

| File | Change |
|---|---|
| `src/types/auth.ts` | Add 9 CRM role keys to `USER_ROLES` union |
| `src/types/navigation.ts` | Add `accessLevel?` to `NavItem` |
| `src/constants/roles.ts` | Add CRM role entries to `ROLE_HIERARCHY` |
| `src/constants/mock-users.ts` | Add mock users with CRM roles and `assignedCategories` |
| `src/contexts/AuthContext.tsx` | Add `getAccessLevel()` method, import CRM role config |
| `src/components/layout/Sidebar.tsx` | Filter nav items by access level |
| `src/components/layout/sidebar-nav-config.ts` | Add `accessLevel` tags to CRM items, add Rejected Leads nav item |
| `src/modules/crm/types.ts` | Add `'Rejected'` to Lead stage, add rejection fields, add activity types |
| `src/modules/crm/data/leads.ts` | Add rejected leads to mock data |
| `src/modules/crm/pages/LeadsPage.tsx` | Exclude Rejected from kanban and list |
| `src/modules/crm/pages/LeadDetailPage.tsx` | Add Reject dialog, Reinstate button for managers |
| `src/app/router.tsx` | Add route for `/crm/rejected-leads` |

### Not Touched

All non-CRM modules, existing operational roles, PermissionGate (already supports categoryScope).
