import { Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PermissionGuard } from "@shared/rbac"

import { crmCan } from "../../permissions"
import type { QuoteStatus, QuoteWire } from "../../api"
import { QUOTE_INLINE_EDITABLE_STATUSES } from "../../constants/quote-status"
import { QuoteStatusActions } from "./QuoteStatusActions"
import { QUOTES_STRINGS as S } from "./quotes.strings"

interface QuoteFormHeaderActionsProps {
  quote: QuoteWire
  viewOnly: boolean
  amendMode: boolean
  status: QuoteStatus
  onEdit: () => void
  onAmend: () => void
  onCancelAmend: () => void
  onConvertToSO?: () => void
}

export function QuoteFormHeaderActions({
  quote,
  viewOnly,
  amendMode,
  status,
  onEdit,
  onAmend,
  onCancelAmend,
  onConvertToSO,
}: QuoteFormHeaderActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {/* View → Edit jump. Available for Draft / Pending Approval
          (QUOTE_INLINE_EDITABLE_STATUSES). Partially Approved goes through
          Amend instead. Editing a reviewed line resets only that line's
          approval; untouched approved lines keep theirs. Hidden during
          amend — the form is already editable in place. */}
      {viewOnly && !amendMode && QUOTE_INLINE_EDITABLE_STATUSES.includes(status) && (
        <PermissionGuard required={[...crmCan.writeQuote]}>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="size-4 mr-1.5" />
            {S.formActions.edit}
          </Button>
        </PermissionGuard>
      )}
      <QuoteStatusActions
        quote={quote}
        amendMode={amendMode}
        onAmend={onAmend}
        onCancelAmend={onCancelAmend}
        onConvertToSO={onConvertToSO}
      />
    </div>
  )
}
