import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
  showHome?: boolean
}

function Breadcrumbs({ items, className, showHome = true }: BreadcrumbsProps) {
  const trail: BreadcrumbItem[] = showHome
    ? [{ label: 'Home', href: '/' }, ...items]
    : items

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center', className)}>
      <ol className="flex flex-wrap items-center gap-1 text-[12.5px] text-muted-foreground">
        {trail.map((item, idx) => {
          const isLast = idx === trail.length - 1
          const isHome = showHome && idx === 0
          return (
            <li key={`${item.label}-${idx}`} className="inline-flex items-center gap-1">
              {idx > 0 && (
                <ChevronRight
                  className="size-3 text-muted-foreground/60"
                  aria-hidden="true"
                />
              )}
              {isLast || !item.href ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1',
                    isLast ? 'text-foreground font-medium' : ''
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {isHome && <Home className="size-3" aria-hidden="true" />}
                  {!isHome && item.label}
                  {isHome && <span className="sr-only">{item.label}</span>}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="inline-flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                >
                  {isHome && <Home className="size-3" aria-hidden="true" />}
                  {!isHome && item.label}
                  {isHome && <span className="sr-only">{item.label}</span>}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export { Breadcrumbs }
