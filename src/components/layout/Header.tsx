import { Menu, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/contexts/SidebarContext'
import { GlobalSearch } from './GlobalSearch'
import { NotificationPopover } from './NotificationPopover'
import { ThemeSwitcher } from './ThemeSwitcher'
import { DevRoleSwitcher } from './DevRoleSwitcher'
import { UserMenu } from './UserMenu'

export function Header() {
  const { setMobileOpen } = useSidebar()

  return (
    <header className="sticky top-0 z-50 h-14 bg-card border-b border-[#E4E7EC]">
      <div className="flex items-center h-full px-5 gap-3">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden size-[34px] shrink-0 text-[#344054] hover:bg-[#EEF0F3]"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-4" />
          <span className="sr-only">Open menu</span>
        </Button>

        {/* Brand — Comprint ERP */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-[7px] bg-[#0F1B2D] flex items-center justify-center text-white text-[13px] font-bold tracking-wide shrink-0">CP</div>
          <span className="font-[650] text-[15px] tracking-[-0.01em] text-foreground">Comprint</span>
        </Link>

        {/* Search bar — Comprint topbar style */}
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-[520px] ml-4 bg-[#EEF0F3] border border-transparent rounded-lg px-2.5 py-[7px] text-[#667085] text-[13px]">
          <Search className="size-[15px] shrink-0" />
          <input
            placeholder="Search customers, SKUs, orders, reports…"
            className="flex-1 bg-transparent border-none outline-none text-foreground text-[13px] placeholder:text-[#98A2B3]"
          />
          <kbd className="hidden lg:inline font-mono text-[10.5px] text-[#667085] bg-card border border-[#E4E7EC] px-1.5 py-0.5 rounded">⌘K</kbd>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <div className="md:hidden">
            <GlobalSearch />
          </div>
          <NotificationPopover />
          <ThemeSwitcher />
          <DevRoleSwitcher />
          <div className="ml-1.5">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  )
}
