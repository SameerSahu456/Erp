# CRM Access Control & Lead Rejection Workflow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CRM-specific roles with Pre-Sales/Post-Sales sidebar filtering, product category mapping on mock users, and a lead rejection workflow with dedicated rejected-leads queue page.

**Architecture:** Module-scoped role config (`crm-roles.ts`) defines 9 CRM roles with access levels. `AuthContext` gains a `getAccessLevel()` method. Sidebar filters nav items by access level. Lead type gains `Rejected` stage with reject/reinstate actions on detail page, plus a new `RejectedLeadsPage`.

**Tech Stack:** React, TypeScript, React Router, Lucide icons, existing UI component library (shadcn-style).

**Spec:** `docs/superpowers/specs/2026-04-17-crm-access-control-rejection-workflow-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|---|---|
| `src/modules/crm/crm-roles.ts` | CRM role definitions, access level mapping, manager hierarchy, helper to resolve access level from any UserRole |
| `src/modules/crm/pages/RejectedLeadsPage.tsx` | Dedicated rejected leads queue with filters (owner, reason text search, date range) |

### Modified Files
| File | Change |
|---|---|
| `src/types/auth.ts` | Add 9 CRM role keys to `USER_ROLES` |
| `src/types/navigation.ts` | Add `accessLevel?` to `NavItem` |
| `src/constants/roles.ts` | Add 9 CRM role entries to `ROLE_HIERARCHY` |
| `src/constants/mock-users.ts` | Add 4 mock users with CRM roles + `assignedCategories` |
| `src/contexts/AuthContext.tsx` | Add `getAccessLevel()`, add CRM roles to `hasModuleAccess` |
| `src/components/layout/Sidebar.tsx` | Filter nav items by access level |
| `src/components/layout/sidebar-nav-config.ts` | Add `accessLevel` tags + Rejected Leads nav item |
| `src/modules/crm/types.ts` | Add `'Rejected'` stage, rejection fields, activity types |
| `src/modules/crm/data/leads.ts` | Add 3 rejected leads to mock data |
| `src/modules/crm/data/activities.ts` | Add rejection/reinstatement activity entries |
| `src/modules/crm/pages/LeadsPage.tsx` | Exclude Rejected from kanban and list |
| `src/modules/crm/pages/LeadDetailPage.tsx` | Add Reject dialog + Reinstate button |
| `src/app/router.tsx` | Add `/crm/rejected-leads` route |

---

## Task 1: CRM Role Definitions & Type Foundation

**Files:**
- Modify: `src/types/auth.ts:1-19`
- Modify: `src/types/navigation.ts:1-16`
- Create: `src/modules/crm/crm-roles.ts`

- [ ] **Step 1: Add CRM role keys to USER_ROLES**

In `src/types/auth.ts`, replace the `USER_ROLES` array (lines 1-19):

```typescript
export const USER_ROLES = [
  'SUPERADMIN',
  'ADMIN',
  'PRODUCT_MANAGER',
  'SALES_MANAGER',
  'SALES_REP',
  'WAREHOUSE_MANAGER',
  'WAREHOUSE_EXECUTIVE',
  'INSPECTION_ENGINEER',
  'TECHNICAL_TEAM',
  'QC_ENGINEER',
  'PROCUREMENT_MANAGER',
  'PROCUREMENT_EXEC',
  'FINANCE_MANAGER',
  'FINANCE_EXEC',
  'RENTAL_MANAGER',
  'ECOMMERCE_ADMIN',
  'VIEWER',
  // CRM-specific roles
  'CRM_CHANNEL_MANAGER',
  'CRM_SR_ACCOUNT_MANAGER',
  'CRM_AREA_MANAGER',
  'CRM_BDE_CHANNEL',
  'CRM_INSIDE_SALES_MANAGER',
  'CRM_INSIDE_SALES_REP',
  'CRM_BDE_END_CUSTOMER',
  'CRM_SUPPORT_MANAGER',
  'CRM_SUPPORT_AGENT',
] as const
```

- [ ] **Step 2: Add accessLevel to NavItem**

In `src/types/navigation.ts`, add the `accessLevel` property to `NavItem`:

```typescript
import type { LucideIcon } from 'lucide-react'

export type AccessLevel = 'pre-sales' | 'post-sales' | 'both'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  module?: string
  requiredRole?: string
  accessLevel?: 'pre-sales' | 'post-sales'
}

export interface NavGroup {
  label: string
  module: string
  icon: LucideIcon
  items: NavItem[]
}
```

- [ ] **Step 3: Create crm-roles.ts**

Create `src/modules/crm/crm-roles.ts`:

```typescript
import type { UserRole } from '@/types/auth'
import type { AccessLevel } from '@/types/navigation'

export interface CrmRoleConfig {
  role: UserRole
  label: string
  group: 'channel-sales' | 'end-customer-sales' | 'support'
  accessLevel: AccessLevel
  reportsTo?: UserRole
  canReinstateLead: boolean
}

export const CRM_ROLES: Record<string, CrmRoleConfig> = {
  CRM_CHANNEL_MANAGER: {
    role: 'CRM_CHANNEL_MANAGER',
    label: 'Channel Manager',
    group: 'channel-sales',
    accessLevel: 'both',
    canReinstateLead: true,
  },
  CRM_SR_ACCOUNT_MANAGER: {
    role: 'CRM_SR_ACCOUNT_MANAGER',
    label: 'Sr. Account Manager',
    group: 'channel-sales',
    accessLevel: 'both',
    reportsTo: 'CRM_CHANNEL_MANAGER',
    canReinstateLead: true,
  },
  CRM_AREA_MANAGER: {
    role: 'CRM_AREA_MANAGER',
    label: 'Area Manager',
    group: 'channel-sales',
    accessLevel: 'pre-sales',
    reportsTo: 'CRM_SR_ACCOUNT_MANAGER',
    canReinstateLead: false,
  },
  CRM_BDE_CHANNEL: {
    role: 'CRM_BDE_CHANNEL',
    label: 'BDE (Channel)',
    group: 'channel-sales',
    accessLevel: 'pre-sales',
    reportsTo: 'CRM_AREA_MANAGER',
    canReinstateLead: false,
  },
  CRM_INSIDE_SALES_MANAGER: {
    role: 'CRM_INSIDE_SALES_MANAGER',
    label: 'Inside Sales Manager',
    group: 'end-customer-sales',
    accessLevel: 'both',
    canReinstateLead: true,
  },
  CRM_INSIDE_SALES_REP: {
    role: 'CRM_INSIDE_SALES_REP',
    label: 'Inside Sales Rep',
    group: 'end-customer-sales',
    accessLevel: 'pre-sales',
    reportsTo: 'CRM_INSIDE_SALES_MANAGER',
    canReinstateLead: false,
  },
  CRM_BDE_END_CUSTOMER: {
    role: 'CRM_BDE_END_CUSTOMER',
    label: 'BDE (End Customer)',
    group: 'end-customer-sales',
    accessLevel: 'pre-sales',
    reportsTo: 'CRM_INSIDE_SALES_REP',
    canReinstateLead: false,
  },
  CRM_SUPPORT_MANAGER: {
    role: 'CRM_SUPPORT_MANAGER',
    label: 'Support Manager',
    group: 'support',
    accessLevel: 'post-sales',
    canReinstateLead: false,
  },
  CRM_SUPPORT_AGENT: {
    role: 'CRM_SUPPORT_AGENT',
    label: 'Support Agent',
    group: 'support',
    accessLevel: 'post-sales',
    reportsTo: 'CRM_SUPPORT_MANAGER',
    canReinstateLead: false,
  },
}

/**
 * Resolve the CRM access level for any role.
 * CRM-specific roles use their config. Legacy roles and admins get 'both'.
 */
export function getCrmAccessLevel(role: UserRole): AccessLevel {
  const crmRole = CRM_ROLES[role]
  if (crmRole) return crmRole.accessLevel
  // SUPERADMIN, ADMIN, PRODUCT_MANAGER, SALES_MANAGER, SALES_REP — all get full access
  return 'both'
}

/**
 * Check if a role can reinstate rejected leads.
 * Manager-level CRM roles + legacy manager roles + admins.
 */
export function canReinstateLead(role: UserRole): boolean {
  if (role === 'SUPERADMIN' || role === 'ADMIN' || role === 'SALES_MANAGER') return true
  const crmRole = CRM_ROLES[role]
  return crmRole?.canReinstateLead ?? false
}
```

- [ ] **Step 4: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors related to the new types.

- [ ] **Step 5: Commit**

```bash
git add src/types/auth.ts src/types/navigation.ts src/modules/crm/crm-roles.ts
git commit -m "feat(crm): add CRM role definitions and access level types"
```

---

## Task 2: Role Hierarchy & Mock Users

**Files:**
- Modify: `src/constants/roles.ts:2-110`
- Modify: `src/constants/mock-users.ts:1-69`

- [ ] **Step 1: Add CRM roles to ROLE_HIERARCHY**

In `src/constants/roles.ts`, add the following entries after the `VIEWER` entry (after line 109, before the closing `}`):

```typescript
  // CRM-specific roles
  CRM_CHANNEL_MANAGER: {
    role: 'CRM_CHANNEL_MANAGER',
    label: 'Channel Manager',
    inherits: ['CRM_SR_ACCOUNT_MANAGER'],
    defaultDashboard: '/crm',
  },
  CRM_SR_ACCOUNT_MANAGER: {
    role: 'CRM_SR_ACCOUNT_MANAGER',
    label: 'Sr. Account Manager',
    inherits: ['CRM_AREA_MANAGER'],
    defaultDashboard: '/crm',
  },
  CRM_AREA_MANAGER: {
    role: 'CRM_AREA_MANAGER',
    label: 'Area Manager',
    inherits: ['CRM_BDE_CHANNEL'],
    defaultDashboard: '/crm',
  },
  CRM_BDE_CHANNEL: {
    role: 'CRM_BDE_CHANNEL',
    label: 'BDE (Channel)',
    defaultDashboard: '/crm',
  },
  CRM_INSIDE_SALES_MANAGER: {
    role: 'CRM_INSIDE_SALES_MANAGER',
    label: 'Inside Sales Manager',
    inherits: ['CRM_INSIDE_SALES_REP'],
    defaultDashboard: '/crm',
  },
  CRM_INSIDE_SALES_REP: {
    role: 'CRM_INSIDE_SALES_REP',
    label: 'Inside Sales Rep',
    inherits: ['CRM_BDE_END_CUSTOMER'],
    defaultDashboard: '/crm',
  },
  CRM_BDE_END_CUSTOMER: {
    role: 'CRM_BDE_END_CUSTOMER',
    label: 'BDE (End Customer)',
    defaultDashboard: '/crm',
  },
  CRM_SUPPORT_MANAGER: {
    role: 'CRM_SUPPORT_MANAGER',
    label: 'Support Manager',
    inherits: ['CRM_SUPPORT_AGENT'],
    defaultDashboard: '/crm',
  },
  CRM_SUPPORT_AGENT: {
    role: 'CRM_SUPPORT_AGENT',
    label: 'Support Agent',
    defaultDashboard: '/crm',
  },
```

- [ ] **Step 2: Add mock users with CRM roles**

In `src/constants/mock-users.ts`, add 4 new users after the existing entries (after the Deepak Kumar entry, before the closing `]`):

```typescript
  {
    id: '9',
    name: 'Meera Kapoor',
    email: 'meera@comprinttech.com',
    avatar: '',
    role: 'CRM_CHANNEL_MANAGER',
    permissions: [],
    assignedCategories: ['Servers', 'Storage', 'Networking'],
  },
  {
    id: '10',
    name: 'Arjun Nair',
    email: 'arjun@comprinttech.com',
    avatar: '',
    role: 'CRM_BDE_CHANNEL',
    permissions: [],
    assignedCategories: ['Servers'],
  },
  {
    id: '11',
    name: 'Divya Reddy',
    email: 'divya@comprinttech.com',
    avatar: '',
    role: 'CRM_INSIDE_SALES_REP',
    permissions: [],
    assignedCategories: ['Laptops', 'Desktops'],
  },
  {
    id: '12',
    name: 'Sanjay Patil',
    email: 'sanjay@comprinttech.com',
    avatar: '',
    role: 'CRM_SUPPORT_AGENT',
    permissions: [],
    assignedCategories: ['Servers', 'Networking'],
  },
```

Also add `assignedCategories` to existing mock user Sneha Patel (id: '4', SALES_MANAGER):

```typescript
  {
    id: '4',
    name: 'Sneha Patel',
    email: 'sneha@comprinttech.com',
    avatar: '',
    role: 'SALES_MANAGER',
    permissions: [],
    assignedCategories: ['Servers', 'Storage', 'Networking', 'Laptops', 'Desktops'],
  },
```

- [ ] **Step 3: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/constants/roles.ts src/constants/mock-users.ts
git commit -m "feat(crm): add CRM roles to hierarchy and mock users with categories"
```

---

## Task 3: AuthContext — Access Level & Module Access

**Files:**
- Modify: `src/contexts/AuthContext.tsx`

- [ ] **Step 1: Add getAccessLevel to AuthContext**

In `src/contexts/AuthContext.tsx`, add the import at the top:

```typescript
import { getCrmAccessLevel } from '@/modules/crm/crm-roles'
```

Add CRM roles to the `roleModules` map inside `hasModuleAccess` (after line 75, the `ECOMMERCE_ADMIN` entry):

```typescript
        CRM_CHANNEL_MANAGER: ['crm'],
        CRM_SR_ACCOUNT_MANAGER: ['crm'],
        CRM_AREA_MANAGER: ['crm'],
        CRM_BDE_CHANNEL: ['crm'],
        CRM_INSIDE_SALES_MANAGER: ['crm'],
        CRM_INSIDE_SALES_REP: ['crm'],
        CRM_BDE_END_CUSTOMER: ['crm'],
        CRM_SUPPORT_MANAGER: ['crm'],
        CRM_SUPPORT_AGENT: ['crm'],
```

Add the `getAccessLevel` callback after the `hasModuleAccess` callback (after line 84):

```typescript
  const getAccessLevel = useCallback(
    (module: string): 'pre-sales' | 'post-sales' | 'both' => {
      if (module === 'crm') return getCrmAccessLevel(user.role)
      return 'both'
    },
    [user.role]
  )
```

Update the `AuthContextValue` interface to include `getAccessLevel`:

```typescript
interface AuthContextValue {
  user: User
  switchUser: (userId: string) => void
  switchRole: (role: UserRole) => void
  hasRole: (role: UserRole) => boolean
  hasPermission: (module: string, entity: string, action: PermissionAction) => boolean
  hasModuleAccess: (module: string) => boolean
  getAccessLevel: (module: string) => 'pre-sales' | 'post-sales' | 'both'
  getDefaultDashboard: () => string
  allUsers: User[]
}
```

Add `getAccessLevel` to the Provider value object:

```typescript
      value={{
        user,
        switchUser,
        switchRole,
        hasRole,
        hasPermission,
        hasModuleAccess,
        getAccessLevel,
        getDefaultDashboard,
        allUsers: MOCK_USERS,
      }}
```

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/AuthContext.tsx
git commit -m "feat(crm): add getAccessLevel to AuthContext and CRM module access"
```

---

## Task 4: Sidebar Filtering by Access Level

**Files:**
- Modify: `src/components/layout/sidebar-nav-config.ts`
- Modify: `src/components/layout/Sidebar.tsx:183-200`

- [ ] **Step 1: Add accessLevel tags and Rejected Leads to sidebar config**

In `src/components/layout/sidebar-nav-config.ts`, add the `XCircle` import to the icon imports:

```typescript
import {
  // ... existing imports ...
  XCircle,
} from 'lucide-react'
```

Update the CRM items array to add `accessLevel` tags and the Rejected Leads entry. Replace the entire CRM group (lines 51-69):

```typescript
  {
    label: 'CRM',
    module: 'crm',
    icon: Users,
    items: [
      { label: 'Dashboard', href: '/crm', icon: LayoutDashboard, module: 'crm' },
      { label: 'Leads', href: '/crm/leads', icon: Users, module: 'crm', accessLevel: 'pre-sales' },
      { label: 'Rejected Leads', href: '/crm/rejected-leads', icon: XCircle, module: 'crm', accessLevel: 'pre-sales' },
      { label: 'Deals', href: '/crm/deals', icon: Handshake, module: 'crm', accessLevel: 'pre-sales' },
      { label: 'Accounts', href: '/crm/accounts', icon: Building2, module: 'crm', accessLevel: 'pre-sales' },
      { label: 'Contacts', href: '/crm/contacts', icon: Contact, module: 'crm', accessLevel: 'pre-sales' },
      { label: 'Quotes', href: '/crm/quotes', icon: FileText, module: 'crm', accessLevel: 'pre-sales' },
      { label: 'Quote Builder', href: '/crm/quote-builder', icon: Hammer, module: 'crm', accessLevel: 'pre-sales' },
      { label: 'Material Inquiries', href: '/crm/material-inquiries', icon: PackageSearch, module: 'crm', accessLevel: 'pre-sales' },
      { label: 'Demo Requests', href: '/crm/demo-requests', icon: Monitor, module: 'crm', accessLevel: 'pre-sales' },
      { label: 'Sales Orders', href: '/crm/sales-orders', icon: ShoppingCart, module: 'crm', accessLevel: 'post-sales' },
      { label: 'Purchase Requests', href: '/crm/purchase-requests', icon: FilePlus, module: 'crm', accessLevel: 'post-sales' },
      { label: 'PM Approvals', href: '/crm/pm-approvals', icon: ShieldCheck, module: 'crm', accessLevel: 'post-sales' },
    ],
  },
```

Note: `Invoices` was already a separate top-level module, not in the CRM group, so no change needed there.

- [ ] **Step 2: Update Sidebar filtering to check accessLevel**

In `src/components/layout/Sidebar.tsx`, update the `Sidebar` component. Change the import to include `getAccessLevel`:

```typescript
  const { hasModuleAccess, hasRole, getAccessLevel } = useAuth()
```

Update the `filteredNav` logic (lines 189-200) to also filter by access level:

```typescript
  const filteredNav = SIDEBAR_NAV
    .filter((group) => hasModuleAccess(group.module))
    .map((group) => {
      const moduleAccessLevel = getAccessLevel(group.module)
      return {
        ...group,
        items: group.items.filter((item) => {
          if (item.requiredRole) {
            if (!hasRole(item.requiredRole as import('@/types/auth').UserRole)) return false
          }
          if (item.accessLevel) {
            if (moduleAccessLevel === 'both') return true
            if (item.accessLevel !== moduleAccessLevel) return false
          }
          return true
        }),
      }
    })
    .filter((group) => group.items.length > 0)
```

- [ ] **Step 3: Verify the app compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/sidebar-nav-config.ts src/components/layout/Sidebar.tsx
git commit -m "feat(crm): filter sidebar nav items by pre-sales/post-sales access level"
```

---

## Task 5: Lead Type & Mock Data — Rejection Support

**Files:**
- Modify: `src/modules/crm/types.ts:1-16, 162-171, 308`
- Modify: `src/modules/crm/data/leads.ts`
- Modify: `src/modules/crm/data/activities.ts`

- [ ] **Step 1: Update Lead interface and stage types**

In `src/modules/crm/types.ts`, update the `Lead` interface (lines 1-16):

```typescript
export interface Lead {
  id: string
  name: string
  company: string
  email: string
  phone: string
  stage: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost' | 'Rejected'
  value: number
  source: string
  owner: string
  lastContact: string
  createdAt: string
  notes?: string
  description: string
  categories: string[]
  rejectedAt?: string
  rejectedBy?: string
  rejectionReason?: string
}
```

Update `LEAD_STAGES` (line 308) — keep pipeline-only stages (Rejected is a side-exit):

```typescript
export const LEAD_STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'] as const
```

Update `Activity` type (lines 162-171) to add rejection/reinstatement:

```typescript
export interface Activity {
  id: string
  type: 'call' | 'email' | 'meeting' | 'task' | 'note' | 'stage_change' | 'rejection' | 'reinstatement'
  title: string
  description?: string
  user: string
  timestamp: string
  entityType: 'lead' | 'deal' | 'account' | 'contact'
  entityId: string
  metadata?: Record<string, string>
}
```

- [ ] **Step 2: Add rejected leads to mock data**

In `src/modules/crm/data/leads.ts`, add 3 rejected leads at the end of the array (before the closing `]`):

```typescript
  {
    id: 'LEAD-016',
    name: 'Rakesh Pandey',
    company: 'Zenith Infotech',
    email: 'rakesh.pandey@zenithinfotech.in',
    phone: '+91 98765 11111',
    stage: 'Rejected',
    value: 350000,
    source: 'Website',
    owner: 'Amit Patel',
    lastContact: '2026-04-10',
    createdAt: '2026-04-08',
    description: 'Inquiry for 5 refurbished servers. Budget too low for our minimum order.',
    categories: ['Servers'],
    rejectedAt: '2026-04-10',
    rejectedBy: 'Amit Patel',
    rejectionReason: 'Budget below minimum order threshold. Client looking for refurbished equipment only.',
  },
  {
    id: 'LEAD-017',
    name: 'Geeta Verma',
    company: 'Small Office Solutions',
    email: 'geeta@smalloffice.co.in',
    phone: '+91 99887 22222',
    stage: 'Rejected',
    value: 120000,
    source: 'Cold Call',
    owner: 'Sneha Desai',
    lastContact: '2026-04-07',
    createdAt: '2026-04-05',
    description: 'Looking for consumer-grade laptops. Not in our product range.',
    categories: ['Laptops'],
    rejectedAt: '2026-04-07',
    rejectedBy: 'Sneha Desai',
    rejectionReason: 'Consumer segment — not enterprise. Referred to retail partner.',
  },
  {
    id: 'LEAD-018',
    name: 'Farhan Sheikh',
    company: 'DataCore Analytics',
    email: 'farhan@datacore.in',
    phone: '+91 97654 33333',
    stage: 'Rejected',
    value: 600000,
    source: 'LinkedIn',
    owner: 'Rahul Verma',
    lastContact: '2026-04-12',
    createdAt: '2026-04-09',
    description: 'Wanted custom-built servers with non-standard configurations we cannot support.',
    categories: ['Servers', 'Storage'],
    rejectedAt: '2026-04-12',
    rejectedBy: 'Rahul Verma',
    rejectionReason: 'Non-standard configuration requirements. Cannot fulfill custom build requests.',
  },
```

- [ ] **Step 3: Add rejection/reinstatement activities to mock data**

In `src/modules/crm/data/activities.ts`, add entries at the end of the array (before the closing `]`):

```typescript
  {
    id: 'ACT-029',
    type: 'rejection',
    title: 'Lead rejected — budget below threshold',
    description: 'Budget below minimum order threshold. Client looking for refurbished equipment only.',
    user: 'Amit Patel',
    timestamp: '2026-04-10T14:00:00Z',
    entityType: 'lead',
    entityId: 'LEAD-016',
    metadata: { reason: 'Budget below minimum order threshold. Client looking for refurbished equipment only.', previousStage: 'New' },
  },
  {
    id: 'ACT-030',
    type: 'rejection',
    title: 'Lead rejected — consumer segment',
    description: 'Consumer segment — not enterprise. Referred to retail partner.',
    user: 'Sneha Desai',
    timestamp: '2026-04-07T11:30:00Z',
    entityType: 'lead',
    entityId: 'LEAD-017',
    metadata: { reason: 'Consumer segment — not enterprise. Referred to retail partner.', previousStage: 'Contacted' },
  },
  {
    id: 'ACT-031',
    type: 'rejection',
    title: 'Lead rejected — non-standard config',
    description: 'Non-standard configuration requirements. Cannot fulfill custom build requests.',
    user: 'Rahul Verma',
    timestamp: '2026-04-12T16:00:00Z',
    entityType: 'lead',
    entityId: 'LEAD-018',
    metadata: { reason: 'Non-standard configuration requirements. Cannot fulfill custom build requests.', previousStage: 'New' },
  },
```

- [ ] **Step 4: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/crm/types.ts src/modules/crm/data/leads.ts src/modules/crm/data/activities.ts
git commit -m "feat(crm): add Rejected lead stage with mock data and activity types"
```

---

## Task 6: LeadsPage — Exclude Rejected Leads

**Files:**
- Modify: `src/modules/crm/pages/LeadsPage.tsx`

- [ ] **Step 1: Filter out rejected leads from both views**

In `src/modules/crm/pages/LeadsPage.tsx`, update the `groupLeadsByStage` call on line 113 and the `listTab` data on line 71.

For the kanban view, update the `useState` initializer (line 112-114):

```typescript
  const [kanbanItems, setKanbanItems] = useState(() =>
    groupLeadsByStage(leads.filter((l) => l.stage !== 'Rejected'))
  )
```

For the list view, update the `listTab` data property (line 71-81). Replace the `data` property:

```typescript
  data: leads
    .filter((l) => l.stage !== 'Rejected')
    .map((l) => ({
      id: l.id,
      name: l.name,
      company: l.company,
      stage: l.stage,
      value: l.value,
      owner: l.owner,
      source: l.source,
      lastContact: l.lastContact,
    })),
```

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/crm/pages/LeadsPage.tsx
git commit -m "feat(crm): exclude rejected leads from kanban and list views"
```

---

## Task 7: LeadDetailPage — Reject & Reinstate Actions

**Files:**
- Modify: `src/modules/crm/pages/LeadDetailPage.tsx`

- [ ] **Step 1: Add reject dialog and reinstate button**

In `src/modules/crm/pages/LeadDetailPage.tsx`, add the following imports at the top (merge with existing imports):

```typescript
import { XCircle, RotateCcw } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { canReinstateLead } from '@/modules/crm/crm-roles'
```

Inside the `LeadDetailPage` function, after the existing `deleteDialogOpen` state (line 116), add:

```typescript
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [reinstateDialogOpen, setReinstateDialogOpen] = useState(false)
  const [reinstateNote, setReinstateNote] = useState('')
  const { user } = useAuth()
  const userCanReinstate = canReinstateLead(user.role)
```

Add the handler functions after `handleDelete` (after line 169):

```typescript
  function handleReject() {
    // In real app: API call to update lead stage + create activity
    setRejectDialogOpen(false)
    setRejectionReason('')
    navigate('/crm/leads')
  }

  function handleReinstate() {
    // In real app: API call to move lead to Qualified + create activity
    setReinstateDialogOpen(false)
    setReinstateNote('')
    navigate('/crm/leads')
  }
```

In the `EntityHeader` `actions` prop, add the Reject and Reinstate buttons. After the existing Edit button and before the Delete dialog (inside the `<>` fragment):

```tsx
            {/* Reject — only for New/Contacted leads */}
            {(lead.stage === 'New' || lead.stage === 'Contacted') && (
              <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogTrigger render={<Button variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10" />}>
                  <XCircle className="size-3.5" data-icon="inline-start" />
                  Reject
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Reject Lead</DialogTitle>
                    <DialogDescription>
                      Mark "{lead.name}" as rejected. This will move the lead out of the active pipeline.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                    <Textarea
                      id="rejection-reason"
                      placeholder="Enter the reason for rejection..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={!rejectionReason.trim()}
                    >
                      Reject Lead
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Reinstate — only for Rejected leads, manager roles only */}
            {lead.stage === 'Rejected' && userCanReinstate && (
              <Dialog open={reinstateDialogOpen} onOpenChange={setReinstateDialogOpen}>
                <DialogTrigger render={<Button variant="outline" size="sm" />}>
                  <RotateCcw className="size-3.5" data-icon="inline-start" />
                  Move to Qualified
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Reinstate Lead</DialogTitle>
                    <DialogDescription>
                      Move "{lead.name}" back to the Qualified stage. This will return the lead to the active pipeline.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="reinstate-note">Note (optional)</Label>
                    <Textarea
                      id="reinstate-note"
                      placeholder="Why is this lead being reinstated?"
                      value={reinstateNote}
                      onChange={(e) => setReinstateNote(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setReinstateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleReinstate}>
                      Move to Qualified
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
```

Also update the `getStageVariant` function to handle Rejected:

```typescript
    case 'Rejected':
      return 'error'
```

And in the Stage Progress card, handle the Rejected state alongside Lost. Replace the `isLost` check (line 164-165):

```typescript
  const isLost = lead.stage === 'Lost'
  const isRejected = lead.stage === 'Rejected'
```

Update the Stage Progress content to handle Rejected (replace lines 252-285):

```tsx
          {isLost ? (
            <div className="flex items-center gap-2">
              <StatusBadge variant="error">Lost</StatusBadge>
              <span className="text-sm text-muted-foreground">This lead has been marked as lost.</span>
            </div>
          ) : isRejected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StatusBadge variant="error">Rejected</StatusBadge>
                <span className="text-sm text-muted-foreground">This lead has been rejected.</span>
              </div>
              {lead.rejectionReason && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Reason:</span> {lead.rejectionReason}
                </p>
              )}
              {lead.rejectedBy && lead.rejectedAt && (
                <p className="text-xs text-muted-foreground">
                  By {lead.rejectedBy} on {formatDate(lead.rejectedAt)}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {pipelineStages.map((stage, index) => {
                const isActive = index === currentStageIndex
                const isCompleted = index < currentStageIndex
                return (
                  <div key={stage} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        'h-2 w-full rounded-full transition-colors',
                        isCompleted && 'bg-primary',
                        isActive && 'bg-primary',
                        !isCompleted && !isActive && 'bg-muted'
                      )}
                    />
                    <span
                      className={cn(
                        'text-[10px] font-ui leading-tight',
                        isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {stage}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
```

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/crm/pages/LeadDetailPage.tsx
git commit -m "feat(crm): add reject and reinstate actions to lead detail page"
```

---

## Task 8: RejectedLeadsPage & Route Registration

**Files:**
- Create: `src/modules/crm/pages/RejectedLeadsPage.tsx`
- Modify: `src/app/router.tsx`

- [ ] **Step 1: Create RejectedLeadsPage**

Create `src/modules/crm/pages/RejectedLeadsPage.tsx`:

```tsx
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { XCircle, Search, X } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/common/StatusBadge'
import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { Badge } from '@/components/ui/badge'

import { leads } from '@/modules/crm/data/leads'

const formatCurrency = (value: number) =>
  `\u20B9${(value / 100000).toFixed(1)}L`

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function RejectedLeadsPage() {
  const [reasonFilter, setReasonFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const rejectedLeads = useMemo(() => {
    return leads.filter((l) => {
      if (l.stage !== 'Rejected') return false
      if (reasonFilter && !l.rejectionReason?.toLowerCase().includes(reasonFilter.toLowerCase())) return false
      if (ownerFilter !== 'all' && l.owner !== ownerFilter) return false
      if (dateFrom && l.rejectedAt && l.rejectedAt < dateFrom) return false
      if (dateTo && l.rejectedAt && l.rejectedAt > dateTo) return false
      return true
    })
  }, [reasonFilter, ownerFilter, dateFrom, dateTo])

  const owners = useMemo(() => {
    const set = new Set(leads.filter((l) => l.stage === 'Rejected').map((l) => l.owner))
    return Array.from(set).sort()
  }, [])

  const hasActiveFilters = reasonFilter || ownerFilter !== 'all' || dateFrom || dateTo

  function clearFilters() {
    setReasonFilter('')
    setOwnerFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  const tab: TabConfig = {
    id: 'rejected',
    label: 'Rejected Leads',
    columns: [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'company', label: 'Company', sortable: true },
      { key: 'owner', label: 'Owner', sortable: true },
      { key: 'rejectionReason', label: 'Rejection Reason', sortable: false },
      { key: 'rejectedAt', label: 'Rejected Date', sortable: true },
      { key: 'value', label: 'Value', sortable: true, align: 'right' },
      { key: 'categories', label: 'Categories', sortable: false },
    ],
    data: rejectedLeads.map((l) => ({
      id: l.id,
      name: l.name,
      company: l.company,
      owner: l.owner,
      rejectionReason: l.rejectionReason ?? '',
      rejectedAt: l.rejectedAt ?? '',
      value: l.value,
      categories: l.categories.join(', '),
    })),
  }

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'name' && typeof value === 'string') {
      return {
        display: (
          <Link to={`/crm/leads/${row['id']}`} className="text-primary hover:underline font-medium">
            {value}
          </Link>
        ),
      }
    }
    if (key === 'value' && typeof value === 'number') {
      return { display: formatCurrency(value) }
    }
    if (key === 'rejectedAt' && typeof value === 'string' && value) {
      return { display: formatDate(value) }
    }
    if (key === 'rejectionReason' && typeof value === 'string') {
      return {
        display: (
          <span className="text-sm text-muted-foreground line-clamp-2">{value}</span>
        ),
      }
    }
    if (key === 'categories' && typeof value === 'string') {
      return {
        display: (
          <div className="flex flex-wrap gap-1">
            {value.split(', ').map((cat) => (
              <Badge key={cat} variant="secondary" className="text-[10px]">{cat}</Badge>
            ))}
          </div>
        ),
      }
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <XCircle className="size-6 text-destructive" />
          <h2 className="text-2xl font-display font-semibold">Rejected Leads</h2>
          <StatusBadge variant="error">{rejectedLeads.length}</StatusBadge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search rejection reason..."
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Owners</SelectItem>
            {owners.map((owner) => (
              <SelectItem key={owner} value={owner}>{owner}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
            placeholder="From"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
            placeholder="To"
          />
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="size-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <BusinessMetricsTable
        tabs={[tab]}
        cellFormatter={cellFormatter}
        pageSize={10}
      />
    </div>
  )
}

export default RejectedLeadsPage
```

- [ ] **Step 2: Add route to router**

In `src/app/router.tsx`, add the lazy import at the top with the other CRM imports:

```typescript
const RejectedLeadsPage = lazy(() => import('@/modules/crm/pages/RejectedLeadsPage'))
```

Add the route in the CRM routes section (after the `/crm/leads/:id` route, around line 172):

```typescript
      { path: '/crm/rejected-leads', element: <LazyRoute><RejectedLeadsPage /></LazyRoute> },
```

- [ ] **Step 3: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/crm/pages/RejectedLeadsPage.tsx src/app/router.tsx
git commit -m "feat(crm): add rejected leads page with filters and route"
```

---

## Task 9: Verify End-to-End in Browser

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Test as SUPERADMIN (Amar Daxini)**

1. Open browser, navigate to `/crm/leads`
2. Verify Kanban has no Rejected leads visible
3. Verify List view has no Rejected leads
4. Navigate to `/crm/rejected-leads` from sidebar
5. Verify 3 rejected leads appear in the table
6. Verify filters work: type in reason search, select an owner, set date range
7. Click a rejected lead name → verify LeadDetailPage shows "Rejected" badge and rejection reason
8. Verify "Move to Qualified" button is visible (SUPERADMIN can reinstate)
9. Click "Move to Qualified" → verify dialog opens with optional note textarea
10. Navigate to a New lead → verify "Reject" button is visible
11. Click "Reject" → verify dialog opens with required reason textarea
12. Verify all CRM sidebar items are visible (both pre-sales and post-sales pages)

- [ ] **Step 3: Test as CRM_BDE_CHANNEL (Arjun Nair)**

1. Use DevRoleSwitcher to switch to Arjun Nair
2. Verify sidebar only shows CRM module
3. Verify only pre-sales pages are visible (Leads, Rejected Leads, Deals, Accounts, Contacts, Quotes, Quote Builder, Material Inquiries, Demo Requests)
4. Verify post-sales pages are hidden (Sales Orders, Purchase Requests, PM Approvals)
5. Navigate to a Rejected lead → verify "Move to Qualified" button is NOT visible (BDE cannot reinstate)

- [ ] **Step 4: Test as CRM_SUPPORT_AGENT (Sanjay Patil)**

1. Use DevRoleSwitcher to switch to Sanjay Patil
2. Verify sidebar shows CRM module
3. Verify only post-sales pages are visible (Sales Orders, Purchase Requests, PM Approvals)
4. Verify pre-sales pages are hidden (Leads, Deals, etc.)

- [ ] **Step 5: Test as CRM_CHANNEL_MANAGER (Meera Kapoor)**

1. Use DevRoleSwitcher to switch to Meera Kapoor
2. Verify all CRM sidebar items are visible (access level: both)
3. Navigate to a Rejected lead → verify "Move to Qualified" button IS visible (Channel Manager can reinstate)

- [ ] **Step 6: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(crm): address issues found during e2e testing"
```
