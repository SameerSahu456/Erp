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
    <header className="sticky top-0 z-50 h-14 bg-card border-b border-border/40">
      <div className="flex items-center h-full px-5 gap-4">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden size-9 shrink-0 text-gray-500 hover:text-gray-700"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-[18px]" />
          <span className="sr-only">Open menu</span>
        </Button>

        {/* Logo — Metronic v9 clean */}
        <Link to="/" className="flex items-baseline gap-0 shrink-0 group">
          <span className="text-primary font-semibold text-[17px] tracking-tight">comprint</span>
          <span className="font-semibold text-[17px] text-foreground/80">tech</span>
        </Link>

        {/* Separator */}
        <div className="hidden lg:block h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Center nav links — Metronic v9 style */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.href
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'px-3.5 py-2 text-[13px] font-medium rounded-md transition-all',
                  isActive
                    ? 'text-primary bg-primary/[0.06]'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 dark:hover:bg-gray-800/50'
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions — Metronic v9 clean */}
        <div className="flex items-center gap-1.5">
          <GlobalSearch />
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
