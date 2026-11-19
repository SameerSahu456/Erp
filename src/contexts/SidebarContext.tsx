import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react'

export interface SidebarContextValue {
  isCollapsed: boolean
  isMobileOpen: boolean
  toggleCollapsed: () => void
  setMobileOpen: (open: boolean) => void
}

export const SidebarContext = createContext<SidebarContextValue | null>(null)

const STORAGE_KEY = 'comprint-sidebar-collapsed'

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  })
  const [isMobileOpen, setMobileOpen] = useState(false)

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  // Memoize so consumers (Sidebar, Header) don't re-render unless collapse/mobile
  // state actually changes.
  const value = useMemo<SidebarContextValue>(
    () => ({ isCollapsed, isMobileOpen, toggleCollapsed, setMobileOpen }),
    [isCollapsed, isMobileOpen, toggleCollapsed],
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}
