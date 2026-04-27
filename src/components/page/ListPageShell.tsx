import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { PageHeader, type PageHeaderProps } from './PageHeader'

type PageHeaderInherited = Omit<PageHeaderProps, 'compact'>

interface ListPageShellProps extends PageHeaderInherited {
  /** KPI row — typically <StatsRow /> */
  stats?: ReactNode
  /** Filter / search bar rendered above the content area. */
  toolbar?: ReactNode
  /** Main content (usually a table, kanban, or card grid). */
  children: ReactNode
  className?: string
}

function ListPageShell({
  stats,
  toolbar,
  children,
  className,
  ...headerProps
}: ListPageShellProps) {
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <PageHeader {...headerProps} />
      {stats && <div>{stats}</div>}
      {toolbar && <div>{toolbar}</div>}
      <div>{children}</div>
    </div>
  )
}

export { ListPageShell, type ListPageShellProps }
