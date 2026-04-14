import { Menu } from 'lucide-react'
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
    <header className="sticky top-0 z-50 h-16 bg-card border-b border-border">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left: mobile hamburger + logo */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
          <Link to="/" className="flex items-center">
            <span className="text-primary font-sans font-bold text-xl">comprint</span>
            <span className="font-serif font-bold text-xl text-foreground">tech</span>
          </Link>
        </div>

        {/* Center: nav links (desktop only) */}
        <nav className="hidden lg:flex items-center gap-1">
          <Link
            to="/dashboard"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
          >
            Dashboard
          </Link>
          <Link
            to="/reports"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
          >
            Reports
          </Link>
          <Link
            to="/calendar"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
          >
            Calendar
          </Link>
        </nav>

        {/* Right: actions */}
        <div className="flex items-center gap-1">
          <GlobalSearch />
          <NotificationPopover />
          <ThemeSwitcher />
          <DevRoleSwitcher />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
