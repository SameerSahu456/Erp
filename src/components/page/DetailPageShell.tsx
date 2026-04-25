import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { PageHeader, type PageHeaderProps } from './PageHeader'

type PageHeaderInherited = Omit<PageHeaderProps, 'compact'>

interface DetailPageShellProps extends PageHeaderInherited {
  children: ReactNode
  /** Optional sticky side panel (e.g. summary, quick actions). Rendered to the right on lg+. */
  sidePanel?: ReactNode
  /** When true, side panel shows first on mobile. */
  sidePanelFirstOnMobile?: boolean
  className?: string
}

function DetailPageShell({
  children,
  sidePanel,
  sidePanelFirstOnMobile = false,
  className,
  ...headerProps
}: DetailPageShellProps) {
  if (!sidePanel) {
    return (
      <div className={cn('flex flex-col gap-6', className)}>
        <PageHeader {...headerProps} />
        <div>{children}</div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <PageHeader {...headerProps} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div
          className={cn(
            'min-w-0',
            sidePanelFirstOnMobile ? 'order-2 lg:order-1' : 'order-1'
          )}
        >
          {children}
        </div>
        <aside
          className={cn(
            'min-w-0 lg:sticky lg:top-20 lg:self-start',
            sidePanelFirstOnMobile ? 'order-1 lg:order-2' : 'order-2'
          )}
        >
          {sidePanel}
        </aside>
      </div>
    </div>
  )
}

export { DetailPageShell, type DetailPageShellProps }
