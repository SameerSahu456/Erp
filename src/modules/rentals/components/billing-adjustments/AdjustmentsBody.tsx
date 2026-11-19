import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { PAGINATION, UI } from "@/shared/constants"
import { useDebounce } from "@shared/hooks"

import { adjustmentStatusVariant } from "../../constants/swaps"
import { useBillingAdjustments } from "../../hooks/billing-adjustments/useBillingAdjustments"
import { useCreditNoteRegister } from "../../hooks/invoices/useCreditNotes"
import { StatusTabbedList } from "../shared/StatusTabbedList"
import {
  ADJUSTMENT_COLUMNS,
  ADJUSTMENT_PAGE_TABS,
  ADJUSTMENT_TABS,
  CREDIT_NOTE_COLUMNS,
  CREDIT_NOTES_TAB,
  creditNoteSourceVariant,
  toAdjustmentRow,
  toCreditNoteListRow,
} from "./billing-adjustments.columns"
import { BILLING_ADJUSTMENT_STRINGS as S } from "./billing-adjustments.strings"

const PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE

/** What changes between the two kinds of list on this page. */
const VIEWS = {
  adjustments: {
    columns: ADJUSTMENT_COLUMNS,
    variantOf: adjustmentStatusVariant,
    href: (id: string) => `/rentals/billing-adjustments/${id}`,
    emptyState: S.empty,
    loadError: S.loadError,
  },
  creditNotes: {
    columns: CREDIT_NOTE_COLUMNS,
    variantOf: creditNoteSourceVariant,
    href: (id: string) => `/rentals/credit-notes/${id}`,
    emptyState: S.creditNotes.empty,
    loadError: S.creditNotes.loadError,
  },
}

/** Accounts' queue: credit due from approved swaps (R11), and every credit
 *  note — swap-issued or recorded on an invoice — each openable and
 *  searchable. */
export function AdjustmentsBody() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<string>("pending_accounts")
  const [page, setPage] = useState(1)
  // Credit notes only: invoice no., CN no. or account. Debounced before it
  // reaches the query key (§6.9.1).
  const [search, setSearch] = useState("")
  const q = useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS) || undefined
  const onCreditNotes = tab === CREDIT_NOTES_TAB.id
  const view = onCreditNotes ? VIEWS.creditNotes : VIEWS.adjustments
  const status = ADJUSTMENT_TABS.find((t) => t.id === tab)?.status
  // One query per view, only for the tab on screen (§6.9.3).
  const adjustments = useBillingAdjustments(
    { status: status ? [...status] : undefined, page, page_size: PAGE_SIZE },
    { enabled: !onCreditNotes },
  )
  const creditNotes = useCreditNoteRegister({ page, page_size: PAGE_SIZE, q }, { enabled: onCreditNotes })
  const query = onCreditNotes ? creditNotes : adjustments
  const rows = onCreditNotes
    ? (creditNotes.data?.items ?? []).map(toCreditNoteListRow)
    : (adjustments.data?.items ?? []).map(toAdjustmentRow)
  const creditNoteSearch = {
    value: search,
    onChange: (value: string) => {
      setSearch(value)
      setPage(1)
    },
  }

  return (
    <StatusTabbedList
      title={S.title}
      subtitle={S.subtitle}
      tabs={ADJUSTMENT_PAGE_TABS}
      activeTab={tab}
      onTabChange={(id) => {
        setTab(id)
        setPage(1)
      }}
      columns={view.columns}
      rows={rows}
      variantOf={view.variantOf}
      persistKey="rentals-billing-adjustments"
      onRowClick={(row) => navigate(view.href(String(row.id)))}
      query={query}
      pagination={{ page, pageSize: PAGE_SIZE, total: query.data?.total ?? 0, onPageChange: setPage }}
      emptyState={view.emptyState}
      loadError={view.loadError}
      search={onCreditNotes ? creditNoteSearch : undefined}
    />
  )
}
