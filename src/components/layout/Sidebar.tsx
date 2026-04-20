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

/* ── Nav Item ── */
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
        'flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition-all',
        'text-muted-foreground hover:text-foreground hover:bg-secondary',
        isActive && 'bg-accent text-foreground font-[550]',
        isCollapsed && 'justify-center px-2 py-2'
      )}
    >
      <Icon className={cn('shrink-0', isCollapsed ? 'size-[18px]' : 'size-4', isActive ? 'opacity-100' : 'opacity-70')} />
      {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}
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

/* ── Nav Group ── */
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
                'flex w-full items-center justify-center rounded-lg px-2 py-2 transition-all',
                'text-muted-foreground hover:text-foreground hover:bg-secondary',
                isGroupActive && 'bg-accent text-foreground'
              )}
            />
          }
        >
          <GroupIcon className="size-[18px]" />
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <div className="space-y-1">
            <p className="font-semibold text-xs">{group.label}</p>
            {group.items.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'block text-xs hover:text-foreground transition-colors',
                  pathname === item.href && 'font-medium'
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
    <div className="mt-3">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-2.5 py-[6px] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 hover:text-muted-foreground transition-colors"
      >
        <span>{group.label}</span>
        <ChevronDown
          className={cn(
            'size-[11px] opacity-50 transition-transform duration-200',
            !isOpen && '-rotate-90'
          )}
        />
      </button>
      <div
        className={cn(
          'space-y-[1px] mt-0.5 overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        {group.items.map((item) => (
          <NavItemLink
            key={item.href}
            item={item}
            isActive={pathname === item.href}
            isCollapsed={false}
          />
        ))}
      </div>
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
      <nav className="flex flex-col gap-0 px-2.5 py-2.5">
        {/* Dashboard */}
        <NavItemLink
          item={{
            label: 'Dashboard',
            href: '/dashboard',
            icon: LayoutDashboard,
          }}
          isActive={pathname === '/' || pathname === '/dashboard'}
          isCollapsed={isCollapsed}
        />

        {/* Module groups */}
        {filteredNav.map((group) => (
          <NavGroupSection
            key={group.label}
            group={group}
            isCollapsed={isCollapsed}
            pathname={pathname}
          />
        ))}
      </nav>
    </TooltipProvider>
  )
}

export function Sidebar() {
  const { isCollapsed, isMobileOpen, toggleCollapsed, setMobileOpen } = useSidebar()
  const { hasModuleAccess, hasRole, getAccessLevel } = useAuth()
  const location = useLocation()
  const pathname = location.pathname

  const filteredNav = SIDEBAR_NAV
    .filter((group) => hasModuleAccess(group.module))
    .map((group) => {
      const moduleAccessLevel = getAccessLevel(group.module)
      return {
        ...group,
        items: group.items.filter((item) => {
          if (item.requiredRole) {
            if (!hasRole(item.requiredRole as import('@/types/auth').UserRole)) return false
          }
          if (item.accessLevel) {
            if (moduleAccessLevel === 'both') return true
            if (item.accessLevel !== moduleAccessLevel) return false
          }
          return true
        }),
      }
    })
    .filter((group) => group.items.length > 0)

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col sticky top-14 h-[calc(100vh-3.5rem)] z-40',
          'bg-card border-r border-border transition-all duration-200',
          isCollapsed ? 'w-16' : 'w-[248px]'
        )}
      >
        {/* Collapse toggle */}
        <div className={cn(
          'flex items-center h-10 px-2.5 border-b border-border',
          isCollapsed ? 'justify-center' : 'justify-end'
        )}>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground hover:bg-secondary"
            onClick={toggleCollapsed}
          >
            {isCollapsed ? (
              <PanelLeft className="size-3.5" />
            ) : (
              <PanelLeftClose className="size-3.5" />
            )}
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
        <SheetContent side="left" className="w-[260px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
          <div className="flex items-center h-14 px-4 border-b border-border gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-[12px] font-bold tracking-wide">CP</div>
            <span className="font-[650] text-[15px] tracking-[-0.01em] text-foreground">Comprint</span>
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
