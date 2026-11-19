import { AlertTriangle } from "lucide-react"

import { Typography } from "@/components/ui/typography"

import { DEMO_REQUESTS_STRINGS as S } from "./demo-requests.strings"
import type { DemoDisplay } from "./demoRequestDetailHelpers"
import { formatDate } from "./demoRequestDetailHelpers"

// The demo→SO link now lives on the Sales Orders tab (a demo may have several
// SOs), so there's no single "converted to SO" banner here anymore.
export function DemoStatusBanners({ demo, isOverdue }: { demo: DemoDisplay; isOverdue: boolean }) {
  return (
    <>
      {/* Overdue alert */}
      {isOverdue && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive-soft px-4 py-3">
          <AlertTriangle className="size-5 shrink-0 text-destructive" />
          <div>
            <Typography variant="body-strong" tone="danger" asChild>
              <p>{S.detail.banners.overdueTitle(demo.overdueByDays)}</p>
            </Typography>
            <Typography variant="helper" tone="danger" asChild>
              <p>
                {S.detail.banners.overdueBody(formatDate(demo.expectedReturnDate), demo.contactName, demo.contactPhone)}
              </p>
            </Typography>
          </div>
        </div>
      )}
    </>
  )
}
