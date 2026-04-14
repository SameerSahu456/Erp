import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, PanelLeftClose, PanelLeft, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useSidebar } from '@/contexts/SidebarContext'
import { useAuth } from '@/contexts/AuthContext'
import { SIDEBAR_NAV } from '@/components/layout/sidebar-nav-config'
import { cn } from '@/lib/utils'
import type { NavGroup, NavItem } from '@/types/navigation'

function NavItemLink({
  item,
  isActive,
  isCollapsed,
}: {
  item: NavItem
  isActive: boolean
  isCollapsed: boolean
}) {
  const Icon = item.icon
  const link = (
    <Link
      to={item.href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isActive && 'border-l-2 border-primary bg-primary/10 text-primary font-medium',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!isCollapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={link} />
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  return link
}

function NavGroupSection({
  group,
  isCollapsed,
  pathname,
}: {
  group: NavGroup
  isCollapsed: boolean
  pathname: string
}) {
  const [isOpen, setIsOpen] = useState(true)
  const GroupIcon = group.icon

  if (isCollapsed) {
    return (
      <div className="space-y-0.5">
        <Tooltip>
          <TooltipTrigger
            className="flex w-full items-center justify-center rounded-md px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider"
          >
            <GroupIcon className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent side="right">{group.label}</TooltipContent>
        </Tooltip>
        {group.items.map((item) => (
          <NavItemLink
            key={item.href}
            item={item}
            isActive={pathname === item.href}
            isCollapsed={isCollapsed}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
      >
        <GroupIcon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={cn(
            'h-3 w-3 transition-transform',
            !isOpen && '-rotate-90'
          )}
        />
      </button>
      {isOpen && (
        <div className="space-y-0.5">
          {group.items.map((item) => (
            <NavItemLink
              key={item.href}
              item={item}
              isActive={pathname === item.href}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SidebarNav({
  isCollapsed,
  filteredNav,
  pathname,
}: {
  isCollapsed: boolean
  filteredNav: NavGroup[]
  pathname: string
}) {
  return (
    <TooltipProvider>
      <nav className="space-y-4 py-2">
        {/* Dashboard link always visible */}
        <div className="px-2">
          <NavItemLink
            item={{
              label: 'Dashboard',
              href: '/dashboard',
              icon: LayoutDashboard,
            }}
            isActive={pathname === '/' || pathname === '/dashboard'}
            isCollapsed={isCollapsed}
          />
        </div>

        {/* Nav groups */}
        <div className="space-y-4 px-2">
          {filteredNav.map((group) => (
            <NavGroupSection
              key={group.label}
              group={group}
              isCollapsed={isCollapsed}
              pathname={pathname}
            />
          ))}
        </div>
      </nav>
    </TooltipProvider>
  )
}

export function Sidebar() {
  const { isCollapsed, isMobileOpen, toggleCollapsed, setMobileOpen } = useSidebar()
  const { hasModuleAccess, hasRole } = useAuth()
  const location = useLocation()
  const pathname = location.pathname

  // Filter nav by RBAC
  const filteredNav = SIDEBAR_NAV.filter((group) => hasModuleAccess(group.module)).map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.requiredRole) {
        return hasRole(item.requiredRole as import('@/types/auth').UserRole)
      }
      return true
    }),
  })).filter((group) => group.items.length > 0)

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col sticky top-16 h-[calc(100vh-4rem)] z-40 border-r border-border bg-card transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className={cn('flex items-center p-2', isCollapsed ? 'justify-center' : 'justify-end')}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleCollapsed}
          >
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
            <span className="sr-only">
              {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </span>
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <SidebarNav
            isCollapsed={isCollapsed}
            filteredNav={filteredNav}
            pathname={pathname}
          />
        </ScrollArea>
      </aside>

      {/* Mobile sidebar (Sheet drawer) */}
      <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
          <ScrollArea className="h-full">
            <SidebarNav
              isCollapsed={false}
              filteredNav={filteredNav}
              pathname={pathname}
            />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}
