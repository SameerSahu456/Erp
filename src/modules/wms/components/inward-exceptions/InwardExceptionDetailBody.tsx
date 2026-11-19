import { useState } from "react"
import { useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog"
import { ReasonDialog, type ReasonDialogCopy } from "@/components/common/dialogs/ReasonDialog"
import { DetailPageShell } from "@/components/page-shells"
import { asUuid } from "@shared/lib/validation"
import { usePermission } from "@shared/rbac"

import { wmsCan } from "../../permissions"
import {
  useInwardException,
  useMarkInwardExceptionDelivered,
  useVoidInwardException,
} from "../../hooks/inward-exceptions/useInwardExceptions"
import { BringIntoStockDialog } from "./BringIntoStockDialog"
import { InwardExceptionBanner, InwardExceptionDetailFallback } from "./InwardExceptionDetailFallback"
import { InwardExceptionFacts } from "./InwardExceptionFacts"
import { InwardExceptionUnitCard } from "./InwardExceptionUnitCard"
import { LinkExceptionDialog, ReturnExceptionDialog } from "./InwardExceptionDialogs"
import {
  INWARD_EXCEPTIONS_LIST_ROUTE,
  inwardExceptionActions,
  type InwardExceptionAction,
} from "./inward-exceptions-helpers"
import { INWARD_EXCEPTIONS_STRINGS as S } from "./inward-exceptions.strings"

const VOID_COPY: ReasonDialogCopy = {
  title: S.void.title,
  body: S.void.body,
  reasonLabel: S.void.reasonLabel,
  reasonPlaceholder: S.void.reasonPlaceholder,
  confirm: S.void.confirm,
  dismiss: S.void.dismiss,
}

export function InwardExceptionDetailBody() {
  // §11.1: a malformed :id never reaches the API — it renders not-found.
  const id = asUuid(useParams<{ id: string }>().id) ?? undefined
  const query = useInwardException(id)
  const voidMutation = useVoidInwardException()
  const delivered = useMarkInwardExceptionDelivered()
  const { can } = usePermission()
  const [open, setOpen] = useState<InwardExceptionAction | null>(null)
  const row = query.data

  // A bad id leaves the query disabled (isLoading false) → not-found.
  if (!row) return <InwardExceptionDetailFallback query={query} />


  const actions = inwardExceptionActions(row, {
    canResolve: can(wmsCan.inwardExceptionResolve),
    canApprove: can(wmsCan.inwardExceptionApprove),
  })
  const close = () => setOpen(null)
  return (
    <DetailPageShell
      title={row.scanned_serial}
      backHref={INWARD_EXCEPTIONS_LIST_ROUTE}
      actions={
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button
              key={a}
              variant={a === "void" || (a !== "stock" && actions.includes("stock")) ? "outline" : "default"}
              onClick={() => setOpen(a)}
            >
              {S.detail.actions[a]}
            </Button>
          ))}
        </div>
      }
    >
      <div className="space-y-4">
        {row.overdue && <InwardExceptionBanner tone="warning" text={S.detail.overdue} />}
        {row.status === "open" && row.needs_approval && (
          <InwardExceptionBanner tone="info" text={S.detail.approvalNeeded} />
        )}
        <Card>
          <CardContent className="pt-6">
            <InwardExceptionFacts row={row} />
          </CardContent>
        </Card>
        {row.kind !== "foreign" && <InwardExceptionUnitCard row={row} />}
      </div>
      {open === "stock" && <BringIntoStockDialog row={row} onClose={close} />}
      {open === "link" && <LinkExceptionDialog row={row} onClose={close} />}
      {open === "return" && <ReturnExceptionDialog row={row} onClose={close} />}
      {open === "void" && (
        <ReasonDialog
          copy={VOID_COPY}
          pending={voidMutation.isPending}
          onConfirm={async (notes) => {
            await voidMutation.mutateAsync({ id: row.id, notes })
          }}
          onClose={close}
        />
      )}
      <ConfirmDialog
        open={open === "delivered"}
        onOpenChange={(o) => setOpen(o ? "delivered" : null)}
        title={S.delivered.title}
        description={S.delivered.description}
        confirmLabel={S.delivered.confirm}
        // `mutate`: the hook's onError toasts; nothing awaits this.
        onConfirm={() => delivered.mutate({ id: row.id })}
      />
    </DetailPageShell>
  )
}
