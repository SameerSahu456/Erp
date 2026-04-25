# Comprint ERP

A unified, role-aware ERP front-end for **Comprint Tech Solutions** covering the full lifecycle of IT hardware sales, rentals, refurbishment and finance — from lead capture to cash collection, and from inbound GRN to outbound dispatch.

This repository is the **React + TypeScript UI prototype** (Vite, Tailwind 4, shadcn). All data is currently served from in-memory mock modules under `src/modules/*/data/` so screens behave like a working product without a backend. The app is the reference implementation of the *CTS ERP Spec v1.2* and the *Rentr RMS PRD v2.0* (both in `docs/spec_docs/` and repo root).

---

## 1. Product Vision

One platform to replace the current **Tally + Excel + WhatsApp** operating model with an integrated digital spine that serves every internal function:

- **Sales & CRM** — pre‑sales pipeline, quoting, sales orders, post‑sales fulfilment, customer support.
- **Warehouse (WMS)** — receiving, inspection, repair, paint, QC, rack assignment, outward & dispatch.
- **Inventory (IMS)** — master data: parts, Part nos/stock items, categories, OEMs, product-manager assignments.
- **Procurement** — purchase requests, purchase orders, vendors, GRN matching, PM approvals.
- **Invoices & Accounting** — sales/purchase invoices, credit notes, ledger, payments, reports.
- **Rentr (Rental Management)** — UID-tracked asset lifecycle, contracts, rental billing, returns, support.
- **Reconciliation** — bank, vendor, inventory and inter‑module reconciliation.
- **Reports, Settings & RBAC** — report builder, user management, role permissions, app settings.

Every workflow is designed around a **role-indexed sidebar** so each persona (Sales Rep, Warehouse Executive, QC Engineer, Procurement Manager, Finance Manager, Rental Manager, etc.) sees only the screens they need.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript 6 |
| Build | Vite 8 |
| Routing | react-router-dom 7 (code-split, `React.lazy` for every page) |
| Styling | Tailwind CSS 4 + `tw-animate-css` + custom design tokens in `src/styles/` |
| Components | shadcn/ui (Base UI primitives) + `lucide-react` icons |
| Charts | recharts 3 |
| Drag & drop | @dnd-kit |
| PDF export | jsPDF + jspdf-autotable |
| Calendar | react-day-picker + date-fns |
| Toasts | sonner |
| State | React Context (`AuthContext`, `SidebarContext`, `ThemeContext`) + local component state, no Redux |

Entry point: [src/main.tsx](src/main.tsx) → [src/app/router.tsx](src/app/router.tsx) (≈155 routes) → [AppShell](src/components/layout/AppShell.tsx) (sidebar + header + outlet).

---

## 3. Getting Started

```bash
# install
npm install

# dev server
npm run dev            # vite on http://localhost:5173

# typecheck + production build
npm run build

# preview production build
npm run preview

# lint
npm run lint
```

Node ≥ 20 recommended. No environment variables are required — the UI is self-contained on mock data.

---

## 4. Repository Layout

```
src/
├── app/
│   └── router.tsx              # all routes, lazy-loaded per page
├── components/
│   ├── layout/                 # AppShell, Sidebar, Header, DevRoleSwitcher, GlobalSearch
│   ├── common/                 # shared UI (BusinessMetricsTable, BarcodeText, ...)
│   └── ui/                     # shadcn primitives
├── constants/roles.ts          # ROLE_HIERARCHY + MODULE_ACCESS
├── contexts/                   # Auth / Sidebar / Theme providers
├── hooks/                      # use-mobile, use-persisted-state, use-navigate-back, ...
├── lib/utils.ts                # cn(), formatters
├── types/                      # auth.ts, navigation.ts
├── styles/                     # globals, comprint.css (print styles)
└── modules/
    ├── dashboard/              # cross-module landing page
    ├── crm/                    # Leads → Deals → Quotes → SO → PR
    ├── wms/                    # Inward → Inspect → Repair/Paint → QC → Rack → Outward → Dispatch
    ├── ims/                    # Parts, Categories, OEMs, Stock Items, PM Assignments
    ├── procurement/            # PR → PO → GRN Matching → PM Approvals, Vendors
    ├── invoices/               # Sales/Purchase invoices, Credit Notes
    ├── accounting/             # Ledger, Payments, Reports
    ├── rentals/                # Rentr RMS: Contracts, Assets, Tracking, Billing, Returns, Support
    ├── reconciliation/         # Bank / Vendor / Inventory / Inter-module
    ├── customers/              # Customer master + approvals
    ├── vendors/                # Vendor master + approvals
    ├── reports/                # Report Builder
    ├── settings/               # Profile, Users, Roles & Permissions, App Settings
    └── design-system/          # Live component gallery
```

Each module follows the same shape: `pages/` (route components), `data/` (mock data + types), `components/` (module-specific UI), and sometimes `types.ts` + helpers.

---

## 5. Modules — End to End

### 5.1 Dashboard
Cross-module KPI landing for the logged-in role ([DashboardPage](src/modules/dashboard/DashboardPage.tsx)). Business-metric tables, pipeline summary, stock alerts, open approvals.

### 5.2 CRM ([src/modules/crm/](src/modules/crm/))
Full pre- and post-sales flow.

- **Pipeline** — Leads (with Rejected Leads & Closed-Won), Deals, Accounts, Contacts.
- **Quote-to-Order** — Quotes, **Quote Builder** ([QuoteBuilderPage](src/modules/crm/pages/QuoteBuilderPage.tsx)), Sales Orders, Sales Order Detail.
- **Inbound demand** — Material Inquiries (+ response detail), Demo Requests, Purchase Requests raised from CRM.
- **Activity** — Tasks, Meetings, Calendar, Notification Center.
- **CRM invoices** — preview of billing initiated from the sales side.

### 5.3 Warehouse — WMS ([src/modules/wms/](src/modules/wms/))
The refurbishment-grade warehouse pipeline, stage by stage:

`Inward / GRN → Inspection → Repair → Spares → Paint → QC → Assign to Rack → Outward → Dispatch`

- **Inward/GRN** with batch-of-devices split, per-device lifecycle and component movement history.
- **Checklists** (templates + execution) for inspection and QC.
- **Work Orders** and **BOMs** for rework ([WorkOrderListPage](src/modules/wms/pages/WorkOrderListPage.tsx), [BOMListPage](src/modules/wms/pages/BOMListPage.tsx)).
- **Dispatch Requests** with list/detail/form and courier integration ([DispatchListPage](src/modules/wms/pages/DispatchListPage.tsx)).
- **Locations / Racks** master and device-to-rack assignment.
- **Devices** view — per-UID device detail + assignment history ([DeviceDetailPage](src/modules/wms/pages/DeviceDetailPage.tsx)).

### 5.4 Inventory — IMS ([src/modules/ims/](src/modules/ims/))
Master-data backbone for the whole ERP.

- **Parts** (generic item masters) with detail + variant rollout.
- **Categories** (hierarchical) with per-category detail and PM ownership.
- **OEMs** master.
- **Stock Items** (Part no-level) with Part no history and variant/pull model.
- **PM Assignments** — which Product Manager owns which category/OEM.
- **IMS Reports**.

### 5.5 Procurement ([src/modules/procurement/](src/modules/procurement/))
- **Purchase Requests** (raised in CRM or IMS) flow into procurement as [PRDetailPage](src/modules/procurement/pages/PRDetailPage.tsx).
- **Purchase Orders** — create from PR, send to vendor, track.
- **Vendors** master.
- **GRN Matching** — 3-way match between PO, GRN (WMS Inward) and Invoice ([GRNMatchingPage](src/modules/procurement/pages/GRNMatchingPage.tsx)).
- **PM Approvals** — Product Manager gate for spend beyond threshold.

### 5.6 Invoices ([src/modules/invoices/](src/modules/invoices/))
Sales invoices (form + detail), Purchase invoices, Credit Notes, invoice dashboard with aging buckets.

### 5.7 Accounting ([src/modules/accounting/](src/modules/accounting/))
Ledger view, Payments in/out, accounting reports, dashboard.

### 5.8 Rentr — Rental Management System ([src/modules/rentals/](src/modules/rentals/))
Implements the *Rentr RMS PRD v2.0* summarised in `Rentr_RMS_PRD_v2_Enhanced.md`. Designed to scale Rentr from ₹150 Cr to ₹2,000 Cr in deployed assets.

Screens:
- **Dashboard**, **Analytics** (margin intelligence per asset/customer/category).
- **Contracts** — master agreement + annexure model, lifecycle from draft → signed → active → expired.
- **Orders**, **Asset Registry**, **Device Tracking** (per-UID location and status).
- **Billing** (auto-stop on return/GRN), **Returns** (flows back to WMS/IMS), **Support Tickets**, **Partners**.

### 5.9 Reconciliation ([src/modules/reconciliation/](src/modules/reconciliation/))
Four-way reconciliation hub:
- Bank reconciliation (statement vs. ledger).
- Vendor reconciliation (ledger vs. vendor statement).
- Inventory reconciliation (IMS book stock vs. WMS physical).
- **Inter-module** reconciliation (cross-checks CRM SO ↔ Invoices ↔ Accounting ↔ WMS dispatch).

### 5.10 Customers & Vendors ([src/modules/customers/](src/modules/customers/), [src/modules/vendors/](src/modules/vendors/))
Two-step onboarding: List → Form → Detail → Approvals. Drives master data consumed by CRM/Procurement.

### 5.11 Reports ([src/modules/reports/](src/modules/reports/))
Drag-and-drop **Report Builder** over the canonical entities.

### 5.12 Settings ([src/modules/settings/](src/modules/settings/))
- **Profile**.
- **User Management** (Admin-gated).
- **Roles & Permissions** — live matrix of `UserRole × Module`, driven by `ROLE_HIERARCHY` and `MODULE_ACCESS`.
- **App Settings** — theme, defaults, integrations (planned).

### 5.13 Design System ([src/modules/design-system/](src/modules/design-system/))
Living style-guide and component gallery for designers / reviewers.

---

## 6. Role-Based Access Control

All roles live in [src/types/auth.ts](src/types/auth.ts) and the hierarchy + default dashboards in [src/constants/roles.ts](src/constants/roles.ts). The sidebar itself is filtered by module access in [sidebar-nav-config.ts](src/components/layout/sidebar-nav-config.ts).

**Platform roles:** `SUPERADMIN`, `ADMIN`, `PRODUCT_MANAGER`, `SALES_MANAGER`, `SALES_REP`, `WAREHOUSE_MANAGER`, `WAREHOUSE_EXECUTIVE`, `INSPECTION_ENGINEER`, `TECHNICAL_TEAM`, `QC_ENGINEER`, `PROCUREMENT_MANAGER`, `PROCUREMENT_EXEC`, `FINANCE_MANAGER`, `FINANCE_EXEC`, `RENTAL_MANAGER`, `ECOMMERCE_ADMIN`, `VIEWER`.

**CRM-specific roles:** `CRM_CHANNEL_MANAGER`, `CRM_SR_ACCOUNT_MANAGER`, `CRM_AREA_MANAGER`, `CRM_BDE_CHANNEL`, `CRM_INSIDE_SALES_MANAGER`, `CRM_INSIDE_SALES_REP`, `CRM_BDE_END_CUSTOMER`, `CRM_SUPPORT_MANAGER`, `CRM_SUPPORT_AGENT`.

Permissions are modelled as `module × entity × action[]` where actions are `view | create | edit | delete | approve | export`. `ADMIN` inherits all functional managers; each manager inherits its executives (e.g. `WAREHOUSE_MANAGER` → `WAREHOUSE_EXECUTIVE`, `INSPECTION_ENGINEER`, `TECHNICAL_TEAM`, `QC_ENGINEER`).

A **Dev Role Switcher** ([DevRoleSwitcher](src/components/layout/DevRoleSwitcher.tsx)) is available in development to impersonate any role for QA.

---

## 7. Core Cross-Module Flows

**Sell-side (Quote → Cash):**
`CRM Lead → Deal → Quote → Sales Order → WMS Outward/Dispatch → Sales Invoice → Payment → Accounting Ledger`

**Buy-side (Demand → Pay):**
`IMS low-stock / CRM PR → Procurement PR → PM Approval → PO → WMS Inward/GRN → GRN Matching → Purchase Invoice → Payment`

**Refurbishment (Asset flow):**
`Inward → Inspection → Repair/Spares → Paint → QC → Rack → Outward/Dispatch` (per-UID, fully audited via `component-movements` and `stock-movements`).

**Rental (Rentr):**
`CRM Quote → Rental Contract (DocuSign) → Asset assignment (UID) → Device Tracking → Monthly Billing → Return → WMS/IMS GRN → Auto-stop billing → Data Wipe → Ready-for-rent`

---

## 8. UI & UX Conventions

- **AppShell** — fixed sidebar (collapsible, persisted), sticky header with global search, notifications and user menu.
- **List → Detail → Form** pattern for every entity (e.g. `StockItemsPage` → `StockItemDetailPage` → `StockItemFormPage`).
- **Clickable rows** across every list module for fast drill-down.
- **Print styles** in [src/styles/comprint.css](src/styles/comprint.css) drive the `Comprint ERP-print.html` reference.
- **Dark mode** via `next-themes` and the `ThemeSwitcher`.
- **Code-splitting** — every page is `React.lazy`'d with a common spinner fallback.
- **Path alias** `@/*` → `src/*` (see `tsconfig.json`, `vite.config.ts`).

---

## 9. Documentation & Specs

- [Rentr_RMS_PRD_v2_Enhanced.md](Rentr_RMS_PRD_v2_Enhanced.md) — rental module PRD (v2.0, April 2026).
- [docs/spec_docs/CTS ERP Spec v1.2.docx (3).pdf](docs/spec_docs/) — ERP master spec.
- [docs/spec_docs/CRM_Access_Control_PRD.docx](docs/spec_docs/) — CRM RBAC specification.
- `ERP/` — legacy HTML/JSX prototype kept for visual reference.
- `docs/superpowers/` — internal working docs.

---

## 10. Roadmap (high-level)

1. Wire Auth + API layer (REST or tRPC) behind the mock data modules.
2. Promote `src/modules/*/data/` to typed API clients with optimistic caching.
3. Real DocuSign hook for Rentr contracts; Tally integration for accounting.
4. Harden the RBAC matrix with server-side enforcement.
5. First customer-facing portal (Rentr Module 7) reusing the same design system.

---

## 11. License & Ownership

© Comprint Tech Solutions. Internal project. Not for public distribution.
