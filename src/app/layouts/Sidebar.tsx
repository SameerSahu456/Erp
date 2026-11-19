import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ChevronDown, PanelLeft, PanelLeftClose } from "lucide-react";

import { ComprintLogo } from "@/components/common/display/ComprintLogo";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/contexts/use-sidebar";
import { cn } from "@/lib/utils";
import type { NavGroup, NavItem } from "@app/layouts/navigation";

import { originBackHref } from "@modules/wms";

import { dashboardItem } from "./sidebar-nav-config";
import { useVisibleSidebarNav } from "./use-visible-sidebar-nav";

// Remembers the last query string seen at each route this session, so the
// sidebar returns the operator to e.g. `/ims/parts?search=switch` instead of
// a bare `/ims/parts` that drops their search and filters. A detail route
// (`/ims/parts/:id`) records its own key and never overwrites the list's.
const routeQueryMemory = new Map<string, string>();

/** A nav href with its remembered query string re-applied, if any. */
function navHref(href: string): string {
  const remembered = routeQueryMemory.get(href);
  return remembered ? `${href}${remembered}` : href;
}

// Returns the single most-specific (longest) nav href that matches the current
// pathname, or null if none. Resolves the `/crm` (Dashboard) vs `/crm/leads`
// (Leads) ambiguity on deep URLs like `/crm/leads/:id/edit` — both would
// otherwise pass a naive startsWith and double-highlight.
function resolveActiveHref(pathname: string, hrefs: readonly string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    const matches =
      href === "/"
        ? pathname === "/"
        : pathname === href || pathname.startsWith(href + "/");
    if (matches && (best === null || href.length > best.length)) {
      best = href;
    }
  }
  return best;
}

// Device detail carries `?from=<origin>`; use WMS's DEVICE_ORIGINS so the active tab matches Back.

function NavItemLink({
  item,
  isActive,
  isCollapsed,
}: {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      to={navHref(item.href)}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition-all",
        "text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-white/5",
        isActive && "bg-accent text-foreground font-[550]",
        isCollapsed && "justify-center px-2 py-2",
      )}
    >
      <Icon
        className={cn(
          "shrink-0",
          isCollapsed ? "size-[18px]" : "size-4",
          isActive ? "opacity-100" : "opacity-70",
        )}
      />
      {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={link} />
        <TooltipContent side="right" sideOffset={8}>
          <span className="text-xs">{item.label}</span>
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

// A nav item that owns nested children (the data-driven vendor-service
// sections). The parent row links to its own destination (the cross-section
// "all jobs" view); a chevron on the right expands an indented sub-list. It
// auto-opens when the parent or a child is the active route. Children render
// icon-less — the parent's icon carries the group — under a hairline rail.
function NavParentItem({
  item,
  activeHref,
}: {
  item: NavItem;
  activeHref: string | null;
}) {
  const Icon = item.icon;
  const children = item.children ?? [];
  const isSelfActive = item.href === activeHref;
  const isChildActive = children.some((c) => c.href === activeHref);
  const [isOpen, setIsOpen] = useState(isSelfActive || isChildActive);
  // Reveal the sub-list when a child becomes active via navigation. Keyed on
  // the active-child transition so it never fights a deliberate collapse.
  const [wasChildActive, setWasChildActive] = useState(isChildActive);
  if (isChildActive !== wasChildActive) {
    setWasChildActive(isChildActive);
    if (isChildActive) setIsOpen(true);
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center rounded-lg pr-1 transition-all",
          "text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-white/5",
          isSelfActive && "bg-accent text-foreground",
        )}
      >
        <Link
          to={navHref(item.href)}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-[7px] text-[13px]",
            isSelfActive && "font-[550]",
          )}
        >
          <Icon
            className={cn(
              "size-4 shrink-0",
              isSelfActive ? "opacity-100" : "opacity-70",
            )}
          />
          <span className="truncate flex-1">{item.label}</span>
        </Link>
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-label={`${isOpen ? "Collapse" : "Expand"} ${item.label}`}
          aria-expanded={isOpen}
          className="shrink-0 rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-secondary hover:text-foreground dark:hover:bg-white/5"
        >
          <ChevronDown
            className={cn(
              "size-[13px] transition-transform duration-200",
              !isOpen && "-rotate-90",
            )}
          />
        </button>
      </div>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-[1500px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="mt-[1px] ml-[27px] space-y-[1px] border-l border-border pl-2">
          {children.map((child) => (
            <Link
              key={child.href}
              to={navHref(child.href)}
              className={cn(
                "flex items-center rounded-lg px-2.5 py-[6px] text-[13px] transition-all",
                "text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-white/5",
                child.href === activeHref && "bg-accent text-foreground font-[550]",
              )}
            >
              <span className="truncate">{child.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function NavGroupSection({
  group,
  isCollapsed,
  activeHref,
}: {
  group: NavGroup;
  isCollapsed: boolean;
  activeHref: string | null;
}) {
  const isGroupActive = group.items.some(
    (item) =>
      item.href === activeHref ||
      item.children?.some((c) => c.href === activeHref),
  );
  const [isOpen, setIsOpen] = useState(isGroupActive);
  // Open the section the user is on whenever it BECOMES active — on first load,
  // after the post-login redirect, or via any link — not only at mount. Keyed on
  // the transition so it never fights a deliberate collapse of the current one.
  const [wasActive, setWasActive] = useState(isGroupActive);
  if (isGroupActive !== wasActive) {
    setWasActive(isGroupActive);
    if (isGroupActive) setIsOpen(true);
  }
  const GroupIcon = group.icon;

  if (isCollapsed) {
    const firstItem = group.items[0];
    if (!firstItem) return null;
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              to={navHref(firstItem.href)}
              className={cn(
                "flex w-full items-center justify-center rounded-lg px-2 py-2 transition-all",
                "text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-white/5",
                isGroupActive && "bg-accent text-foreground",
              )}
            >
              <GroupIcon className="size-[18px]" />
            </Link>
          }
        />
        <TooltipContent side="right" sideOffset={8}>
          <div className="space-y-1">
            <p className="font-semibold text-xs">{group.label}</p>
            {group.items
              .flatMap((item) => [item, ...(item.children ?? [])])
              .map((item) => (
                <Link
                  key={item.href}
                  to={navHref(item.href)}
                  className={cn(
                    "block text-xs hover:text-foreground transition-colors",
                    item.href === activeHref && "font-medium",
                  )}
                >
                  {item.label}
                </Link>
              ))}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="mt-3">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-2.5 py-[6px] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 hover:text-muted-foreground transition-colors"
      >
        <span>{group.label}</span>
        <ChevronDown
          className={cn(
            "size-[11px] opacity-50 transition-transform duration-200",
            !isOpen && "-rotate-90",
          )}
        />
      </button>
      <div
        className={cn(
          "space-y-[1px] mt-0.5 overflow-hidden transition-all duration-200",
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        {group.items.map((item) =>
          item.children && item.children.length > 0 ? (
            <NavParentItem key={item.href} item={item} activeHref={activeHref} />
          ) : (
            <NavItemLink
              key={item.href}
              item={item}
              isActive={item.href === activeHref}
              isCollapsed={false}
            />
          ),
        )}
      </div>
    </div>
  );
}

// Warehouse-floor roles. A user who holds ONLY these works inside the WMS and
// has no cross-module home, so the top "Dashboard" link is hidden for them
// (CP-193 #6); L1/L2/L3 engineers all map to the single `engineer` role, so
// the engineer view is identical for every level.
// HIDDEN with the Home dashboard link (its only consumer).
// const WAREHOUSE_ONLY_ROLES = new Set([
//   "engineer",
//   "warehouse_manager",
//   "store_manager",
//   "mis",
// ]);

function SidebarNav({
  isCollapsed,
  pathname,
}: {
  isCollapsed: boolean;
  pathname: string;
}) {
  const visibleGroups = useVisibleSidebarNav();
  const [searchParams] = useSearchParams();

  const allHrefs = [
    dashboardItem.href,
    ...visibleGroups.flatMap((group) =>
      group.items.flatMap((item) => [
        item.href,
        ...(item.children?.map((c) => c.href) ?? []),
      ]),
    ),
  ];
  let activeHref = resolveActiveHref(pathname, allHrefs);
  // "Create from parent" deep-links — opening a Quote / Sales Order /
  // Material Inquiry / Demo Request / Contact form from a Lead, Deal or
  // Account carries that entity's id as `?leadId|dealId|accountId=`. Keep
  // the *source* module highlighted in the sidebar rather than the form's
  // own section, so the user keeps their place. (Closed Won already nests
  // under /crm/leads|deals/:id, so its highlight resolves from the path.)
  const sourceHref = searchParams.get("leadId")
    ? "/crm/leads"
    : searchParams.get("dealId")
      ? "/crm/deals"
      : searchParams.get("accountId")
        ? "/crm/accounts"
        : null;
  if (sourceHref && allHrefs.includes(sourceHref)) {
    activeHref = sourceHref;
  }
  // A device detail opened from a stage queue (/wms/devices/:id?from=<stage>)
  // keeps the SOURCE stage tab highlighted (Repair / Inspection / QC / …), not
  // "Devices" — the longest-prefix match would otherwise pick Devices. The
  // Devices hub itself (/wms/devices, no id) is unaffected.
  const wmsFrom = searchParams.get("from");
  const wmsFromHref = originBackHref(wmsFrom ?? null);
  if (
    pathname.startsWith("/wms/devices/") &&
    wmsFromHref &&
    allHrefs.includes(wmsFromHref)
  ) {
    activeHref = wmsFromHref;
  }
  // PO approvals (`/procurement/po/approvals` + its review card) are a
  // PM-approvals activity, even though the route nests under `/procurement/po`.
  // Keep "PM Approvals" highlighted instead of "Purchase Orders" (which the
  // longest-prefix match would otherwise pick).
  if (
    pathname.startsWith("/procurement/po/approvals") &&
    allHrefs.includes("/procurement/pm-approvals")
  ) {
    activeHref = "/procurement/pm-approvals";
  }
  // Main Dashboard nav link — gated by the `dashboard` feature switch.
  // HIDDEN: Home dashboard nav link
  // const isDashboardActive =
  //   activeHref === dashboardItem.href || pathname === "/dashboard";

  return (
    <TooltipProvider>
      <nav className="flex flex-col gap-0 px-2.5 py-2.5">
        {/* HIDDEN: Home dashboard nav link
        {features.dashboard && !isWarehouseOnly && (
          <NavItemLink
            item={dashboardItem}
            isActive={isDashboardActive}
            isCollapsed={isCollapsed}
          />
        )}
        */}

        {visibleGroups.map((group) => (
          <NavGroupSection
            key={group.label}
            group={group}
            isCollapsed={isCollapsed}
            activeHref={activeHref}
          />
        ))}
      </nav>
    </TooltipProvider>
  );
}

export function Sidebar() {
  const { isCollapsed, isMobileOpen, toggleCollapsed, setMobileOpen } = useSidebar();
  const { pathname, search } = useLocation();

  // Record the live query against the current path so a later sidebar click
  // on the same destination restores the operator's search and filters.
  useEffect(() => {
    routeQueryMemory.set(pathname, search);
  }, [pathname, search]);

  // When a detail page is opened from the Rejected Leads list it shares the
  // `/crm/leads/:id` URL with the regular Leads flow. The `?from=rejected`
  // hint lets the sidebar keep "Rejected Leads" highlighted so the user
  // can find their way back.
  const fromRejected =
    new URLSearchParams(search).get("from") === "rejected" &&
    pathname.startsWith("/crm/leads/");
  const effectivePathname = fromRejected ? "/crm/rejected-leads" : pathname;

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex min-h-0 flex-col sticky top-14 h-[calc(100vh-3.5rem)] overflow-hidden z-40",
          "bg-card border-r border-border transition-all duration-200",
          isCollapsed ? "w-16" : "w-[248px]",
        )}
      >
        <div
          className={cn(
            "flex items-center h-10 px-2.5 border-b border-border",
            isCollapsed ? "justify-center" : "justify-end",
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-white/5"
            onClick={toggleCollapsed}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeft className="size-3.5" />
            ) : (
              <PanelLeftClose className="size-3.5" />
            )}
          </Button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <SidebarNav isCollapsed={isCollapsed} pathname={effectivePathname} />
        </ScrollArea>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[260px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
          <div className="flex items-center h-14 px-4 border-b border-border">
            <ComprintLogo className="h-[15px] w-auto origin-left scale-x-105 text-foreground" />
          </div>
          <ScrollArea className="h-[calc(100vh-3.5rem)] min-h-0">
            <SidebarNav isCollapsed={false} pathname={effectivePathname} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
