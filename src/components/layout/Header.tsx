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
    <header className="sticky top-0 z-50 h-14 bg-card/80 glass border-b border-border">
      <div className="flex items-center h-full px-5 gap-3">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden size-[34px] shrink-0 text-muted-foreground hover:text-foreground hover:bg-secondary"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-4" />
          <span className="sr-only">Open menu</span>
        </Button>

        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-[12px] font-bold tracking-wide shrink-0 transition-transform group-hover:scale-105">CP</div>
          <span className="font-[650] text-[15px] tracking-[-0.01em] text-foreground">Comprint</span>
        </Link>

        {/* Search bar */}
        <div className="hidden md:flex items-center gap-2.5 flex-1 max-w-[520px] ml-5 bg-secondary/60 border border-transparent hover:border-border focus-within:border-primary focus-within:bg-card focus-within:shadow-sm rounded-lg px-3 py-[7px] text-muted-foreground text-[13px] transition-all">
          <Search className="size-[15px] shrink-0 opacity-60" />
          <input
            placeholder="Search customers, Part nos, orders, reports…"
            className="flex-1 bg-transparent border-none outline-none text-foreground text-[13px] placeholder:text-muted-foreground/60"
          />
          <kbd className="hidden lg:inline font-mono text-[10px] text-muted-foreground bg-card border border-border px-1.5 py-0.5 rounded-md">⌘K</kbd>
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
          <div className="ml-2">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  )
}
