import { Link } from "react-router-dom"

import { PopupClampText } from "@/components/common/display/PopupClampText"
import { Typography } from "@/components/ui/typography"

import { DEMO_REQUESTS_STRINGS as S } from "./demo-requests.strings"
import { DETAIL_LINK_CLASS, type DemoDisplay } from "./demoRequestDetailHelpers"

export function DemoSourceNotesCards({ demo }: { demo: DemoDisplay }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6">
        <Typography variant="card-title" className="mb-3">
          {S.detail.source.title}
        </Typography>
        <dl className="space-y-2">
          {demo.dealId && (
            <Typography variant="body" asChild>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{S.detail.source.deal}</dt>
                <dd className="text-right">
                  <Link to={`/crm/deals/${demo.dealId}`} className={DETAIL_LINK_CLASS}>
                    {demo.dealName}
                  </Link>
                </dd>
              </div>
            </Typography>
          )}
          {demo.leadId && (
            <Typography variant="body" asChild>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{S.detail.source.lead}</dt>
                <dd className="text-right">
                  <Link to={`/crm/leads/${demo.leadId}`} className={DETAIL_LINK_CLASS}>
                    {demo.leadName}
                  </Link>
                </dd>
              </div>
            </Typography>
          )}
          {demo.accountId && (
            <Typography variant="body" asChild>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{S.detail.source.account}</dt>
                <dd className="text-right">
                  <Link to={`/crm/accounts/${demo.accountId}`} className={DETAIL_LINK_CLASS}>
                    {demo.accountName}
                  </Link>
                </dd>
              </div>
            </Typography>
          )}
          <Typography variant="body" asChild>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{S.detail.source.requestedBy}</dt>
              <dd>{demo.requestedBy}</dd>
            </div>
          </Typography>
          {demo.dispatchRequestId && (
            <Typography variant="body" asChild>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{S.detail.source.dispatchRef}</dt>
                <dd>{demo.dispatchRequestId}</dd>
              </div>
            </Typography>
          )}
        </dl>
      </div>

      {demo.notes && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <Typography variant="card-title" className="mb-3">
            {S.detail.notes.title}
          </Typography>
          <PopupClampText
            variant="body"
            tone="muted"
            text={demo.notes}
            title={S.detail.notes.title}
            showMoreLabel={S.detail.items.reasonShowMore}
          />
          {demo.returnNotes && (
            <div className="mt-3 rounded-md bg-muted/50 p-3">
              <Typography variant="helper" className="font-medium" asChild>
                <p>{S.detail.notes.returnNotes}</p>
              </Typography>
              <PopupClampText
                variant="body"
                className="mt-1"
                text={demo.returnNotes}
                title={S.detail.notes.returnNotes}
                showMoreLabel={S.detail.items.reasonShowMore}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
