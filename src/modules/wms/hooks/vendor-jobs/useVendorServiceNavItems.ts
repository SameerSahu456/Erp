/**
 * Sidebar entries for the vendor-service sections, built from DATA.
 *
 * One entry per active `service_sections` row plus the cross-section "All
 * Vendor Jobs" view. This is the visible payoff of the whole feature: seed a
 * section row and it appears in the sidebar on the next load, with no deploy.
 */
import { useMemo } from "react";

import { useServiceSections } from "./useServiceSections";
import { VENDOR_SERVICE_NAV_STRINGS as S } from "./use-vendor-service-nav-items.strings";

export interface VendorServiceNavItem {
  label: string;
  href: string;
}

export const useVendorServiceNavItems = (): VendorServiceNavItem[] => {
  // CACHE-ONLY (`enabled: false`): the sidebar renders on every page, so letting
  // it FETCH `/wms/service-sections` meant that call fired app-wide — on CRM,
  // IMS, Settings, everywhere — for a sub-nav most of those pages never use. It
  // is only genuinely needed on the vendor-jobs pages (and the Service Sections
  // admin screen), which fetch it themselves. Here we only READ whatever those
  // pages already cached: the dynamic section links appear once a vendor page
  // has loaded them, and the sidebar itself never triggers the request.
  const { data } = useServiceSections({ enabled: false });
  return useMemo(() => {
    const sections = (data ?? []).map((s) => ({
      label: s.name,
      // The section CODE is the route segment; it is deliberately not
      // renameable server-side, so these links stay valid.
      href: `/wms/vendor-jobs/${s.code}`,
    }));
    // "All Vendor Jobs" first: "what is outside the building right now" is the
    // question a supervisor actually asks, and answering it should not mean
    // visiting three pages.
    return [
      { label: S.allJobs, href: "/wms/vendor-jobs" },
      ...sections,
      // The master sits with its sections rather than under a global Masters
      // group: you reach for it while looking at a section's queue.
      { label: S.vendors, href: "/wms/vendor-jobs/vendors" },
      { label: S.sections, href: "/wms/vendor-jobs/sections" },
    ];
  }, [data]);
};
