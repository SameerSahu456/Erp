import type { LucideIcon } from 'lucide-react'

export type AccessLevel = 'pre-sales' | 'post-sales' | 'both'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  module?: string
  requiredRole?: string
  accessLevel?: 'pre-sales' | 'post-sales'
}

export interface NavGroup {
  label: string
  module: string
  icon: LucideIcon
  items: NavItem[]
}
