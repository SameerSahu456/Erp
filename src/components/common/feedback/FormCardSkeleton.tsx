import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface FormCardSkeletonProps {
  /** Number of input rows to render. Default 8. */
  rows?: number
  /** Render multiple sections instead of one row stack. Default 1. */
  sections?: number
}

export function FormCardSkeleton({ rows = 8, sections = 1 }: FormCardSkeletonProps) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-x-7 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: sections }).map((_, sectionIdx) => (
            <div key={sectionIdx} className="space-y-4">
              <Skeleton className="h-4 w-32" />
              {Array.from({ length: rows }).map((_, rowIdx) => (
                <div key={rowIdx} className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
