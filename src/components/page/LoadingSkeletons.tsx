import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface TableSkeletonProps {
  rows?: number
  columns?: number
  className?: string
}

function TableSkeleton({ rows = 6, columns = 5, className }: TableSkeletonProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-card',
        className
      )}
      role="status"
      aria-label="Loading table"
    >
      <div className="border-b border-border bg-muted/40 px-4 py-3">
        <div className="flex gap-6">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-6 px-4 py-3.5">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn(
                  'h-4 flex-1',
                  c === 0 && 'max-w-[40%]',
                  c === columns - 1 && 'max-w-[80px]'
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

interface StatsSkeletonProps {
  count?: number
  className?: string
}

function StatsSkeleton({ count = 4, className }: StatsSkeletonProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5',
        className
      )}
      role="status"
      aria-label="Loading stats"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-card p-4"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-6 w-24" />
          <Skeleton className="mt-2 h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

interface CardSkeletonProps {
  lines?: number
  className?: string
}

function CardSkeleton({ lines = 3, className }: CardSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-5',
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <Skeleton className="h-4 w-1/3" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')}
          />
        ))}
      </div>
    </div>
  )
}

interface FormSkeletonProps {
  fields?: number
  className?: string
}

function FormSkeleton({ fields = 6, className }: FormSkeletonProps) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-card p-6', className)}
      role="status"
      aria-label="Loading form"
    >
      <Skeleton className="mb-6 h-5 w-1/4" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export { TableSkeleton, StatsSkeleton, CardSkeleton, FormSkeleton }
