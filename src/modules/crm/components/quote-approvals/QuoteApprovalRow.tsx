import { useState } from "react"
import { Check, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Typography } from "@/components/ui/typography"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatIST } from "@shared/lib/date"

import type { QuoteApprovalPendingQuoteWire } from "../../api/quote-approvals"
import {
  useApproveQuoteItem,
  useRejectQuoteItem,
} from "../../hooks/quote-approvals/useQuoteApprovals"
import { QUOTE_APPROVALS_STRINGS } from "./quote-approvals.strings"
import { QuoteItemRejectDialog } from "./QuoteItemRejectDialog"

const inrFmt = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})
function money(n: number): string {
  return `₹${inrFmt.format(n)}`
}

interface Props {
  quote: QuoteApprovalPendingQuoteWire
}

export function QuoteApprovalRow({ quote }: Props) {
  const S = QUOTE_APPROVALS_STRINGS
  const approveMut = useApproveQuoteItem(quote.quote_id)
  const rejectMut = useRejectQuoteItem(quote.quote_id)
  const [rejectingItemId, setRejectingItemId] = useState<string | null>(null)
  // Freeze the initial eligible_items so decided rows stay visible after the
  // background refetch removes them from the server response. Combined with
  // `decided`, every item shows its final status badge instead of disappearing.
  const [frozenItems] = useState(quote.eligible_items)
  // Tracks the PM's decisions this session: item_id → 'Approved' | 'Rejected'.
  // Replaced by a new Map on each update so React detects the reference change.
  const [decided, setDecided] = useState<Map<string, 'Approved' | 'Rejected'>>(new Map())

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 items-center gap-2">
            <Typography variant="card-title" truncate>
              {quote.quote_number}
            </Typography>
            <StatusBadge variant="info">{quote.status}</StatusBadge>
          </div>
          <Typography variant="helper" tone="muted" truncate>
            {quote.account_name ?? "—"}
            {" · "}
            {formatIST(quote.updated_at)}
          </Typography>
          {(quote.submitted_by_name || quote.source_number) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {quote.submitted_by_name && (
                <Typography variant="helper" tone="muted">
                  {S.submittedByLabel}:{" "}
                  <span className="font-medium text-foreground">{quote.submitted_by_name}</span>
                </Typography>
              )}
              {quote.source_number && (
                <Typography variant="helper" tone="muted">
                  {S.sourceLabel}:{" "}
                  <span className="font-medium text-foreground">{quote.source_number}</span>
                </Typography>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {frozenItems.length === 0 ? (
          <Typography variant="body" tone="muted" align="center" className="py-6">
            {S.queue.empty}
          </Typography>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{S.columns.item}</TableHead>
                <TableHead className="text-right">{S.columns.qty}</TableHead>
                <TableHead className="text-right">{S.columns.rate}</TableHead>
                <TableHead className="text-right">{S.columns.amount}</TableHead>
                <TableHead className="w-56">{S.columns.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {frozenItems.map((item) => (
                <TableRow key={item.item_id}>
                  <TableCell className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <Typography variant="body-strong" truncate>
                        {item.item_name}
                      </Typography>
                      {item.is_stamped_to_me ? (
                        <Typography
                          variant="caption"
                          tone="info"
                          className="shrink-0 rounded bg-info/15 px-1.5 py-0.5"
                        >
                          {S.stampedBadge}
                        </Typography>
                      ) : (
                        <Typography
                          variant="caption"
                          tone="muted"
                          className="shrink-0 rounded bg-muted px-1.5 py-0.5"
                        >
                          {S.peerBadge}
                        </Typography>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{item.qty}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(item.rate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Typography variant="body-strong" numeric>
                      {money(item.amount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {decided.has(item.item_id) ? (
                      <StatusBadge
                        variant={decided.get(item.item_id) === 'Approved' ? 'success' : 'error'}
                      >
                        {decided.get(item.item_id)}
                      </StatusBadge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() =>
                            approveMut.mutate(
                              { itemId: item.item_id },
                              {
                                onSuccess: () =>
                                  setDecided((prev) =>
                                    new Map(prev).set(item.item_id, 'Approved'),
                                  ),
                              },
                            )
                          }
                          disabled={approveMut.isPending || rejectMut.isPending}
                        >
                          <Check className="mr-1 size-3.5" />
                          {approveMut.isPending
                            ? S.actions.approving
                            : S.actions.approve}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectingItemId(item.item_id)}
                          disabled={approveMut.isPending || rejectMut.isPending}
                          className="text-destructive hover:bg-destructive/5 hover:text-destructive"
                        >
                          <X className="mr-1 size-3.5" />
                          {S.actions.reject}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <QuoteItemRejectDialog
        open={rejectingItemId !== null}
        onOpenChange={(open) => {
          if (!open) setRejectingItemId(null)
        }}
        lineItemName={
          frozenItems.find((i) => i.item_id === rejectingItemId)?.item_name ?? ""
        }
        quoteNumber={quote.quote_number}
        onConfirm={(notes) => {
          if (!rejectingItemId) return
          const itemId = rejectingItemId
          rejectMut.mutate(
            { itemId, body: { notes } },
            {
              onSuccess: () => {
                setRejectingItemId(null)
                setDecided((prev) => new Map(prev).set(itemId, 'Rejected'))
              },
            },
          )
        }}
        isPending={rejectMut.isPending}
      />
    </Card>
  )
}
