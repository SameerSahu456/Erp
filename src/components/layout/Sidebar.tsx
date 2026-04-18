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

/* ── Metronic v9 Nav Item ── */
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
        'group relative flex items-center gap-3 rounded-lg px-3 py-[9px] text-[13px] font-medium transition-all',
        'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800/50',
        isActive && [
          'bg-primary/[0.06] text-primary font-semibold',
          'hover:bg-primary/[0.08] hover:text-primary',
          'dark:bg-primary/[0.12] dark:text-primary-400',
        ],
        isCollapsed && 'justify-center px-0 py-2.5'
      )}
    >
      {/* Metronic left accent bar */}
      {isActive && !isCollapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[18px] w-[3px] rounded-r-full bg-primary" />
      )}
      <Icon className={cn(
        'shrink-0 transition-colors',
        isCollapsed ? 'size-[18px]' : 'size-4',
        isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500'
      )} />
      {!isCollapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={link} />
        <TooltipContent side="right" sideOffset={10} className="text-xs font-medium">
          {item.label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return link
}

/* ── Metronic v9 Nav Group ── */
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
                'flex w-full items-center justify-center rounded-lg py-2.5 transition-all',
                'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-800/50',
                isGroupActive && 'text-primary bg-primary/[0.06]'
              )}
            />
          }
        >
          <GroupIcon className="size-[18px]" />
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          <div className="space-y-1.5">
            <p className="font-semibold text-xs">{group.label}</p>
            {group.items.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'block text-xs hover:text-primary transition-colors',
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
    <div className="space-y-0.5">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] transition-all rounded-md',
          'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400',
          isGroupActive && 'text-gray-500 dark:text-gray-400'
        )}
      >
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={cn(
            'size-3.5 transition-transform duration-200 text-gray-300 dark:text-gray-600',
            !isOpen && '-rotate-90'
          )}
        />
      </button>
      {isOpen && (
        <div className="space-y-0.5 pb-1">
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
      <nav className="flex flex-col gap-1 p-3">
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

        {/* Separator */}
        <div className="my-2 h-px bg-gray-200/70 dark:bg-gray-700/50" />

        {/* Module groups */}
        <div className="flex flex-col gap-0.5">
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
      {/* Desktop sidebar — Metronic v9 style */}
      <aside
        className={cn(
          'hidden md:flex flex-col sticky top-14 h-[calc(100vh-3.5rem)] z-40',
          'bg-card border-r border-border/40 transition-all duration-200',
          isCollapsed ? 'w-[60px]' : 'w-[250px]'
        )}
      >
        {/* Collapse toggle */}
        <div className={cn(
          'flex items-center h-10 px-3',
          isCollapsed ? 'justify-center' : 'justify-end'
        )}>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={toggleCollapsed}
          >
            {isCollapsed ? (
              <PanelLeft className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
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
        <SheetContent side="left" className="w-[250px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
          {/* Mobile logo */}
          <div className="flex items-center h-14 px-5 border-b border-border/40">
            <span className="text-primary font-semibold text-lg tracking-tight">comprint</span>
            <span className="font-semibold text-lg text-foreground/80">tech</span>
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
