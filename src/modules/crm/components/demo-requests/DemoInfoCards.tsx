import { Link } from "react-router-dom"
import {
  AlertTriangle,
  Calendar,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Truck,
  User,
} from "lucide-react"

import { StatusBadge } from "@/components/common/display/StatusBadge"
import { Typography } from "@/components/ui/typography"

import { DEMO_REQUESTS_STRINGS as S } from "./demo-requests.strings"
import { DETAIL_LINK_CLASS, formatDate, type DemoDisplay } from "./demoRequestDetailHelpers"

export function DemoInfoCards({
  demo,
  isOverdue,
}: {
  demo: DemoDisplay
  isOverdue: boolean
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Contact */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_3px_rgb(var(--shadow-rgb)/0.04)]">
        <Typography variant="card-title" className="mb-3 flex items-center gap-2">
          <User className="size-4" />
          {S.detail.contact.title}
        </Typography>
        <dl className="space-y-2">
          <div>
            <Typography variant="helper" asChild>
              <dt>{S.detail.contact.account}</dt>
            </Typography>
            <Typography variant="body" asChild>
              <dd>
                <Link to={`/crm/accounts/${demo.accountId}`} className={DETAIL_LINK_CLASS}>
                  {demo.accountName}
                </Link>
              </dd>
            </Typography>
          </div>
          <div>
            <Typography variant="helper" asChild>
              <dt>{S.detail.contact.contact}</dt>
            </Typography>
            <Typography variant="body" asChild>
              <dd>
                <Link to={`/crm/contacts/${demo.contactId}`} className={DETAIL_LINK_CLASS}>
                  {demo.contactName}
                </Link>
              </dd>
            </Typography>
          </div>
          <Typography variant="body" asChild>
            <div className="flex items-center gap-1.5">
              <Phone className="size-3 text-muted-foreground" />
              <span>{demo.contactPhone}</span>
            </div>
          </Typography>
          <Typography variant="body" asChild>
            <div className="flex items-center gap-1.5">
              <Mail className="size-3 text-muted-foreground" />
              <span>{demo.contactEmail}</span>
            </div>
          </Typography>
          <div className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
            <Typography variant="helper" tone="default" asChild>
              <span>{demo.shippingAddress}</span>
            </Typography>
          </div>
        </dl>
      </div>

      {/* Dates */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_3px_rgb(var(--shadow-rgb)/0.04)]">
        <Typography variant="card-title" className="mb-3 flex items-center gap-2">
          <Calendar className="size-4" />
          {S.detail.dates.title}
        </Typography>
        <dl className="space-y-2">
          <Typography variant="body" asChild>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{S.detail.dates.created}</dt>
              <dd>{formatDate(demo.createdAt)}</dd>
            </div>
          </Typography>
          {demo.dispatchDate && (
            <Typography variant="body" asChild>
              <div className="flex justify-between">
                <dt className="flex items-center gap-1 text-muted-foreground"><Truck className="size-3" /> {S.detail.dates.dispatched}</dt>
                <dd>{formatDate(demo.dispatchDate)}</dd>
              </div>
            </Typography>
          )}
          <Typography variant="body" asChild>
            <div className="flex justify-between">
              <dt className={`flex items-center gap-1 ${isOverdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                <RotateCcw className="size-3" /> {S.detail.dates.returnBy}
              </dt>
              <dd className={isOverdue ? "font-medium text-destructive" : ""}>
                {formatDate(demo.expectedReturnDate)}
              </dd>
            </div>
          </Typography>
          {demo.actualReturnDate && (
            <Typography variant="body" asChild>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{S.detail.dates.actualReturn}</dt>
                <dd className="text-success">{formatDate(demo.actualReturnDate)}</dd>
              </div>
            </Typography>
          )}
          {isOverdue && (
            <Typography variant="helper" tone="danger" asChild>
              <div className="mt-2 flex items-center gap-1.5 rounded-md bg-destructive-soft px-3 py-2 font-medium">
                <AlertTriangle className="size-3.5" />
                {S.detail.dates.overdueBy(demo.overdueByDays)}
              </div>
            </Typography>
          )}
          {demo.returnCondition && (
            <Typography variant="body" asChild>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{S.detail.dates.condition}</dt>
                <dd>
                  <StatusBadge variant={demo.returnCondition === "Good" ? "success" : demo.returnCondition === "Damaged" ? "error" : "warning"}>
                    {demo.returnCondition}
                  </StatusBadge>
                </dd>
              </div>
            </Typography>
          )}
        </dl>
      </div>
    </div>
  )
}
