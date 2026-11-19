import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatINRCompact } from "@/lib/currency"
import { stripHtml } from "@/lib/utils"

import type { useMaterialInquiryDetail } from "../../hooks/material-inquiries/useMaterialInquiryDetail"
import { LinkedDealRow, LinkedLeadRow } from "./MILinkedEntityRows"
import { MATERIAL_INQUIRIES_STRINGS as S } from "./material-inquiries.strings"
import { CellTooltip } from "../shared/CellTooltip"

type MI = NonNullable<ReturnType<typeof useMaterialInquiryDetail>["mi"]>

interface MIRequestTabProps {
  mi: MI
  categoryNameById: Map<string, string>
}

export function MIRequestTab({ mi, categoryNameById }: MIRequestTabProps) {
  return (
    <div className="space-y-6">
      {(mi.lead_id || mi.deal_id) && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{S.requestTab.linkedEntityTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mi.lead_id && <LinkedLeadRow leadId={mi.lead_id} />}
              {mi.deal_id && <LinkedDealRow dealId={mi.deal_id} />}
            </div>
          </CardContent>
        </Card>
      )}

      {mi.description && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{S.requestTab.requestDescriptionTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Scrollable read-only description: wraps long unbroken strings,
                grows to a readable height, then scrolls — no Show more toggle. */}
            <div
              className="rte-content max-h-72 overflow-y-auto text-sm leading-relaxed [overflow-wrap:anywhere]"
              dangerouslySetInnerHTML={{ __html: mi.description }}
            />
          </CardContent>
        </Card>
      )}

      <Card size="sm">
        <CardHeader>
          <CardTitle>{S.requestTab.clientRequirementsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {mi.client_budget != null && mi.client_budget > 0 && (
              <div>
                <dt className="text-[10.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                  {S.requestTab.overallBudget}
                </dt>
                <dd className="mt-1 text-[15px] font-semibold tabular-nums tracking-tight">
                  {formatINRCompact(mi.client_budget, { decimals: true })}
                </dd>
              </div>
            )}
            {mi.client_timeline && (
              <div>
                <dt className="text-[10.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                  {S.requestTab.timeline}
                </dt>
                <dd className="mt-1 text-[13px] text-foreground">
                  {mi.client_timeline}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">{S.requestTab.inquiryItemsTitle}</h3>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{S.requestTab.columns.item}</TableHead>
                <TableHead>{S.requestTab.columns.category}</TableHead>
                <TableHead className="text-right">{S.requestTab.columns.qtyRequested}</TableHead>
                <TableHead className="text-right">{S.requestTab.columns.clientBudgetPerUnit}</TableHead>
                <TableHead className="text-right">{S.requestTab.columns.sellingPrice}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mi.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="min-w-0 max-w-[460px]">
                      <CellTooltip text={item.item_name}>
                        <p className="truncate font-medium">{item.item_name}</p>
                      </CellTooltip>
                      {item.description && (
                        <CellTooltip text={stripHtml(item.description)}>
                          <p className="truncate text-xs text-muted-foreground">
                            {stripHtml(item.description)}
                          </p>
                        </CellTooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.category_id
                      ? categoryNameById.get(item.category_id) ?? "—"
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.qty_requested}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.client_budget_per_unit != null
                      ? `${formatINRCompact(item.client_budget_per_unit, { decimals: true })}`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.unit_selling_price != null
                      ? formatINRCompact(item.unit_selling_price, { decimals: true })
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {mi.notes && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{S.requestTab.notesTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="max-h-72 overflow-y-auto whitespace-pre-wrap [overflow-wrap:anywhere] text-sm text-muted-foreground">
              {mi.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
