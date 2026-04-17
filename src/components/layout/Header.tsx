import { Menu } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/contexts/SidebarContext'
import { GlobalSearch } from './GlobalSearch'
import { NotificationPopover } from './NotificationPopover'
import { ThemeSwitcher } from './ThemeSwitcher'
import { DevRoleSwitcher } from './DevRoleSwitcher'
import { UserMenu } from './UserMenu'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Reports', href: '/reports' },
  { label: 'Calendar', href: '/calendar' },
]

export function Header() {
  const { setMobileOpen } = useSidebar()
  const location = useLocation()

  return (
    <header className="sticky top-0 z-50 h-14 bg-card/80 backdrop-blur-xl border-b border-border/60">
      <div className="flex items-center h-full px-4 gap-3">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8 shrink-0"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>

        {/* Logo */}
        <Link to="/" className="flex items-baseline gap-0 shrink-0 group">
          <span className="text-primary font-ui font-bold text-lg tracking-tight">comprint</span>
          <span className="font-display font-bold text-lg text-foreground/80">tech</span>
        </Link>

        {/* Center nav links */}
        <nav className="hidden lg:flex items-center gap-1 ml-8 font-ui">
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.href
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'px-3.5 py-1.5 text-[13px] font-medium rounded-lg transition-all',
                  isActive
                    ? 'text-primary bg-primary/8 font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <GlobalSearch />
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
