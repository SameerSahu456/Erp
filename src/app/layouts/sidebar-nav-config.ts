import {
  ArchiveRestore,
  ArrowLeftRight,
  Ban,
  BadgeCheck,
  BarChart3,
  Boxes,
  Receipt,
  Repeat,
  SlidersHorizontal,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Contact,
  Cpu,
  Download,
  Factory,
  FileCheck,
  FilePlus,
  FileText,
  FolderTree,
  Handshake,
  LayoutDashboard,
  ListChecks,
  ListTodo,
  LocateFixed,
  MapPin,
  Monitor,
  Package,
  PackageSearch,
  Hammer,
  Percent,
  Replace,
  Undo2,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Target,
  Store,
  Tags,
  UserCircle,
  UserCog,
  PackageOpen,
  PackageX,
  Users,
  Video,
  Warehouse,
  Wrench,
  XCircle,
} from "lucide-react";

import { crmCan, crmPermissions } from "@modules/crm";
import { imsCan } from "@modules/ims";
import { procurementCan } from "@modules/procurement";
import { wmsCan, wmsPermissions } from "@modules/wms";
import { rentalsCan, rentalsPermissions } from "@modules/rentals";
import type { FeatureFlags } from "@shared/features";
import { REPORT_ROLES } from "@modules/reports";
import type { DataScope, NavGroup, NavItem } from "@app/layouts/navigation";

/** Marker the Sidebar replaces with one item per active service section.
 *  Gated on the service_job_read CODE (managers hold it), NOT the service_job
 *  device stage: an engineer holds the stage — so they raise a vendor request on
 *  a device they work — but not the read code, so the cross-section queue stays
 *  off their view instead of 403-ing with a generic error (CP-605 #6). */
export const VENDOR_SERVICE_NAV_PLACEHOLDER = {
  label: "__vendor_services__",
  href: "/wms/vendor-jobs",
  icon: Hammer,
  requiredPermissions: wmsCan.serviceJobView,
} as const;

// The two vendor MASTER-DATA links (Service Vendors / Service Sections) gate on
// the service-vendor permission, NOT the service_job device stage — their
// routes need `serviceVendorView`, so a manager holding that code (but not
// working the service_job stage) must still see them. The Vendor Jobs work
// items keep the stage gate on the placeholder above. (§D7 RBAC drift fix.)
export const VENDOR_MASTER_NAV_PERMISSIONS: readonly string[] =
  wmsCan.serviceVendorView;

/** Marker the Sidebar replaces with the vendor MASTER links (Service Sections,
 *  Service Vendors). Kept SEPARATE from the "All Vendor Jobs" placeholder so
 *  the two setup/config masters can sit at the very end of the menu,
 *  while All Vendor Jobs stays in the operational flow after Spares. */
export const VENDOR_MASTERS_NAV_PLACEHOLDER = {
  label: "__vendor_masters__",
  href: "/wms/vendor-jobs/sections",
  // Placeholder icon only — never rendered; the Sidebar gives the real master
  // items their own icons (Store / Layers).
  icon: Hammer,
  requiredPermissions: VENDOR_MASTER_NAV_PERMISSIONS,
} as const;


export const dashboardItem: NavItem = {
  label: "Dashboard",
  // `/` is the role-aware landing (HomeRedirect) — point the nav link straight
  // at the dashboard page. The Sidebar shows this link only while the
  // `dashboard` feature switch (FEATURE_DASHBOARD) mounts that route.
  href: "/dashboard",
  icon: LayoutDashboard,
};

// Broad CRM read bundle for entries the spec leaves on the day-1 `crm:read`
// code (Tasks, Meetings, Calendar, Notifications, Purchase Requests, Invoices —
// see `modules/crm/permissions/spec.md` §"Resources not touched").
// Consumed by Meetings + Calendar (restored 2026-05-22) and the flag-gated
// CRM Purchase Requests entry.
const CRM_READ_BROAD = [crmPermissions.READ] as const;

// "Any CRM access" — every CRM code, broad and finer. The whole CRM group is
// gated on this OR-bundle, so a user holding no `crm:*` permission never sees
// the CRM tab. Sourced from the permission map (not hardcoded) so new codes
// are covered automatically.
const CRM_ANY = crmCan.anyCrm;

// PM Approvals is the aggregate cross-module inbox. Visible if the user
// can act on *any* of its tabs — MI/SO/DR from CRM, PR/PO from Procurement.
// Includes both the legacy umbrella `procurement:approve` and the finer
// `procurement:po_approve` so PM/APM granted only the fine code still see it.
const PM_APPROVALS_ANY = [
  ...crmCan.approveMi,
  ...crmCan.approveSo,
  ...crmCan.approveDr,
  ...procurementCan.approve,
  ...procurementCan.approvePo,
  // Rental rate changes are decided in the PM Approvals sales-order tab.
  ...rentalsCan.approveRateChange,
] as const;

// In-progress modules — spread into the sidebar by `buildSidebarNav` only when
// their feature switch is on (FEATURE_WMS / FEATURE_PROCUREMENT). Kept as named
// consts so the entries stay type-checked even when the switch is off.
//
// Gating (realigned 2026-07-06 — the old umbrella codes wms:read/manage were
// DELETED by the backend, so items gated on them were invisible to everyone):
//  - WIRED code-gated pages carry their real fine-grained `wmsCan` bundle
//    (Inward → inward_read, Locations → warehouseView, Checklists →
//    ims:read since the page rides the IMS templates API).
//  - Device-operation tabs gate on WAREHOUSE CAPABILITY (requiredWmsStage) —
//    operators hold no wms:* codes; their assignment surfaces the tab.
//    Inspection → L1/L2 + managers; Repair/QC → capability engineers +
//    managers; Paint / Rack / Devices hub → managers only.
//  - MOCK pages (fabricated data, unwired) are superuserOnly so real users
//    never mistake demo records for live ones. Swap to a real gate when wired.
// Rentals group. Every item is gated on `rentalsCan.view` (rentals:read —
// the code every rentals GET requires), so the whole group auto-hides for
// users without it. The `rental_manager` role holds it.
const RENTALS_NAV_GROUP: NavGroup = {
  label: "Rentals",
  icon: Repeat,
  requiredPermissions: rentalsCan.view,
  items: [
    {
      label: "Accounts",
      href: "/rentals/accounts",
      icon: Building2,
      requiredPermissions: rentalsCan.view,
    },
    {
      // "Agreements", not "Sales Orders". The list IS the agreement
      // register — its rows open `/rentals/agreements/{id}` — and calling
      // it Sales Orders meant the nav label, the URL and the detail page
      // all said different things, with no item named after the record
      // anyone was actually looking for. `/rentals/sales-orders` stays
      // routed as an alias so existing links and bookmarks still work.
      label: "Agreements",
      href: "/rentals/agreements",
      icon: ShoppingCart,
      requiredPermissions: rentalsCan.view,
    },
    {
      label: "Device Tracking",
      href: "/rentals/tracking",
      icon: Monitor,
      requiredPermissions: rentalsCan.view,
    },
    {
      label: "Invoices",
      href: "/rentals/invoices",
      icon: FileText,
      requiredPermissions: rentalsCan.view,
    },
    // Return by count (§7): swaps the product manager approves, and the
    // credit notes accounts issue when a swap lands on an invoiced period.
    {
      label: "Serial Swaps",
      href: "/rentals/swaps",
      icon: ArrowLeftRight,
      requiredPermissions: rentalsCan.view,
    },
    {
      // Early-exit waivers and Extend-PO requests, one page with a switch
      // (the PO queue only for its deciders).
      label: "Approvals",
      href: "/rentals/approvals",
      icon: BadgeCheck,
      requiredPermissions: rentalsCan.view,
    },
    {
      label: "Configuration",
      href: "/rentals/configuration",
      icon: SlidersHorizontal,
      requiredPermissions: rentalsCan.view,
    },
  ],
}

// Sales roles (`data_scope: sales_team`) hold the warehouse read codes only to
// follow the requests on their OWN orders — the backend cuts those lists to the
// sales orders they can see. They never get the Warehouse menu; the same pages
// are linked from the CRM group instead (SALES_TEAM_REQUEST_ITEMS).
const WAREHOUSE_MENU_SCOPES: readonly DataScope[] = ["all", "rental_orders"];

// The requests a sales person raises and follows from their orders. Same pages
// and gates as the Warehouse entries; shown only to `sales_team`-scoped users,
// whose lists the backend narrows to the orders they (or their team) can see.
const SALES_TEAM_REQUEST_ITEMS: NavItem[] = [
  { label: "Material Issues", href: "/wms/material-issue", icon: PackageOpen, requiredPermissions: wmsCan.outwardView },
  { label: "Dispatch Requests", href: "/wms/dispatches", icon: FileCheck, requiredPermissions: wmsCan.outwardView },
  { label: "Sales Returns", href: "/wms/sales-returns", icon: ArchiveRestore, requiredPermissions: [crmPermissions.READ, ...wmsCan.returnsView] },
  { label: "Rental Returns", href: "/wms/rental-returns", icon: Undo2, requiredPermissions: [crmPermissions.READ, rentalsPermissions.RETURN] },
  {
    label: "Replacement Requests",
    href: "/wms/replacements",
    icon: Replace,
    requiredPermissions: [crmPermissions.READ, ...wmsCan.returnsView, ...rentalsCan.replacementView],
  },
].map((item) => ({ ...item, visibleForScopes: ["sales_team"] as const }));

const WMS_NAV_GROUP: NavGroup = {
  label: "Warehouse",
  icon: Warehouse,
  visibleForScopes: WAREHOUSE_MENU_SCOPES,
  items: [
    // Ordered by frequency of use: daily-operations flow first,
    // occasional actions next, setup/config (vendor masters) at the very end.
    // Devices sits UNDER Inward / GRN.
    // Dashboard (/wms) temporarily hidden — unwired demo page, blocked for
    // everyone incl. superuser until wired (2026-10-05 RBAC decision).
    { label: "Inward / GRN", href: "/wms/inward", icon: PackageSearch, requiredPermissions: wmsCan.inwardView },
    { label: "Inward Exceptions", href: "/wms/inward-exceptions", icon: ShieldAlert, requiredPermissions: wmsCan.inwardExceptionView },
    { label: "Devices", href: "/wms/devices", icon: Monitor, requiredWmsStage: "manager" },
    { label: "Work Assignments", href: "/wms/work-assignments", icon: ClipboardList, requiredPermissions: wmsCan.workAssignmentView },
    { label: "Inspection", href: "/wms/inspection", icon: ClipboardCheck, requiredWmsStage: "inspection" },
    { label: "Repair", href: "/wms/repair", icon: Wrench, requiredWmsStage: "repair" },
    { label: "Spares", href: "/wms/spares", icon: Cpu, requiredPermissions: [wmsPermissions.SPARES_READ] },
    // "All Vendor Jobs" — the Sidebar expands this into the cross-section jobs
    // parent (one child per ACTIVE service_sections row, via
    // `useVendorServiceNavItems`). The Service Vendors / Service Sections
    // MASTERS are split out to the end of the menu — see
    // VENDOR_MASTERS_NAV_PLACEHOLDER below.
    VENDOR_SERVICE_NAV_PLACEHOLDER,
    { label: "QC", href: "/wms/qc", icon: CheckCircle2, requiredWmsStage: "qc" },
    { label: "Assign to Rack", href: "/wms/assign-rack", icon: LocateFixed, requiredWmsStage: "rack_assign" },
    // Store manager's worklist for condemned units with no shelf location
    // (device-scrap D6). "manager" tier so an engineer — who CAN scrap a
    // device but can't place/reverse/dispose one — never sees a page whose
    // every action 403s (the row action itself narrows further to
    // store/warehouse manager; mis sees the page with no usable row action,
    // same idiom as every other manager-tier WMS surface).
    // Gated on the devices_scrap CODE (held only by warehouse/store managers —
    // the same code the backend list endpoint requires), NOT the broader
    // "manager" stage that also admits mis. mis holds no devices_scrap, so it no
    // longer sees a page whose data call 403s for it (CP-550 #8).
    {
      label: "Scrap Placement",
      href: "/wms/scrap-placement",
      icon: Ban,
      requiredPermissions: [wmsPermissions.DEVICES_SCRAP],
    },
    // Outward flow. Material Issue: store/warehouse managers + QC-capability
    // engineers resolve true via `canSeeStage("qc")`; the Sidebar ORs the stage
    // gate with the outward codes, matching the route's OutwardViewGuard.
    { label: "Material Issue", href: "/wms/material-issue", icon: PackageOpen, requiredWmsStage: "qc", requiredPermissions: wmsCan.outwardView },
    { label: "Dispatch Requests", href: "/wms/dispatches", icon: FileCheck, requiredPermissions: wmsCan.outwardView },
    // Stock moving between warehouses. Gated on the same codes the endpoints
    // use (outward_read / outward_manage) so the nav entry never appears for
    // someone who would get a 403 on arrival.
    { label: "Warehouse Transfers", href: "/wms/transfers", icon: ArrowLeftRight, requiredPermissions: wmsCan.outwardView },
    // Component History temporarily hidden — unwired demo page, blocked for
    // everyone incl. superuser until wired (2026-10-05 RBAC decision).
    // Returns. Sales Returns + Replacement Requests are CRM-owned but live under
    // /wms; gated on the CRM read code OR the dedicated wms:returns_* codes
    // (held by warehouse_manager / store_manager) — matches the route guards +
    // the backend endpoints' OR-list, so both audiences see them. (2026-09 RBAC.)
    {
      label: "Sales Returns",
      href: "/wms/sales-returns",
      icon: ArchiveRestore,
      requiredPermissions: [crmPermissions.READ, ...wmsCan.returnsView],
    },
    {
      label: "Replacement Requests",
      href: "/wms/replacements",
      icon: Replace,
      requiredPermissions: [crmPermissions.READ, ...wmsCan.returnsView],
    },
    // Wired route (/wms/rental-returns) + pages already on uat; only the nav
    // link was missing. Same OR gate as its route guard: crm:read or rentals:return.
    {
      label: "Rental Returns",
      href: "/wms/rental-returns",
      icon: Undo2,
      requiredPermissions: [crmPermissions.READ, rentalsPermissions.RETURN],
    },
    { label: "Purchase Returns", href: "/wms/purchase-returns", icon: PackageX, requiredPermissions: procurementCan.returnView },
    { label: "Checklists", href: "/wms/checklists", icon: ClipboardList, requiredPermissions: [...imsCan.view, ...wmsCan.checklistView, ...wmsCan.checklistManage] },
    // Mirrors the BE gate on GET /wms/warehouses (warehouse_read) — engineers
    // hold the read code, so they see this read-only; write buttons inside the
    // pages are separately gated on warehouse_manage / location_manage / team_*.
    { label: "Locations", href: "/wms/locations", icon: MapPin, requiredPermissions: wmsCan.warehouseView },
    // Setup / configuration — vendor masters last. The Sidebar expands
    // this into Service Sections + Service Vendors.
    VENDOR_MASTERS_NAV_PLACEHOLDER,
  ],
};

// Warehouse reporting. A GROUP rather than a single item because more reports
// are expected — each new one becomes an item here, not an IA change. The
// group-level `requiredPermissions` hides the whole section from anyone
// without the code; engineers hold no `wms:report_read` at all, which is the
// intent (see the note in `@modules/wms/permissions`).
//
// HIDDEN from the sidebar (menu only): the cross-module Reports tab further
// down replaces this section. The Stage Checklist page and its route are
// untouched, so direct links keep working. Flip to `true` to show it again.
const SHOW_WMS_REPORTS_NAV_GROUP = false;
const WMS_REPORTS_NAV_GROUP: NavGroup = {
  visibleForScopes: WAREHOUSE_MENU_SCOPES,
  label: "Reports",
  icon: FileText,
  requiredPermissions: wmsCan.reportView,
  items: [
    {
      label: "Stage Checklist",
      href: "/wms/reports/stage-checklist",
      icon: ClipboardCheck,
      requiredPermissions: wmsCan.reportView,
    },
  ],
};

// Every procurement-team surface (queues + vendor master) needs
// `procurement:read`. Warehouse roles like store_manager don't hold it, so
// gating each item hides the whole Procurement group from them (a group with
// no visible items collapses). PM Approvals below keeps its own PM gate, so a
// PM without procurement:read still sees that one item.
const PROCUREMENT_EXTRA_ITEMS: NavItem[] = [
  // Dashboard, Purchase Requests and GRN Matching are not wired to the backend
  // yet (mock pages) — hidden from the sidebar and blocked at the route until
  // they are. Only PO, Vendors and PM Approvals are live. Per-resource read
  // bundles so a role that reads only some resources doesn't land on a page
  // that will 403 on its list endpoint.
  { label: "Purchase Orders", href: "/procurement/po", icon: FileText, requiredPermissions: procurementCan.readPo },
  { label: "Vendors", href: "/procurement/vendors", icon: Store, requiredPermissions: procurementCan.readVendor },
];

/** The sidebar's groups for this environment's feature switches. */
export function buildSidebarNav(features: FeatureFlags): NavGroup[] {
  return [
    {
      label: "CRM",
      icon: Users,
      requiredPermissions: CRM_ANY,
      items: [
        // CRM Dashboard — reachable by any user with at least one CRM read
        // code, broad or finer (the group's own CRM_ANY gate).
        { label: "Dashboard", href: "/crm", icon: LayoutDashboard },
        {
          label: "Leads",
          href: "/crm/leads",
          icon: Users,
          requiredPermissions: crmCan.readLead,
        },
        {
          label: "Rejected Leads",
          href: "/crm/rejected-leads",
          icon: XCircle,
          requiredPermissions: crmCan.readLead,
        },
        {
          label: "Deals",
          href: "/crm/deals",
          icon: Handshake,
          requiredPermissions: crmCan.readDeal,
        },
        {
          label: "Accounts",
          href: "/crm/accounts",
          icon: Building2,
          requiredPermissions: crmCan.readAccount,
        },
        {
          label: "Contacts",
          href: "/crm/contacts",
          icon: Contact,
          requiredPermissions: crmCan.readContact,
        },
        {
          label: "Quotes",
          href: "/crm/quotes",
          icon: FileText,
          requiredPermissions: crmCan.readQuote,
        },
        {
          label: "Material Inquiries",
          href: "/crm/material-inquiries",
          icon: PackageSearch,
          requiredPermissions: crmCan.readMi,
        },
        {
          label: "Demo Requests",
          href: "/crm/demo-requests",
          icon: Monitor,
          requiredPermissions: crmCan.readDr,
        },
        {
          label: "Tasks",
          href: "/crm/tasks",
          icon: ListTodo,
          // Per-resource gate — crm:read OR crm:task_read (matches the
          // GET /crm/tasks backend gate and the route guard).
          requiredPermissions: crmCan.readTask,
        },
        {
          label: "Meetings",
          href: "/crm/meetings",
          icon: Video,
          requiredPermissions: crmCan.readMeeting,
        },
        {
          label: "Calendar",
          href: "/crm/calendar",
          icon: Calendar,
          requiredPermissions: CRM_READ_BROAD,
        },
        {
          // Sale Targets — FY-scoped revenue targets with hierarchical write
          // + approval routing. Backend endpoint gate: crm:user_target. Scope
          // (self / team / all) and approval routing (via the subject's
          // crm:user_target_requires_approval permission) are decided server-
          // side; the FE only gates visibility on the single endpoint perm.
          label: "Sale Targets",
          href: "/crm/sale-targets",
          icon: Target,
          requiredPermissions: [crmPermissions.USER_TARGET],
        },
        {
          label: "Sales Orders",
          href: "/crm/sales-orders",
          icon: ShoppingCart,
          requiredPermissions: crmCan.readSo,
        },
        ...SALES_TEAM_REQUEST_ITEMS,
        // What came back missing or broken from rentals, waiting on sales.
        {
          label: "Recovery Queue",
          href: "/crm/deficiencies",
          icon: Receipt,
          requiredPermissions: crmCan.readDeficiency,
        },
        // CRM Purchase Requests — gated on the `crm_extras` switch AND RBAC.
        ...(features.crm_extras
          ? [
              {
                label: "Purchase Requests",
                href: "/crm/purchase-requests",
                icon: FilePlus,
                requiredPermissions: CRM_READ_BROAD,
              },
            ]
          : []),
      ],
    },
    // Warehouse group — spread when the `wms` feature switch is on. Each item inside
    // `WMS_NAV_GROUP` carries its own gate (fine-grained code bundle, stage
    // capability, or superuserOnly for mock pages), so even when the flag is
    // on the group still auto-hides for users with no WMS access at all.
    ...(features.wms
      ? [WMS_NAV_GROUP, ...(SHOW_WMS_REPORTS_NAV_GROUP ? [WMS_REPORTS_NAV_GROUP] : [])]
      : []),
    {
      label: "Inventory",
      icon: Boxes,
      // Catalog items gate on `imsCan.view` (ims:read OR ims:manage); Stock
      // Adjustments and My Exports carry their own codes. The group auto-hides
      // when its filtered `items` list is empty (Sidebar filter logic).
      items: [
        // IMS Dashboard is not wired yet (mock) — hidden from the sidebar and
        // blocked at the route until it is.
        {
          label: "Parts",
          href: "/ims/parts",
          icon: Package,
          requiredPermissions: imsCan.view,
        },
        {
          label: "Categories",
          href: "/ims/categories",
          icon: FolderTree,
          requiredPermissions: imsCan.view,
        },
        {
          label: "OEMs",
          href: "/ims/oems",
          icon: Factory,
          requiredPermissions: imsCan.view,
        },
        {
          label: "HSN Code",
          href: "/ims/hsn-codes",
          icon: Percent,
          requiredPermissions: imsCan.view,
        },
        {
          label: "Specification Attributes",
          href: "/ims/specification-attributes",
          icon: ListChecks,
          requiredPermissions: imsCan.view,
        },
        {
          label: "Stock Items",
          href: "/ims/stock-items",
          icon: Tags,
          requiredPermissions: imsCan.view,
        },
        {
          label: "PM Assignments",
          href: "/ims/pm-assignments",
          icon: UserCog,
          requiredPermissions: imsCan.write,
        },
        // These two are admin-only by default: own codes, not ims:read (stock-adjustment spec §6).
        {
          label: "Stock Adjustments",
          href: "/ims/stock-adjustments",
          icon: SlidersHorizontal,
          requiredPermissions: imsCan.stockAdjustView,
        },
        {
          label: "My Exports",
          href: "/ims/exports",
          icon: Download,
          requiredPermissions: imsCan.export,
        },
      ],
    },
    {
      label: "Procurement",
      icon: ClipboardList,
      items: [
        ...(features.procurement ? PROCUREMENT_EXTRA_ITEMS : []),
        {
          label: "PM Approvals",
          href: "/procurement/pm-approvals",
          icon: ShieldCheck,
          requiredPermissions: PM_APPROVALS_ANY,
        },
      ],
    },
    RENTALS_NAV_GROUP,
    // Cross-module Reports hub — role-gated (superadmin / admin / store manager /
    // PM). The backend re-checks the role and scopes data on every call.
    {
      label: "Reports",
      icon: BarChart3,
      items: [
        { label: "Reports", href: "/reports", icon: BarChart3, requiredRoles: REPORT_ROLES },
      ],
    },
    {
      label: "Settings",
      icon: Settings,
      items: [
        { label: "Profile", href: "/settings/profile", icon: UserCircle },
        {
          label: "User Management",
          href: "/settings/users",
          icon: Users,
          superuserOnly: true,
        },
        {
          label: "Roles & Permissions",
          href: "/settings/roles",
          icon: Shield,
          superuserOnly: true,
        },
        {
          label: "App Settings",
          href: "/settings/app",
          icon: Settings,
          // Non-superusers see Profile only in the Settings section (2026-05-22).
          superuserOnly: true,
        },
      ],
    },
  ];
}
