import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Typography } from "@/components/ui/typography"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { usePermission } from "@shared/rbac"

import { rentalsCan } from "../../permissions"
import { useAccountBillingSettings } from "../../hooks/accounts/useAccountBillingSettings"
import { useRequestAccountEarlyExitTerms } from "../../hooks/early-exit/useEarlyExit"
import { RetryLoadError } from "../shared/RetryLoadError"
import { EARLY_EXIT_STRINGS } from "./early-exit.strings"

const S = EARLY_EXIT_STRINGS.terms

function RequestDialog({ accountId, onClose }: { accountId: string; onClose: () => void }) {
  const request = useRequestAccountEarlyExitTerms()
  const [pct, setPct] = useState("")
  const [exempt, setExempt] = useState(false)
  const [reason, setReason] = useState("")
  const pctOk = pct.trim() === "" || (Number(pct) >= 0 && Number(pct) <= 100)
  const confirm = () =>
    request.mutate(
      {
        accountId,
        body: { early_exit_pct: pct.trim() || null, early_exit_exempt: exempt, reason: reason.trim() },
      },
      { onSuccess: onClose },
    )
  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={S.dialogTitle}
      description={S.dialogBody}
      isDirty={!!pct || exempt || !!reason}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={request.isPending}>
            {S.cancel}
          </Button>
          <Button onClick={confirm} disabled={!pctOk || !reason.trim() || request.isPending}>
            {S.confirm}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="eet-pctlabel">{S.pctLabel}</Label>
          <Input id="eet-pctlabel"
            inputMode="decimal"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            placeholder={S.pctPlaceholder}
            disabled={exempt}
            aria-invalid={!pctOk}
          />
        </div>
        <label className="flex items-center gap-2">
          <Checkbox checked={exempt} onCheckedChange={(v) => setExempt(v === true)} />
          <Typography variant="body">{S.exemptLabel}</Typography>
        </label>
        <div className="space-y-2">
          <Label required htmlFor="eet-reasonlabel">{S.reasonLabel}</Label>
          <Textarea id="eet-reasonlabel" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        </div>
      </div>
    </OperationDialog>
  )
}

/** A customer's standing early-exit terms; changing them needs a manager (R18). */
export function EarlyExitTermsCard({ accountId }: { accountId: string }) {
  const query = useAccountBillingSettings(accountId)
  const settings = query.data
  const { can } = usePermission()
  const [open, setOpen] = useState(false)
  if (query.isError) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{S.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <RetryLoadError error={query.error} fallback={S.loadError} onRetry={() => void query.refetch()} compact />
        </CardContent>
      </Card>
    )
  }
  if (!settings) return null
  const pct = settings.early_exit_pct
  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle>{S.title}</CardTitle>
          <CardDescription>{S.description}</CardDescription>
        </div>
        {can([...rentalsCan.requestEarlyExitWaiver]) && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="shrink-0">
            {S.requestChange}
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Typography variant="caption" tone="muted">
            {S.pct}
          </Typography>
          <Typography variant="body">{pct != null ? S.pctValue(String(pct)) : S.pctDefault}</Typography>
        </div>
        <Typography variant="body" className="self-end">
          {settings.early_exit_exempt ? S.exempt : S.notExempt}
        </Typography>
      </CardContent>
      {open && <RequestDialog accountId={accountId} onClose={() => setOpen(false)} />}
    </Card>
  )
}
