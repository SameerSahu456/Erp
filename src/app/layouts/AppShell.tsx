import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { WarehouseScopeProvider } from "@modules/wms";

import { SidebarProvider } from "@/contexts/SidebarContext";
import { useResetCrmFiltersOnSectionChange } from "@/hooks/use-reset-crm-filters";
import { useRecordRecentLocations } from "@/shared/hooks/useRecentLocations";
import { useScrollToTopOnNavigate } from "@/shared/hooks/useScrollToTopOnNavigate";
import { useScopedViewReset } from "@/shared/hooks/useScopedViewReset";

// TEMP (local): ERP Assistant bot disabled — module is WIP in another session.
// import { AssistantLauncher } from "@modules/assistant";

import { FloatingQueryButton } from "./FloatingQueryButton";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

function PageLoader() {
  return (
    <div className="flex h-48 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

/**
 * Top-level layout. Per design.md §9.3 / §9.4, <main> exposes:
 *   data-module="<first url segment>"   — drives module-scoped CSS polish
 *   data-page-type="list" | "form" | "detail"  — drives e.g. CRM luxury layer's
 *     opt-out for hover lift on detail pages
 *
 * The shared content cap and outer padding apply to every page.
 */
export function AppShell() {
  const { pathname } = useLocation();

  // Wipe a CRM section's persisted list filters when the user leaves it,
  // so every CRM section opens fresh instead of inheriting a stale filter.
  useResetCrmFiltersOnSectionChange();
  // Same rule for the PO and Inward/GRN list views: their per-tab filters +
  // pagination persist only within the section (list ↔ detail), and reset once
  // the user navigates out of the section.
  useScopedViewReset();

  // A route change starts at the top of the new page, not wherever the previous
  // page happened to be scrolled to. Route-level, not per-page, so no screen can
  // forget to do it.
  useScrollToTopOnNavigate();

  // Remember recent in-app URLs so a detail page's Back can return to the page
  // the user actually came from (see `useRecentLocations`).
  useRecordRecentLocations();

  const segs = pathname.split("/").filter(Boolean);
  const moduleSlug = segs[0] || "home";
  const last = segs[segs.length - 1];
  let pageType: "list" | "form" | "detail" = "list";
  if (segs.length >= 3) {
    if (last === "new" || last === "edit") pageType = "form";
    else pageType = "detail";
  }

  // Single source of truth for outer page padding: the whole app shares ONE
  // frame so content never shifts when you navigate between modules/pages.
  // Pages and shells MUST NOT add their own outer padding/margin (enforced by
  // the `no-restricted-syntax` page-root rule in eslint.config.js). The value
  // `p-5 lg:p-7` is what the sticky bleed components are built around
  // (EntityHeader + FormPageShell footer use `-mx-5 lg:-mx-7`).
  const mainPadding = "p-5 lg:p-7";

  // The global scroll-to-top FAB is suppressed on the Warehouse Transfers list
  // and detail: it was flagged as unnecessary chrome there. Scoped by route
  // here rather than inside the button so the generic
  // widget stays route-agnostic.
  const hideScrollToTop = pathname.startsWith("/wms/transfers");

  return (
    <SidebarProvider>
      <WarehouseScopeProvider>
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main
            data-module={moduleSlug}
            data-page-type={pageType}
            className={`flex-1 min-w-0 ${mainPadding} animate-fade-in`}
          >
            <div className="mx-auto w-full max-w-[1600px]">
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </div>
        {!hideScrollToTop && <FloatingQueryButton />}
        {/* TEMP (local): ERP Assistant bot disabled — module is WIP in another session. */}
        {/* <AssistantLauncher /> */}
      </div>
      </WarehouseScopeProvider>
    </SidebarProvider>
  );
}
