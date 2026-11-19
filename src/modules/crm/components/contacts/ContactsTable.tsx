import { useMemo } from "react"

import { OverflowPillList } from "@/components/common/display/OverflowPillList"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Typography } from "@/components/ui/typography"
import { formatIST_date } from "@shared/lib/date"

import { CrmDataTable } from "../shared/CrmDataTable"
import type { CellFormatter, TabConfig } from "../shared/CrmDataTable"
import { CrmFilterAside } from "../shared/CrmFilterAside"
import { CrmClearAllButton } from "../shared/CrmClearAllButton"
import { CrmFiltersButton } from "../shared/CrmFiltersButton"
import { CrmListFilterPanel } from "../shared/CrmListFilterPanel"
import { type ContactStatus } from "../../api"
import { PAGINATION } from "@/shared/constants"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { isValidationError } from "@/shared/api/envelope"

import { CONTACT_STATUS_VARIANT } from "../../constants/contact-status"
import { CONTACTS_STRINGS } from "./contacts.strings"
import { useContactsList } from "../../hooks/contacts/useContactsList"

export function ContactsTable({ list }: { list: ReturnType<typeof useContactsList> }) {
  // 2026-05-27: /contacts list response now embeds linked accounts
  // (`{account_id, account_name, account_code, is_primary}`) — render
  // them inline so sales can see who a contact belongs to without
  // clicking through. Primary account is sorted first inside the chip.
  const contactsTab: TabConfig = useMemo(
    () => ({
      id: "contacts",
      label: CONTACTS_STRINGS.list.tabLabel,
      columns: [
        {
          key: "name",
          label: CONTACTS_STRINGS.list.columns.name,
          sortable: true,
          truncate: true,
          width: "220px",
        },
        { key: "accounts", label: CONTACTS_STRINGS.list.columns.accounts },
        { key: "designation", label: CONTACTS_STRINGS.list.columns.designation, sortable: true },
        { key: "department", label: CONTACTS_STRINGS.list.columns.department, sortable: true },
        { key: "email", label: CONTACTS_STRINGS.list.columns.email, sortable: true },
        { key: "phone", label: CONTACTS_STRINGS.list.columns.phone },
        { key: "preferred", label: CONTACTS_STRINGS.list.columns.preferred },
        { key: "status", label: CONTACTS_STRINGS.list.columns.status, sortable: true },
        { key: "createdOn", label: CONTACTS_STRINGS.list.columns.createdOn },
      ],
      data: list.items.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email ?? "",
        phone: c.phone ?? "",
        // Primary account first so it lands in the single inline pill
        // (the rest collapse into the +N overflow popover).
        accounts: [...(c.accounts ?? [])].sort(
          (x, y) => Number(y.is_primary) - Number(x.is_primary),
        ),
        designation: c.designation ?? "—",
        department: c.department ?? "—",
        // "Preferred" lights up when any linked account on this contact
        // is marked primary. Backend keeps `primary_account_id` in sync
        // with the `is_primary` flag on `contact_accounts` rows; we read
        // the array to stay correct even if the two ever drift.
        preferred: (c.accounts ?? []).some((a) => a.is_primary),
        status: c.status,
        createdOn: c.created_at,
      })),
    }),
    [list.items],
  )

  const cellFormatter: CellFormatter = (value, key) => {
    if (key === "createdOn") {
      return { display: typeof value === "string" && value ? formatIST_date(value) : "—" }
    }
    if (key === "name" && typeof value === "string") {
      return { display: <span className="font-medium">{value}</span> }
    }
    if (key === "status" && typeof value === "string") {
      const variant = CONTACT_STATUS_VARIANT[value as ContactStatus] ?? "neutral"
      return { display: <StatusBadge variant={variant}>{value}</StatusBadge> }
    }
    if (key === "email" && typeof value === "string" && value) {
      return {
        display: (
          <a
            href={`mailto:${value}`}
            className="truncate text-primary underline-offset-4 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {value}
          </a>
        ),
      }
    }
    if (key === "phone" && typeof value === "string" && value) {
      return {
        display: (
          <a
            href={`tel:${value}`}
            className="truncate text-primary underline-offset-4 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {value}
          </a>
        ),
      }
    }
    if (key === "email" && !value) {
      return { display: <Typography variant="helper">—</Typography> }
    }
    if (key === "phone" && !value) {
      return { display: <Typography variant="helper">—</Typography> }
    }
    if (key === "accounts" && Array.isArray(value)) {
      const accounts = value as {
        account_id: string
        account_name: string
        account_code: string
        is_primary: boolean
      }[]
      return {
        display: (
          <OverflowPillList
            items={accounts}
            getItemKey={(a) => a.account_id}
            getItemLabel={(a) => a.account_name || a.account_code}
            summaryLabel={CONTACTS_STRINGS.list.pills.accountsSummary}
            hoverTitle={CONTACTS_STRINGS.list.pills.accountsHover}
          />
        ),
      }
    }
    if (key === "preferred") {
      return value
        ? { display: <Badge variant="success-soft" size="sm">{CONTACTS_STRINGS.list.preferredBadge}</Badge> }
        : { display: <Typography variant="helper" tone="muted">—</Typography> }
    }
    return null
  }

  return (
    <div className="flex">
      <CrmFilterAside
        open={list.filtersOpen}
        activeFilterCount={list.activeFilterCount}
        onClose={() => list.setFiltersOpen(false)}
      >
        <CrmListFilterPanel
          selects={list.asideSelects}
          activeFilterCount={list.activeFilterCount}
          onResetAll={list.resetAllFilters}
        />
      </CrmFilterAside>
      <div className="min-w-0 flex-1">
        <CrmDataTable
          className="cpt-compact crm-premium-table crm-toolbar-wrap"
          toolbarLayout="inline"
          tabs={[contactsTab]}
          cellFormatter={cellFormatter}
          pageSize={list.pageSize}
          searchable
          searchValue={list.search}
          onSearchChange={list.setSearch}
          toolbarFilters={list.toolbarFilters}
          onToolbarFilterChange={list.handleToolbarFilterChange}
          onToolbarDateRangeChange={list.handleToolbarDateRangeChange}
          // Created On chip sits right beside the Filters button.
          dateRangePlacement="start"
          // Filters button sits right beside the search box (opens the aside).
          leadingFilters={
            <CrmFiltersButton
              compact
              open={list.filtersOpen}
              onToggle={() => list.setFiltersOpen((v) => !v)}
              activeFilterCount={list.activeFilterCount}
            />
          }
          onClearFilters={list.handleClearFilters}
          trailingFilters={
            list.activeFilterCount > 0 ? <CrmClearAllButton compact onClick={list.resetAllFilters} /> : null
          }
          persistKey="crm-contacts"
          onRowClick={(row) => list.openContact(String(row.id))}
          serverPagination={{
            page: list.page,
            pageSize: list.pageSize,
            total: list.total,
            isFetching: list.isFetching,
            onPageChange: list.setPage,
            onPageSizeChange: list.setPageSize,
            pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
          }}
          emptyNode={
            list.isError && !isValidationError(list.error) ? (
              <LoadErrorState error={list.error} fallback={CONTACTS_STRINGS.list.loadError} />
            ) : list.isLoading ? (
              <Typography variant="body" tone="muted" align="center" asChild>
                <div className="px-4 py-12">
                  {CONTACTS_STRINGS.list.loading}
                </div>
              </Typography>
            ) : undefined
          }
          emptyState={{
            title: CONTACTS_STRINGS.list.empty.title,
            description: CONTACTS_STRINGS.list.empty.description,
            action: list.canWriteContact
              ? {
                  label: CONTACTS_STRINGS.list.empty.action,
                  onClick: list.openContactNew,
                }
              : undefined,
          }}
        />
      </div>
    </div>
  )
}
