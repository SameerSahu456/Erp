# Spec Gap Features — Design Document

**Date:** 2026-04-17
**Status:** Draft
**Context:** CTS ERP Spec v1.2 gap analysis identified missing frontend features

---

## Overview

Five frontend features identified as gaps between the CTS ERP Spec v1.2 and the current frontend implementation. These are all frontend-only (mock data), no backend integration.

### Features

1. **OEM Management** — IMS sub-section for managing OEMs (HP, Dell, Cisco, etc.)
2. **PM Assignments** — Dedicated IMS page for managing PM-to-scope assignments
3. **Pricing Module** — IMS enhancement for Part + Variant + Tag level pricing with RBAC
4. **Component Movement History** — WMS standalone page + Stock Item detail tab
5. **PR Approval Routing Rework** — Replace amount-based with category x OEM PM routing

---

## 1. OEM Management

### Location
IMS module sub-section (`/ims/oems`, `/ims/oems/new`, `/ims/oems/:id`, `/ims/oems/:id/edit`)

### What is an OEM?
OEM = Original Equipment Manufacturer = Brand (HP, Dell, Cisco, Lenovo). Currently stored as a free-text "brand" field on Parts. This feature promotes it to a first-class master data entity.

### Pages

#### OEM List Page (`/ims/oems`)
- Table columns: Name, Logo/Icon, Models Count, Categories Count, Status (Active/Inactive)
- Search by name
- Filter by status, category
- "Add OEM" button

#### OEM Form Page (`/ims/oems/new`, `/ims/oems/:id/edit`)
- Fields:
  - **Name** (required) — e.g., "Dell", "HP", "Cisco"
  - **Code** (required, auto-generated from name) — e.g., "DEL", "HP", "CSC"
  - **Status** — Active / Inactive
  - **Categories** — multi-select of L1 categories this OEM operates in
  - **Notes** — free text

#### OEM Detail Page (`/ims/oems/:id`)
- Header: OEM name, code, status badge
- Tabs:
  - **Overview** — basic info, categories, stats
  - **Models** — list of Parts linked to this OEM (read-only, links to Part detail)
  - **PM Assignments** — filtered view of PM assignments for this OEM (read-only, links to PM Assignments page)

### Impact on Existing Pages
- **Part Form Page** (`/ims/parts/new`, `/ims/parts/:id/edit`): Replace free-text "brand" field with OEM dropdown selector populated from OEM master list
- **IMS Sidebar Navigation**: Add "OEMs" link between Categories and Parts

### Mock Data
New file: `src/modules/ims/data/oems.ts`
```
OEM {
  id: string
  name: string          // "Dell", "HP", "Cisco"
  code: string          // "DEL", "HP", "CSC"
  status: "active" | "inactive"
  categories: string[]  // L1 category IDs
  modelsCount: number
  notes: string
  createdAt: string
  updatedAt: string
}
```

Sample data: Dell, HP, Cisco, Lenovo, Samsung, Western Digital, Kingston, Intel, AMD (at least 8-10 entries).

---

## 2. PM Assignments

### Location
Dedicated IMS page (`/ims/pm-assignments`)

### Concept
A PM (Product Manager) is assigned a scope defined by:
- **Category** (required) — L1 category (e.g., Laptops, Servers)
- **Subcategory** (optional) — L2 subcategory, defaults to "All" if blank
- **OEM** (optional) — specific OEM, defaults to "All" if blank
- **Variant** (optional) — New / Refurbished, defaults to "All" if blank
- **PM** (required) — the assigned user

### Assignment Granularity Examples

| Category | Subcategory | OEM | Variant | PM | Meaning |
|---|---|---|---|---|---|
| Laptops | All | All | All | John | John manages ALL laptops |
| Laptops | All | Dell | All | Sarah | Sarah manages Dell laptops (overrides John for Dell) |
| Laptops | All | Dell | New | Mike | Mike manages New Dell laptops only (most specific) |
| Servers | All | All | Refurbished | Priya | Priya manages all refurbished servers |
| Storage | All | All | All | Rahul | Rahul manages all storage |

### Resolution Logic (Most Specific Wins)
When resolving which PM handles a given Part + Variant:
1. Check for exact match: Category + Subcategory + OEM + Variant
2. Fallback: Category + Subcategory + OEM + Any Variant
3. Fallback: Category + Any Subcategory + OEM + Variant
4. Fallback: Category + Any Subcategory + OEM + Any Variant
5. Fallback: Category + Subcategory + Any OEM + Variant
6. Fallback: Category + Subcategory + Any OEM + Any Variant
7. Fallback: Category + Any Subcategory + Any OEM + Variant
8. Fallback: Category + Any Subcategory + Any OEM + Any Variant

### Page Design

#### PM Assignments Page (`/ims/pm-assignments`)
- Table columns: Category, Subcategory, OEM, Variant, Assigned PM, Last Updated
- "All" displayed in grey/muted when field is unset (meaning "any")
- Filters: Category, OEM, PM user
- "Add Assignment" button → opens dialog
- Edit/Delete actions per row
- Overlap warning: if a new assignment overlaps with an existing one, show a warning banner explaining which assignment is more specific and will take precedence

#### Add/Edit Assignment Dialog
- Fields:
  - **Category** (required) — dropdown of L1 categories
  - **Subcategory** (optional) — dropdown filtered by selected category, placeholder "All Subcategories"
  - **OEM** (optional) — dropdown from OEM master list, placeholder "All OEMs"
  - **Variant** (optional) — dropdown: New / Refurbished, placeholder "All Variants"
  - **PM** (required) — user selector (filtered to users with PM role)
- Validation: prevent duplicate exact-match assignments

### Mock Data
New file: `src/modules/ims/data/pm-assignments.ts`
```
PMAssignment {
  id: string
  categoryId: string
  categoryName: string
  subcategoryId: string | null   // null = All
  subcategoryName: string | null
  oemId: string | null           // null = All
  oemName: string | null
  variant: "new" | "refurbished" | null  // null = All
  pmId: string
  pmName: string
  createdAt: string
  updatedAt: string
}
```

### Consumers
This data is consumed by:
- **PR Approval Routing** (Procurement) — resolve approvers for PR line items
- **Pricing RBAC** — filter which prices a PM can edit
- **Demo Approvals** — route demo requests to correct PM

---

## 3. Pricing Module

### Location
IMS page (`/ims/pricing`)

### Concept
Pricing is set at **Part + Variant + Tag** level. A single Part can have multiple price rows:

| Part | Variant | Tag | Sell Price |
|---|---|---|---|
| Dell Latitude 5530 | New | — | 85,000 |
| Dell Latitude 5530 | New | Box Pack | 89,000 |
| Dell Latitude 5530 | New | NP (New Pull) | 72,000 |
| Dell Latitude 5530 | Refurbished | — | 55,000 |
| Dell Latitude 5530 | Refurbished | NPL (New Pulled) | 48,000 |

- **Base price**: Part + Variant (no tag) — the default price
- **Tag-specific price**: Part + Variant + Tag — overrides base for items with that tag
- **Sell price**: This is the customer-facing sell price, feeds into Quotes and SOs

### Page Design

#### Pricing Page (`/ims/pricing`)
- Table columns: Part Name, SKU, Category, OEM, Variant, Tag (or "Base"), Sell Price (INR), Last Updated, Updated By
- Inline editing: click on price cell to edit (only if PM has assignment scope)
- Non-editable rows shown with lock icon for PMs outside their scope
- Filters: Category, OEM, Variant, Tag, Part search
- Bulk actions: none for now (single row editing only)

#### Price History
- Expandable row or side panel when clicking a price row
- Shows: Date, Old Price, New Price, Changed By, Notes
- Sorted newest first

### RBAC
- PM can only edit prices for parts within their PM Assignment scope
- Resolution: look up the part's category + OEM + variant, match against PM Assignments
- Admin/Superadmin can edit all prices
- Read access for all users (Sales needs to see prices for quotes)

### Mock Data
New file: `src/modules/ims/data/pricing.ts`
```
PriceEntry {
  id: string
  partId: string
  partName: string
  sku: string
  categoryId: string
  categoryName: string
  oemId: string
  oemName: string
  variant: "new" | "refurbished"
  tag: string | null            // null = base price
  sellPrice: number
  currency: "INR"
  updatedBy: string
  updatedAt: string
}

PriceHistory {
  id: string
  priceEntryId: string
  oldPrice: number
  newPrice: number
  changedBy: string
  changedAt: string
  notes: string
}
```

### Impact on Existing Pages
- **IMS Sidebar Navigation**: Add "Pricing" link
- **Quote Builder / Quote Form**: Price auto-populated from pricing table based on selected Part + Variant + Tag
- **Sales Order Form**: Same auto-population

---

## 4. Component Movement History

### Location
- Standalone page: `/wms/component-history`
- Stock Item Detail tab: new "Movement History" tab on `/ims/stock-items/:id`

### Concept
Every component (stock item) maintains an unbroken chain of custody. Every install, removal, swap, and rack transfer is recorded as a movement entry.

### Movement Types

| Type | Description | Example |
|---|---|---|
| INSTALLED | Component installed into a parent part | 16GB RAM installed into Dell Latitude 5530 |
| REMOVED | Component removed from a parent part (tagged NPL) | Old 8GB RAM removed from server, tagged NPL |
| SWAPPED | Old component removed + new one installed (two movements) | Swap 8GB RAM for 16GB RAM in laptop |
| TRANSFERRED | Component moved between racks/locations | RAM moved from Rack A-1 to Rack B-3 |

### Pages

#### Component Movement History Page (`/wms/component-history`)
- Table columns:
  - **Date/Time**
  - **Component** — part name + serial number (linked to stock item detail)
  - **Movement Type** — badge (INSTALLED/REMOVED/SWAPPED/TRANSFERRED)
  - **Parent Part** — the assembly this component was installed in/removed from (linked)
  - **Work Order** — linked work order ID (if applicable)
  - **From** — source rack/location (for TRANSFERRED) or "Free Stock" (for INSTALLED)
  - **To** — destination rack/location (for TRANSFERRED) or parent assembly (for INSTALLED)
  - **Performed By** — user who executed
  - **Verified By** — user who verified (Store Manager)
  - **Notes** — free text
- Filters: Date range, Movement type, Part/Component, Serial number, Work Order
- Sort: newest first by default
- Export: not in scope for now

#### Stock Item Detail — Movement History Tab
- Same table structure as standalone page
- Pre-filtered to show only movements for the selected stock item
- No additional filters needed (already scoped)
- Displayed as a new tab alongside existing tabs on the stock item detail page

### Mock Data
New file: `src/modules/wms/data/component-movements.ts`
```
ComponentMovement {
  id: string
  itemId: string               // The component being moved
  itemName: string
  itemSerial: string
  movementType: "INSTALLED" | "REMOVED" | "SWAPPED" | "TRANSFERRED"
  parentItemId: string | null  // Assembly the component belongs to
  parentItemName: string | null
  workOrderId: string | null
  workOrderNumber: string | null
  fromRackId: string | null
  fromRackName: string | null
  toRackId: string | null
  toRackName: string | null
  performedBy: string
  performedByName: string
  verifiedBy: string | null
  verifiedByName: string | null
  notes: string
  timestamp: string
}
```

Sample data: 15-20 entries covering all 4 movement types across various components.

---

## 5. PR Approval Routing Rework

### Location
Existing page: `src/modules/procurement/pages/PRFormPage.tsx` (Step 3 of wizard)

### Current State
- Step 3 shows approval chain based on total amount thresholds:
  - Under 500K → Manager only
  - 500K-2.5M → Manager + Finance Head
  - Above 2.5M → Manager + Finance Head + VP Operations

### New Behavior
- Remove all amount-based threshold logic
- Step 3 dynamically resolves approvers based on line items from Step 2

### Approval Resolution Flow

1. For each line item in the PR, extract: Category, OEM (from selected Part)
2. Look up PM Assignments to find the PM(s) responsible
3. Deduplicate — if multiple items map to the same PM, show once
4. Display resolved approvers in Step 3

### Scenarios

| PR Items | Resolved Approvers | Behavior |
|---|---|---|
| All items in Laptops/Dell | PM for Laptops/Dell (e.g., Sarah) | Single PM approval |
| Items in Laptops/Dell + Servers/HP | PM for Laptops/Dell + PM for Servers/HP | Both must approve |
| PR creator IS the only resolved PM | Auto-approved | Skip approval step |
| No PM assignment found for an item's scope | Show warning: "No PM assigned for [Category/OEM]" | Block submission until resolved |

### UI Changes to PRFormPage

#### Step 3 — Approval Chain (reworked)
- Title: "PM Approval" (was "Approval Chain")
- Show a table/card for each resolved PM:
  - PM name, avatar
  - Scope: "Laptops / Dell / All Variants" (what they're approving)
  - Items: list of line items from Step 2 that fall under this PM
- If PR creator is the PM for all items: show banner "This PR will be auto-approved as you are the assigned PM for all items"
- If no PM found for some items: show error banner with affected items and a link to PM Assignments page
- Approval chain updates live as user modifies line items in Step 2

#### Step 2 — Line Items (minor enhancement)
- When a Part is selected, show its Category and OEM as read-only info below the part name
- This helps the user understand which PM scope each item falls into

### Mock Data Changes
Update: `src/modules/procurement/data/purchase-requests.ts`
- Replace `approvalChain` structure from amount-based to PM-based
- Add `resolvedApprovers` array with PM assignment references

### Impact on Other Pages
- **PR Detail Page**: Show PM-based approval status instead of amount-based
- **CRM PM Approvals Page**: Should reflect category x OEM routing (verify current state)

---

## Navigation Changes Summary

### IMS Sidebar (updated)
```
IMS
├── Dashboard
├── Categories
├── OEMs          ← NEW
├── Parts
├── Stock Items
├── PM Assignments ← NEW
├── Pricing        ← NEW
├── SKU History
└── Reports
```

### WMS Sidebar (updated)
```
WMS
├── Dashboard
├── Inward
├── Inspection
├── Repair
├── Paint
├── Quality Control
├── Outward QC
├── Inventory
├── Component History ← NEW
├── Outward
├── Dispatch
├── BOM
├── Work Orders
├── Related Parts
├── Checklist Templates
└── Warehouse Locations
```

### Routes to Add
```
/ims/oems                    → OEMListPage
/ims/oems/new                → OEMFormPage
/ims/oems/:id                → OEMDetailPage
/ims/oems/:id/edit           → OEMFormPage
/ims/pm-assignments          → PMAssignmentsPage
/ims/pricing                 → PricingPage
/wms/component-history       → ComponentMovementHistoryPage
```

---

## Out of Scope

- Backend API integration (all mock data)
- Tags management page (tags are referenced in pricing but managed elsewhere)
- Price charts/trend visualization (future enhancement)
- Bulk price import/export
- PM assignment auto-suggestions
- Notification system integration for approval routing
