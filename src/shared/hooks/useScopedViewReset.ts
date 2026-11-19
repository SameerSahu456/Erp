import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { clearMemoryState } from "@/shared/hooks/useMemoryState";

/**
 * List pages that persist their per-tab view (filters / sort / page / page size)
 * to sessionStorage do so ONLY while the user stays inside the section's URL
 * subtree. This hook clears a section's persisted keys the moment the current
 * path leaves that subtree.
 *
 * Effect: list ↔ detail navigation INSIDE a section (e.g. `/procurement/po` list
 * → `/procurement/po/:id` detail → back) keeps the filters and page. Leaving the
 * section to any other page (Vendors, Inward, dashboard, …) wipes them, so
 * re-entering the section starts clean — matching the product rule that a view
 * is remembered within its own module, not across the whole app.
 *
 * Mount once, high in the tree (AppShell), so it observes every navigation.
 */
// The device-detail page is shared by every stage queue (rows drill into
// `/wms/devices/:id?from=<stage>`), so it counts as "still inside" each stage
// section — otherwise clicking a row would wipe that queue's view.
const DEVICE_DETAIL = "/wms/devices/";

// IMS list pages persist their table view — search, active tab, column filters,
// sort, page — to sessionStorage via BusinessMetricsTable's `persistKey`
// (`bmt:ims-*` keys), a DIFFERENT store from the scoped sections below. Like
// those, the view should survive in-module navigation (a list ↔ detail
// round-trip stays under `/ims`) but start clean on RE-ENTRY. The URL-held
// filters already reset on a base-URL nav; clearing these stops the search box
// (and the rest of the table view) lingering with stale state after the user
// leaves IMS and comes back.
const IMS_SUBTREE = "/ims";
const IMS_BMT_KEY_PREFIX = "bmt:ims-";

function clearSessionKeysByPrefix(prefix: string) {
  try {
    const stale: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(prefix)) stale.push(key);
    }
    stale.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // sessionStorage unavailable (private mode / blocked) — nothing to clear.
  }
}

// A section's view keys (`<storageKey>:views` + `<storageKey>:tab`) are cleared
// the moment the path matches NONE of its `keep` prefixes. `keep` therefore
// lists every path that should preserve the view — the section's own subtree
// plus any shared detail route reached from it.
function sec(storageKey: string, ...keep: string[]) {
  return { keep, keys: [`${storageKey}:views`, `${storageKey}:tab`] };
}

const SCOPED_SECTIONS: { keep: string[]; keys: string[] }[] = [
  // Purchase Orders (keys predate the shared convention).
  {
    keep: ["/procurement/po"],
    keys: ["procurement-po:views", "procurement-po:status"],
  },
  // Inward / GRN (its detail lives under /wms/inward/:id/devices).
  { keep: ["/wms/inward"], keys: ["wms-inward:views", "wms-inward:activeTab"] },
  // Device-queue stage pages — each drills into the shared device detail.
  sec("wms-qc", "/wms/qc", DEVICE_DETAIL),
  sec("wms-inspection", "/wms/inspection", DEVICE_DETAIL),
  sec("wms-repair", "/wms/repair", DEVICE_DETAIL),
  sec("wms-vendor-jobs", "/wms/vendor-jobs", DEVICE_DETAIL),
  sec("wms-assign-rack", "/wms/assign-rack", DEVICE_DETAIL),
  // Devices list + its own detail subtree.
  sec("wms-devices", "/wms/devices"),
  // Rentals sales orders. Its rows drill into the CRM sales-order detail
  // (`?from=rentals`), which is therefore "still inside" this section —
  // otherwise opening an order would wipe the filters the user is coming
  // back to. The keys are listed explicitly rather than via `sec()`
  // because this page keeps a wider view than views+tab.
  {
    keep: ["/rentals/sales-orders", "/crm/sales-orders/"],
    keys: [
      "rentals-sales-orders:page",
      "rentals-sales-orders:pageSize",
      "rentals-sales-orders:search",
      "rentals-sales-orders:filters",
      "rentals-sales-orders:status",
      "rentals-sales-orders:sort",
      "rentals-sales-orders:created",
    ],
  },
  // Device tracking. Its detail lives in the same subtree
  // (`/rentals/tracking/:id`), so one prefix covers both.
  {
    // `/crm/sales-orders/` is included because a unit's detail links out to
    // its order; walking there and back must not wipe the list view behind
    // it. The trailing slash keeps CRM's own LIST out — reaching that
    // really is leaving.
    keep: ["/rentals/tracking", "/crm/sales-orders/"],
    keys: [
      "rentals-devices:page",
      "rentals-devices:pageSize",
      "rentals-devices:search",
      "rentals-devices:filters",
      "rentals-devices:returnRange",
      "rentals-devices:sort",
      // Status is the tab axis now, so the selected tab is view state.
      "rentals-devices:tab",
      // The All tab's Status multi-select.
      "rentals-devices:statuses",
    ],
  },
  // Rentals invoice register. Its detail lives in the same subtree
  // (`/rentals/invoices/:id`), so one prefix covers both. `includeDeleted`
  // is listed because "show voided" is part of the view the user set up —
  // leaving the section should reset it like everything else.
  {
    keep: ["/rentals/invoices"],
    keys: [
      "rentals-invoices:page",
      "rentals-invoices:pageSize",
      "rentals-invoices:search",
      // The Live/Auto/Voided TAB replaced the old includeDeleted checkbox.
      "rentals-invoices:tab",
      "rentals-invoices:sort",
      // Issue-date window.
      "rentals-invoices:issued",
    ],
  },
  // Self-contained list sections.
  // Work Assignments: rows open the WA detail (same subtree), and a WA detail can
  // drill into the shared device detail — keep both so the list view survives the
  // round-trip either way.
  sec("wms-work-assignments", "/wms/work-assignments", DEVICE_DETAIL),
  // A WA detail's line table (same keep-set: its rows drill into device detail).
  sec("wms-work-assignment-lines", "/wms/work-assignments", DEVICE_DETAIL),
  sec("wms-spares", "/wms/spares", DEVICE_DETAIL),
  sec("wms-material-issue", "/wms/material-issue"),
  sec("wms-dispatches", "/wms/dispatches"),
  sec("wms-warehouse-transfers", "/wms/transfers"),
  sec("wms-locations", "/wms/locations"),
  sec("wms-checklists", "/wms/checklists"),
  // Sales-return + replacement lists: each remembers its view across its own
  // list ↔ detail round-trip, and resets on leaving the section (§1.1.B).
  sec("wms-sales-returns", "/wms/sales-returns"),
  sec("wms-replacements", "/wms/replacements"),
  sec("ims-stock-adjustments", "/ims/stock-adjustments"),
];

export function useScopedViewReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    for (const section of SCOPED_SECTIONS) {
      if (!section.keep.some((p) => pathname.startsWith(p))) {
        section.keys.forEach(clearMemoryState);
      }
    }
    // Leaving the IMS module wipes its tables' persisted view (search/tab/
    // filters/sort/page) so re-entry starts clean. Scoped to the whole `/ims`
    // subtree, so moving between IMS pages or into a detail keeps the view.
    if (!pathname.startsWith(IMS_SUBTREE)) {
      clearSessionKeysByPrefix(IMS_BMT_KEY_PREFIX);
    }
  }, [pathname]);
}
