# Comprint Theme — Enterprise UI Kit & Application Foundation

**Date:** 2026-04-15
**Status:** Design
**Purpose:** Production foundation for a unified comprint platform UI. Build pages and components now; connect to real FastAPI backends later as specs solidify. This is the single design system that all comprint modules will share.

---

## 1. Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| UI Library | Shadcn UI (Radix primitives), CLI-installed, source-owned |
| Icons | Lucide React |
| Drag & Drop | @dnd-kit (matching existing CRM) |
| Rich Text | TipTap (MinimalTiptap variant) |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Auto Forms | AutoForm (Zod schema → form generation) |
| Mock API | MSW (Mock Service Worker) |
| Routing | React Router (single SPA, route-based code splitting) |
| State | React Context (Auth, Theme, Sidebar) + useState/useReducer for forms |

---

## 2. Project Structure

```
comprint-theme/
├── public/
│   └── assets/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx           # React Router with lazy loading
│   │   └── providers.tsx        # Composed context providers
│   ├── components/
│   │   ├── ui/                  # Shadcn UI base (~30 components)
│   │   ├── common/              # Shared domain components (32 components)
│   │   │   ├── BusinessMetricsTable/
│   │   │   ├── WorkflowStepper/
│   │   │   ├── KanbanBoard/
│   │   │   ├── PermissionGate/
│   │   │   ├── StatusBadge/
│   │   │   ├── InspectionForm/
│   │   │   ├── InventoryTree/
│   │   │   ├── MultiStepWizard/
│   │   │   ├── FloatingQueryButton/
│   │   │   ├── DataCard/
│   │   │   ├── MultiSelect/
│   │   │   ├── MultiSelectSearch/
│   │   │   ├── AutoForm/
│   │   │   ├── CascaderSelect/
│   │   │   ├── TagInput/
│   │   │   ├── DateRangePicker/
│   │   │   ├── EventCalendar/
│   │   │   ├── Stepper/
│   │   │   ├── TreeView/
│   │   │   ├── ImageCropper/
│   │   │   ├── ColorPicker/
│   │   │   ├── DropDrawer/
│   │   │   ├── MinimalTiptap/
│   │   │   ├── ConfirmDialog/
│   │   │   ├── FileUpload/
│   │   │   ├── Timeline/
│   │   │   ├── EmptyState/
│   │   │   ├── StatsRow/
│   │   │   ├── AvatarGroup/
│   │   │   ├── GlobalSearch/
│   │   │   └── ThemeSwitcher/
│   │   └── layout/
│   │       ├── AppShell.tsx
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── NotificationPopover.tsx
│   ├── modules/
│   │   ├── crm/
│   │   ├── wms/
│   │   ├── ims/
│   │   ├── procurement/
│   │   ├── accounting/
│   │   ├── ecommerce/
│   │   ├── purchase-orders/
│   │   ├── invoices/
│   │   ├── reconciliation/
│   │   ├── reports/
│   │   ├── vendors/
│   │   ├── customers/
│   │   ├── rentals/
│   │   └── settings/
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── SidebarContext.tsx
│   ├── hooks/
│   ├── services/
│   ├── mocks/
│   │   ├── handlers/
│   │   ├── data/
│   │   └── browser.ts
│   ├── styles/
│   │   ├── index.css
│   │   └── themes.css
│   ├── types/
│   ├── utils/
│   └── constants/
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## 3. Design System

### 3.1 Color Tokens

```
Primary:     #2b8a8a (Teal)
Surface:     #f8f9fa
Card:        #ffffff
Border:      #e9ecef

Primary scale (50-950):
  50: #f0fafa   100: #d1eded  200: #a3dbdb  300: #75c9c9
  400: #47b7b7  500: #2b8a8a  600: #236e6e  700: #1b5353
  800: #133737  900: #0b1c1c  950: #060e0e

Status Colors:
  Red cell:    text #b91c1c / bg #fee2e2
  Success:     text #15803d / bg #dcfce7
  Warning:     text #a16207 / bg #fef9c3
  Info:        text #1d4ed8 / bg #dbeafe
```

### 3.2 Typography

```
Headings (h1-h6): 'Playfair Display', Georgia, serif
Body:             'Inter', system-ui, sans-serif
Monospace:        'JetBrains Mono', monospace

Logo: "comprint" (Teal, sans-serif, bold) + "tech" (Dark, serif, bold)
```

### 3.3 Themes (8 themes x light/dark = 16 combinations)

**1. Shadcn Default**

| Token | Light | Dark |
|-------|-------|------|
| --background | #ffffff | #09090b (zinc-950) |
| --foreground | #09090b (zinc-950) | #fafafa (zinc-50) |
| --card | #ffffff | #09090b |
| --border | #e4e4e7 (zinc-200) | #27272a (zinc-800) |
| --primary | #18181b (zinc-900) | #fafafa (zinc-50) |
| --accent | #f4f4f5 (zinc-100) | #27272a (zinc-800) |

**2. Comprint CRM**

| Token | Light | Dark |
|-------|-------|------|
| --background | #f8f9fc | #0f1117 |
| --foreground | #1e1b4b (indigo-950) | #eef2ff (indigo-50) |
| --card | #ffffff | #1e1b4b |
| --border | #e0e7ff (indigo-100) | #312e81 (indigo-900) |
| --primary | #4f46e5 (indigo-600) | #818cf8 (indigo-400) |
| --accent | #d97706 (gold/amber) | #fbbf24 (amber-400) |

**3. Corporate Slate (Default comprint theme)**

| Token | Light | Dark |
|-------|-------|------|
| --background | #f8f9fa | #0f172a (slate-900) |
| --foreground | #0f172a (slate-900) | #f1f5f9 (slate-100) |
| --card | #ffffff | #1e293b (slate-800) |
| --border | #e2e8f0 (slate-200) | #334155 (slate-700) |
| --primary | #2b8a8a | #2b8a8a |
| --muted | #f1f5f9 (slate-100) | #334155 (slate-700) |

**4. Modern Minimalist**

| Token | Light | Dark |
|-------|-------|------|
| --background | #fafafa | #18181b (zinc-900) |
| --foreground | #27272a (zinc-800) | #f4f4f5 (zinc-100) |
| --card | #ffffff | #27272a (zinc-800) |
| --border | #e4e4e7 (zinc-200) | #3f3f46 (zinc-700) |
| --primary | #2b8a8a | #2b8a8a |
| --accent | #6366f1 (indigo-500) | #818cf8 (indigo-400) |

**5. High-Contrast Professional**

| Token | Light | Dark |
|-------|-------|------|
| --background | #f8f9fa | #1a1a2e (navy) |
| --foreground | #1a1a2e (navy) | #f1f5f9 |
| --card | #ffffff | #16213e |
| --border | #d1d5db (gray-300) | #2d3a5e |
| --primary | #2b8a8a | #2b8a8a |
| --success | #059669 (emerald-600) | #34d399 (emerald-400) |
| --header-bg | #1a1a2e | #0f0f1e |

**6. Ocean Blue**

| Token | Light | Dark |
|-------|-------|------|
| --background | #f0f4f8 | #0d1b2a |
| --foreground | #1b2a4a | #e0e8f0 |
| --card | #ffffff | #1b2a4a |
| --border | #d0dae7 | #2d4a6f |
| --primary | #0061d5 | #4d9fff |
| --accent | #00b4d8 (cyan) | #48cae4 |

**7. Forest Green**

| Token | Light | Dark |
|-------|-------|------|
| --background | #f6f8f6 | #0a1612 |
| --foreground | #1a2e1a | #e8f0e8 |
| --card | #ffffff | #162b1e |
| --border | #d4e2d4 | #2d4a35 |
| --primary | #0d7c3d | #34c76e |
| --accent | #6c47ff (violet) | #8b6fff |

**8. Amber Warm**

| Token | Light | Dark |
|-------|-------|------|
| --background | #faf8f5 | #1c1917 (stone-900) |
| --foreground | #292524 (stone-800) | #f5f0eb |
| --card | #ffffff | #292524 |
| --border | #e7e0d8 | #44403c (stone-700) |
| --primary | #d97706 (amber-600) | #fbbf24 (amber-400) |
| --accent | #dc2626 (red-600) | #f87171 (red-400) |

Implementation: CSS variables on `[data-theme="<name>"]` + `.dark` class. ThemeContext manages both. Stored in localStorage. Default: Corporate Slate light.

---

## 4. Layout & Shell

### 4.1 App Shell

```
┌──────────────────────────────────────────────────────────────┐
│  Header (sticky top-0 z-50)                                  │
│  [Logo]  [Dashboard Reports Cal]  [🔍 Search] [🔔] [🎨] [👤]│
├────────┬─────────────────────────────────────────────────────┤
│Sidebar │  Main Content                                       │
│(sticky │  ┌───────────────────────────────────────────────┐  │
│top-16  │  │ Page Header / Breadcrumbs                     │  │
│z-40)   │  ├───────────────────────────────────────────────┤  │
│        │  │ Tab Row (sticky z-30 top-16)                  │  │
│[Grouped│  ├───────────────────────────────────────────────┤  │
│ nav by │  │ Table Header (sticky z-20 top-28)             │  │
│ module]│  ├───────────────────────────────────────────────┤  │
│        │  │ Scrollable Content                            │  │
│        │  └───────────────────────────────────────────────┘  │
│        │                                    [↑ Query] (z-60) │
└────────┴─────────────────────────────────────────────────────┘
```

### 4.2 Header

- **Left:** Logo — "comprint" (teal, sans-serif, bold) + "tech" (dark, serif, bold)
- **Center:** Nav links — Dashboard, Reports, Calendar. Active = primary underline
- **Right:** Global Search (⌘K) → Notification bell (unread badge) → Theme switcher → User avatar (role badge + dropdown)
- **Styling:** card bg, border-b, h-16, sticky top-0 z-50

### 4.3 Global Search

- Shadcn Command component (cmdk)
- ⌘K / Ctrl+K keyboard shortcut
- Search across all modules — results grouped by module with icons
- Recent searches on empty state

### 4.4 Notifications

- Bell icon with red unread count badge
- Shadcn Popover dropdown: All / Unread filter tabs
- Each: icon, title, description, relative timestamp
- "View All" links to Notification Center page
- Module-specific notification types

### 4.5 Sidebar

- Grouped navigation by module (not a module switcher)
- Groups: Dashboard, CRM, Warehouse, Inventory, Procurement, Purchase Orders, Invoices, Accounting, Reconciliation, E-commerce, Vendors, Customers, Rentals, Reports, Settings
- Groups are collapsible (chevron toggle)
- Entire groups hidden if user has zero permissions in that module (PermissionGate)
- Individual items hidden if user lacks canView
- Collapsed mode: icon-only (w-16), hover flyout. Expanded: w-64
- Active item: primary left border + tinted background
- Icons: Lucide React
- Sticky top-16, height calc(100vh - 4rem), z-40, overflow-y-auto
- Mobile: Shadcn Sheet (drawer overlay)

### 4.6 Sticky Behavior

| Element | Position | z-index | top |
|---------|----------|---------|-----|
| Header | sticky | 50 | 0 |
| Sidebar | sticky | 40 | 4rem |
| Tab row | sticky | 30 | 4rem |
| Table header | sticky | 20 | 7rem |
| Floating button | fixed | 60 | bottom-6 right-6 |

### 4.7 Floating "↑ Query" Button

- IntersectionObserver on sentinel at 100vh
- Fade in/out animation
- Fixed bottom-6 right-6, primary bg, rounded-full, shadow-lg, z-60
- Action: smooth scroll to top

### 4.8 Responsive Breakpoints

| Breakpoint | Sidebar | Header Nav | Layout |
|------------|---------|------------|--------|
| < 768px | Hidden (drawer) | Hamburger | Single column |
| 768-1024px | Collapsed (icons) | Visible | Sidebar + content |
| > 1024px | Expanded | Visible | Sidebar + content |

---

## 5. Component Library

### 5.1 Shadcn UI Base (~30 components)

Button, Input, Select, Textarea, Checkbox, Radio, Switch, Label, Badge, Avatar, Dropdown Menu, Popover, Dialog, Sheet, Tooltip, Command, Tabs, Table, Card, Accordion, Collapsible, Separator, Skeleton, Sonner (Toast), Breadcrumb, Pagination, Sidebar, Calendar, Date Picker, Form (RHF + Zod), Alert, Alert Dialog, Context Menu, Navigation Menu, Menubar, Hover Card, Resizable, Scroll Area, Progress, Slider, Toggle, Toggle Group, Drawer, Aspect Ratio, Chart (Recharts), Data Table (TanStack Table).

### 5.2 Custom Components (32 components)

**1. BusinessMetricsTable**
- Configurable tabs via `TabConfig[]` (label, columns, dataKey)
- Shadcn Tabs + Table composition
- Sticky header row, horizontal scroll
- Red cell logic via cellFormatter function
- Sortable columns, pagination

**2. KanbanBoard**
- @dnd-kit based, generic `<KanbanBoard<T>>`
- Column config, card renderer, onMove, onReorder
- Infinite scroll per column, drag overlay
- List view toggle (switches to BusinessMetricsTable)

**3. WorkflowStepper**
- Horizontal stepper for WMS lifecycle (9 stages)
- Step states: completed, active, pending, failed
- Clickable navigation, responsive (vertical on mobile)

**4. InspectionForm**
- Nested checklist with conditional logic
- Pass/Fail per item → Fail reveals sub-options (Repair type, Paint, Spares)
- useReducer for complex conditional state

**5. InventoryTree**
- Drill-down: Category → Sub-category → Part → Stock Item
- Count badges, stock status, search/filter
- Refurbished variant gated by PermissionGate

**6. MultiStepWizard**
- Generic wizard with step config + validation per step
- Visual progress bar, step navigation, summary review step

**7. PermissionGate**
- Props: role, permission, categoryScope, fallback
- Reads from AuthContext
- Supports: role check, permission check, category-scoped filtering

**8. StatusBadge**
- Predefined variants: success, warning, error, info, neutral, red-cell

**9. FloatingQueryButton**
- IntersectionObserver trigger, fade animation, scroll-to-top

**10. DataCard**
- Metric card: icon, label, value, trend (up/down %), click-through
- Red cell for negative trends

**11. MultiSelect**
- Multi-item dropdown with removable chips
- Select All / Clear All, grouped options, max selection limit

**12. MultiSelectSearch (Select2-style)**
- Async search with debounce, chips in input
- Server-side + local filtering, create new inline
- Keyboard navigation

**13. AutoForm**
- Auto-generate forms from Zod schemas
- Reduces CRUD form boilerplate

**14. CascaderSelect**
- Hierarchical dropdown (Category → Sub-category → Part)

**15. TagInput**
- Chip input for labels, tags, keywords

**16. DateRangePicker**
- Multi-month view, preset ranges, text entry

**17. EventCalendar**
- Google Calendar-style: day/week/month views
- Drag to reschedule

**18. Stepper**
- Generic step component (horizontal/vertical)
- Validation per step

**19. TreeView**
- Expand/collapse, checkbox selection, drag reorder

**20. ImageCropper**
- Crop/resize before upload

**21. ColorPicker**
- Color selection for theme customization, labels

**22. DropDrawer**
- Dropdown on desktop, drawer on mobile

**23. MinimalTiptap**
- Lightweight rich text editor

**24. ConfirmDialog**
- Standardized destructive action confirmation

**25. FileUpload / Dropzone**
- Drag-and-drop, preview, file list

**26. Timeline / Activity Log**
- Vertical timeline: icon, user, action, timestamp

**27. EmptyState**
- Illustration + message + CTA per context

**28. StatsRow / KPI Row**
- Horizontal metric cards, sparkline, percentage change

**29. AvatarGroup**
- Stacked avatars with "+N more" overflow

**30. GlobalSearch**
- Command palette (cmdk), ⌘K trigger, cross-module search

**31. ThemeSwitcher**
- Dropdown: 8 themes + light/dark toggle

**32. DevRoleSwitcher**
- Dev-only role switching dropdown for RBAC testing

---

## 6. Functional Modules

### 6.1 CRM (`/crm/*`) — 9 pages

| Page | Key Components |
|------|---------------|
| Dashboard | StatsRow, Charts (Recharts), Timeline |
| Leads | KanbanBoard (stages: New→Contacted→Qualified→Proposal→Negotiation→Won→Lost) + List toggle |
| Deals | KanbanBoard pipeline + detail with activity log |
| Accounts | DataTable + detail with nested contacts, deals, invoices |
| Contacts | DataTable + detail with linked accounts/deals |
| Sales Orders | BusinessMetricsTable with order lifecycle status |
| Invoices | List + print-ready invoice preview (PDF-ready) |
| Quotes | Quote builder with line items, discounts, tax |
| Notification Center | Full page, filtered by type/date/read status |

Mock data mirrors existing CRM backend API shape.

### 6.2 WMS (`/wms/*`) — 8 pages

| Page | Key Components |
|------|---------------|
| Dashboard | StatsRow, WorkflowStepper (pipeline counts per stage) |
| Inward/GRN | Batch creation form, device list, barcode entry |
| Inspection | InspectionForm with conditional logic (Fail → Repair/Paint/Spares) |
| Repair | Tabs for L2, L3, Display, Battery queues. TAT tracking |
| Paint | Paint job queue with status |
| QC | QC form (pass/fail). Fail resets upstream flags |
| Outward | Outward QC + dispatch prep |
| Dispatch | Ready-for-dispatch list, confirmation, stock-out recording |

9-stage workflow from real WMS model: Inward → Inspection → Spares/Repair/Paint → QC → Inventory → Outward QC → Dispatch.

WMS-specific: WorkflowStepper (9 stages), device status state machine, TAT indicator (green < 3d, yellow 3-5d, red > 5d).

### 6.3 IMS (`/ims/*`) — 5 pages

| Page | Key Components |
|------|---------------|
| Dashboard | Stock summary KPIs, stock level charts |
| Inventory | BusinessMetricsTable with drill-down |
| Categories | InventoryTree (Category → Sub-category → Part → Item) |
| Stock Items | Detail with variants (New, Refurbished, New Pool). Red cell on low stock |
| Reports | BusinessMetricsTable tabs: Summary, Movement, Low Stock, Valuation |

Refurbished variant gated by PermissionGate (TECHNICAL_TEAM only). IMS ↔ WMS stock sync mocked via MSW.

### 6.4 Procurement (`/procurement/*`) — 5 pages

| Page | Key Components |
|------|---------------|
| Dashboard | KPIs, approval pipeline chart |
| Purchase Requests | MultiStepWizard (details → line items → attachments → review) |
| Purchase Orders | Generated from approved PRs |
| Vendors | Directory with performance metrics |
| Approvals | Inbox-style pending approvals |

Visual "Approval Progress" bar: Submitted → Manager → Finance → Approved/Rejected.

### 6.5 Purchase Orders (`/purchase-orders/*`) — 4 pages

| Page | Key Components |
|------|---------------|
| Dashboard | KPIs (open POs, overdue, spend, top vendors) |
| PO List | BusinessMetricsTable tabs: All, Draft, Sent, Partially Received, Received, Closed, Cancelled |
| PO Create/Edit | Vendor select, inline-editable line items, auto-calculated totals, terms (MinimalTiptap) |
| PO Detail | Print-ready document, status timeline, linked GRN, payment status |
| GRN Matching | Match received vs PO line items. Partial receipt. Red cell on discrepancies |

### 6.6 Invoices (`/invoices/*`) — 5 pages

| Page | Key Components |
|------|---------------|
| Dashboard | KPIs (outstanding, overdue, collected, aging) |
| Sales Invoices | BusinessMetricsTable tabs: All, Draft, Sent, Partially Paid, Paid, Overdue, Void |
| Purchase Invoices | Same tab pattern for vendor bills |
| Invoice Create/Edit | Zoho Books-style: customer/vendor select, line items, multi-tax (GST/CGST/SGST/IGST), terms, auto-numbering |
| Invoice Detail | Print-ready template: company header, addresses, line items with tax breakdown, payment history, status. Actions: Send, Record payment, PDF, Duplicate, Void |
| Credit Notes | Issue against invoices, link to original |

### 6.7 Accounting (`/accounting/*`) — 4 pages

| Page | Key Components |
|------|---------------|
| Dashboard | Revenue, expenses, profit margin KPIs + charts |
| Ledger | BusinessMetricsTable tabs: General Ledger, AR, AP, Trial Balance, P&L, Balance Sheet, Cash Flow |
| Payments | Payment list with status. Red cell on overdue |
| Reports | Financial reports via BusinessMetricsTable |

### 6.8 Reconciliation (`/reconciliation/*`) — 4 pages

| Page | Key Components |
|------|---------------|
| Bank Reconciliation | Import bank statement (CSV/OFX), side-by-side Resizable panels (bank vs system), auto-match, manual match, red cell on unmatched |
| Vendor Reconciliation | Compare vendor statements vs purchase invoices + payments, discrepancy list |
| Inventory Reconciliation | Physical count vs system, variance report, adjustment entries with approval workflow |
| Inter-module | PO vs GRN vs Invoice three-way matching, exception queue |

### 6.9 E-commerce (`/ecommerce/*`) — 4 pages

| Page | Key Components |
|------|---------------|
| Dashboard | Orders, revenue, top products KPIs |
| Catalog | Grid/list view, search, filters (category, status, price range) |
| Products | Detail/edit with ImageCropper, variants, pricing, stock sync from IMS |
| Orders | Order list with status pipeline, detail with line items |

### 6.10 Vendor Onboarding (`/vendors/*`) — 4 pages

| Page | Key Components |
|------|---------------|
| Vendor List | DataTable with status: Draft, Pending Approval, Active, Suspended, Blacklisted |
| Vendor Registration | MultiStepWizard: company → contacts → bank → documents → categories → review |
| Vendor Profile | Tabs: overview, performance (charts), transactions (BusinessMetricsTable), compliance (doc expiry, red cell on expired), notes (Timeline + MinimalTiptap) |
| Vendor Approval | Approval queue with approve/reject + comments |

### 6.11 Customer Onboarding (`/customers/*`) — 4 pages

| Page | Key Components |
|------|---------------|
| Customer List | DataTable with status: Lead, Prospect, Onboarding, Active, Inactive, Churned |
| Customer Registration | MultiStepWizard: company → addresses → contacts → credit terms → documents → KYC checklist → review |
| Customer Profile | Tabs: overview, financials (credit/outstanding/aging, red cell on overdue), orders, rentals, activity (Timeline), notes |
| Customer Approval | Approval queue for credit limit requests |

### 6.12 Rental (`/rentals/*`) — 6 pages

| Page | Key Components |
|------|---------------|
| Dashboard | KPIs (active rentals, devices on rent, revenue, overdue returns, utilization %) |
| Rental Contracts | BusinessMetricsTable tabs: All, Draft, Active, Extended, Overdue, Returned, Closed |
| Contract Create | Customer select, device selection from IMS (New Pool + Refurbished, Refurbished gated by TECHNICAL_TEAM), terms, pricing, delivery, T&C |
| Contract Detail | Summary, device list with serials, billing schedule, payment status (red cell on overdue), extend/renew actions |
| Device Tracking | Devices on rent: customer, contract, dispatch date, return due, days remaining. Red cell on overdue. Bulk actions |
| Returns | WorkflowStepper: Return Initiated → Received → Inspection → Damage Assessment → Stock Updated. Damage → auto-generate WMS repair job. No damage → back to IMS stock |

Rental ↔ module connections (mocked via MSW): IMS (stock deduction/addition), WMS (repair jobs on damage), Invoices (recurring billing), Customers (rental history).

### 6.13 Reports (`/reports/*`) — 1 hub page

Report Builder: select type, filters, date range, group-by. Preview in BusinessMetricsTable.

**Report categories (sidebar grouped):**

- **Financial:** P&L, Balance Sheet, Cash Flow, Trial Balance, General Ledger, AR Aging, AP Aging
- **Sales:** By customer/product/region, Pipeline funnel, Invoice summary, Payment received, Top 10 customers
- **Purchase:** By vendor/item/category, PO status, Vendor performance, PO aging
- **Inventory:** Stock summary, Stock ledger, Stock aging, Low stock/reorder, Valuation, Warehouse-wise
- **WMS:** Device lifecycle, QC pass/fail rate, Repair TAT, Inward vs outward trend

Common features: DateRangePicker with presets, export (CSV/Excel/PDF), save custom configs, drill-down, chart toggle, red cell on underperforming metrics.

### 6.14 Settings (`/settings/*`) — 4 pages

| Page | Key Components |
|------|---------------|
| Profile | AutoForm, avatar upload (ImageCropper) |
| User Management | DataTable with sorting/search, create/edit with role assignment |
| Roles & Permissions | Role list, permission matrix grid (entity × action checkboxes) |
| App Settings | Theme selection, notification prefs, display settings |

---

## 7. RBAC & Permissions

### 7.1 Roles (17 total)

| Role | Module Access |
|------|--------------|
| SUPERADMIN | All, full access |
| ADMIN | All, most features |
| PRODUCT_MANAGER | CRM + Procurement + IMS (filtered by assigned categories) |
| SALES_MANAGER | CRM, Invoices, Reports |
| SALES_REP | CRM (own records) |
| WAREHOUSE_MANAGER | WMS, IMS, Reports |
| WAREHOUSE_EXECUTIVE | WMS (Inward, Outward) |
| INSPECTION_ENGINEER | WMS (Inspection) |
| TECHNICAL_TEAM | WMS (Repair, Paint), IMS (Refurbished variant) |
| QC_ENGINEER | WMS (QC) |
| PROCUREMENT_MANAGER | Procurement, PO, Vendors |
| PROCUREMENT_EXEC | Procurement (own PRs) |
| FINANCE_MANAGER | Accounting, Invoices, Reconciliation, Reports |
| FINANCE_EXEC | Accounting (view), Invoices |
| RENTAL_MANAGER | Rental, IMS (view), Customers |
| ECOMMERCE_ADMIN | E-commerce, IMS (view) |
| VIEWER | All (read-only) |

### 7.2 Role Hierarchy

```
SUPERADMIN
  └── ADMIN
        ├── PRODUCT_MANAGER ··· CRM + Procurement + IMS (category-scoped)
        ├── SALES_MANAGER
        │     └── SALES_REP
        ├── WAREHOUSE_MANAGER
        │     ├── WAREHOUSE_EXECUTIVE
        │     ├── INSPECTION_ENGINEER
        │     ├── TECHNICAL_TEAM
        │     └── QC_ENGINEER
        ├── PROCUREMENT_MANAGER
        │     └── PROCUREMENT_EXEC
        ├── FINANCE_MANAGER
        │     └── FINANCE_EXEC
        ├── RENTAL_MANAGER
        ├── ECOMMERCE_ADMIN
        └── VIEWER
```

- **Solid hierarchy (─):** Parent inherits all child permissions
- **Dotted hierarchy (···):** Cross-module read-only visibility
  - RENTAL_MANAGER ··· IMS (view stock)
  - PROCUREMENT_MANAGER ··· IMS (view stock for reorder)
  - SALES_MANAGER ··· IMS (view stock for quoting)
  - FINANCE_MANAGER ··· all modules (view financial data)
  - WAREHOUSE_MANAGER ··· Procurement (view PO status)

### 7.3 Product Manager — Category-Scoped Access

Assigned product categories (e.g., Servers, Laptops). Sees only data matching their categories across CRM, Sales, Procurement, IMS.

### 7.4 Auth Context

```typescript
interface User {
  id: string
  name: string
  email: string
  avatar: string
  role: UserRole
  permissions: Permission[]
  assignedCategories?: string[]
}

interface Permission {
  module: string
  entity: string
  actions: ('view' | 'create' | 'edit' | 'delete' | 'approve' | 'export')[]
}

interface RoleConfig {
  role: UserRole
  inherits?: UserRole[]
  crossModuleView?: string[]
}
```

### 7.5 PermissionGate

```typescript
<PermissionGate role="TECHNICAL_TEAM">
  <RefurbishedVariantForm />
</PermissionGate>

<PermissionGate
  permission={{ entity: 'wms_inspection', action: 'edit' }}
  categoryScope={['servers']}
  fallback={<AccessDenied />}
>
  <InspectionForm />
</PermissionGate>
```

Checks: direct permission → inherited from parent → dotted cross-module (read-only).

### 7.6 Dynamic Dashboard

| Role | Default Landing |
|------|----------------|
| SUPERADMIN / ADMIN | Overview (all module KPIs) |
| PRODUCT_MANAGER | CRM Dashboard (category-filtered) |
| SALES_MANAGER / SALES_REP | CRM Dashboard |
| WAREHOUSE_* / INSPECTION / QC | WMS Dashboard |
| TECHNICAL_TEAM | WMS Repair queue |
| PROCUREMENT_* | Procurement Dashboard |
| FINANCE_* | Accounting Dashboard |
| RENTAL_MANAGER | Rental Dashboard |
| ECOMMERCE_ADMIN | E-commerce Dashboard |
| VIEWER | Reports hub |

### 7.7 Dev Role Switcher

Dev-only dropdown in header (development mode). Switch between preset users with different roles. Instant re-render of sidebar, dashboard, permissions.

---

## 8. Mock Data Strategy

- **MSW (Mock Service Worker)** intercepts fetch at network level
- Handlers in `mocks/handlers/` mirror FastAPI endpoint structure per module
- Mock data in `mocks/data/` as JSON, matching real API response shapes
- Components use real fetch/service calls — zero changes when APIs are ready
- Remove MSW and point services to real URLs to go live

---

## 9. Summary

| Dimension | Count |
|-----------|-------|
| Themes | 8 (× 2 modes = 16 combos) |
| Shadcn base components | ~30 |
| Custom components | 32 |
| Modules | 14 |
| Pages | ~67 |
| Roles | 17 |
| Report types | 20+ |
