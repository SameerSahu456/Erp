import { Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { WarehouseScopePicker } from "@modules/wms";

import { ComprintLogo } from "@/components/common/display/ComprintLogo";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/contexts/use-sidebar";

import { GlobalSearchProvider } from "./GlobalSearch";
import { NotificationPopover } from "./NotificationPopover";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { UserMenu } from "./UserMenu";

export function Header() {
  const { setMobileOpen } = useSidebar();
  // The warehouse scope only drives WMS views, so the picker shows on WMS
  // routes only — it's meaningless (and its filter has no effect) elsewhere.
  const isWmsRoute = useLocation().pathname.startsWith("/wms");

  return (
    <GlobalSearchProvider>
      {() => (
        <header className="sticky top-0 z-50 h-14 bg-card border-b border-border">
          <div className="flex items-center h-full px-3 sm:px-5 gap-2 sm:gap-3">
            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden size-[34px] shrink-0 text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-white/5"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-4" />
              <span className="sr-only">Open menu</span>
            </Button>

            {/* Brand */}
            <Link
              to="/"
              className="flex items-center shrink-0"
              aria-label="Comprint — go to dashboard"
            >
              <ComprintLogo className="h-[15px] w-auto origin-left scale-x-105 text-foreground transition-opacity hover:opacity-80" />
            </Link>

            {/* Global search hidden per request (2026-05-22). The command
                palette (⌘K) + GlobalSearchProvider stay mounted. To restore the
                top-bar search: uncomment the two blocks below, change the render
                prop above back to `{({ open }) => (`, and re-import `Search`
                (lucide-react) + `GlobalSearchButton` (./GlobalSearch).

            <button
              type="button"
              onClick={open}
              className="hidden md:flex items-center gap-2.5 flex-1 max-w-[520px] ml-5 bg-secondary/60 border border-transparent hover:border-border focus-within:border-primary focus-within:bg-card focus-within:shadow-sm rounded-lg px-3 py-[7px] text-muted-foreground text-[13px] transition-all cursor-text text-left"
              aria-label="Open search"
            >
              <Search className="size-[15px] shrink-0 opacity-60" />
              <span className="flex-1 text-muted-foreground/60">
                Search customers, Part nos, orders, reports…
              </span>
              <kbd className="hidden lg:inline font-mono text-[10px] text-muted-foreground bg-card border border-border px-1.5 py-0.5 rounded-md">
                ⌘K
              </kbd>
            </button>
            */}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {/* Warehouse switcher — scopes every WMS view to one warehouse.
                  Only shown on WMS routes (its scope affects WMS pages only);
                  further gated by role/assignment inside the component. */}
              {isWmsRoute && <WarehouseScopePicker />}
              {/* Global search trigger hidden per request — see note above.
              <div className="md:hidden">
                <GlobalSearchButton onOpen={open} />
              </div>
              */}
              <NotificationPopover />
              <ThemeSwitcher />
              <div className="ml-2">
                <UserMenu />
              </div>
            </div>
          </div>
        </header>
      )}
    </GlobalSearchProvider>
  );
}
