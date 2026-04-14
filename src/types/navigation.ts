import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  module?: string
  requiredRole?: string
}

export interface NavGroup {
  label: string
  module: string
  icon: LucideIcon
  items: NavItem[]
}
