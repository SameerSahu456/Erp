import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, PanelLeftClose, PanelLeft, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
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
        'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-ui transition-colors',
        'text-muted-foreground hover:bg-accent hover:text-foreground',
        isActive && 'bg-primary/10 text-primary font-medium',
        isCollapsed && 'justify-center px-2 py-2'
      )}
    >
      <Icon className={cn('shrink-0', isCollapsed ? 'h-4.5 w-4.5' : 'h-4 w-4')} />
      {!isCollapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={link} />
        <TooltipContent side="right" sideOffset={8}>
          <span className="text-xs">{item.label}</span>
        </TooltipContent>
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
  const isGroupActive = group.items.some((item) => pathname.startsWith(item.href))
  const [isOpen, setIsOpen] = useState(isGroupActive)
  const GroupIcon = group.icon

  if (isCollapsed) {
    const firstItem = group.items[0]
    if (!firstItem) return null
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              to={firstItem.href}
              className={cn(
                'flex w-full items-center justify-center rounded-md px-2 py-2 transition-colors',
                'text-muted-foreground hover:bg-accent hover:text-foreground',
                isGroupActive && 'bg-primary/10 text-primary'
              )}
            />
          }
        >
          <GroupIcon className="h-4.5 w-4.5" />
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <div className="space-y-1">
            <p className="font-medium text-xs">{group.label}</p>
            {group.items.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'block text-xs hover:text-primary',
                  pathname === item.href && 'text-primary font-medium'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] font-ui font-semibold uppercase tracking-widest transition-colors',
          'text-muted-foreground/70 hover:text-muted-foreground',
          isGroupActive && 'text-foreground'
        )}
      >
        <GroupIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronRight
          className={cn(
            'h-3 w-3 transition-transform duration-200',
            isOpen && 'rotate-90'
          )}
        />
      </button>
      {isOpen && (
        <div className="mt-0.5 ml-3 pl-2.5 border-l border-border/50 space-y-0.5">
          {group.items.map((item) => (
            <NavItemLink
              key={item.href}
              item={item}
              isActive={pathname === item.href}
              isCollapsed={false}
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
      <nav className="flex flex-col gap-1 p-2">
        {/* Dashboard — always visible */}
        <NavItemLink
          item={{
            label: 'Dashboard',
            href: '/dashboard',
            icon: LayoutDashboard,
          }}
          isActive={pathname === '/' || pathname === '/dashboard'}
          isCollapsed={isCollapsed}
        />

        <Separator className="my-1.5" />

        {/* Module groups */}
        <div className="flex flex-col gap-2">
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

  const filteredNav = SIDEBAR_NAV
    .filter((group) => hasModuleAccess(group.module))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.requiredRole) {
          return hasRole(item.requiredRole as import('@/types/auth').UserRole)
        }
        return true
      }),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col sticky top-14 h-[calc(100vh-3.5rem)] z-40',
          'bg-card border-r border-border transition-all duration-200',
          isCollapsed ? 'w-14' : 'w-60'
        )}
      >
        {/* Collapse toggle */}
        <div className={cn(
          'flex items-center h-10 px-2 border-b border-border/50',
          isCollapsed ? 'justify-center' : 'justify-end'
        )}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={toggleCollapsed}
          >
            {isCollapsed ? (
              <PanelLeft className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5" />
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

      {/* Mobile drawer */}
      <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-60 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
          {/* Mobile logo */}
          <div className="flex items-center h-14 px-4 border-b border-border">
            <span className="text-primary font-ui font-semibold text-lg tracking-tight">comprint</span>
            <span className="font-display font-semibold text-lg text-foreground">tech</span>
          </div>
          <ScrollArea className="h-[calc(100vh-3.5rem)]">
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
