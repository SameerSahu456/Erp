import { useMemo } from "react"

import { OverflowPillList } from "@/components/common/display/OverflowPillList"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Typography } from "@/components/ui/typography"

import { EMPTY_VALUE, PAGINATION } from "@/shared/constants"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { isValidationError } from "@/shared/api/envelope"
import { useAuth } from "@shared/auth/use-auth"
import { formatIST_date } from "@shared/lib/date"

import { CrmDataTable } from "../shared/CrmDataTable"
import type { CellFormatter, TabConfig } from "../shared/CrmDataTable"
import {
  type AccessRequestStatusWire,
  type AccountApprovalStatus,
  type AccountStatus,
  type AccountTagWire,
  type CrmIdNameRef,
} from "../../api"
import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_STATUS_VARIANT,
} from "../../constants/account-status"
import { useAccountsList } from "../../hooks/accounts/useAccountsList"
import { ACCOUNTS_STRINGS as S } from "./accounts.strings"
import { AsyncUserMultiSelect } from "../shared/AsyncUserMultiSelect"
import { CrmFilterAside } from "../shared/CrmFilterAside"
import { CrmClearAllButton } from "../shared/CrmClearAllButton"
import { CrmFiltersButton } from "../shared/CrmFiltersButton"
import { CrmListFilterPanel } from "../shared/CrmListFilterPanel"
import { EnumMultiSelect } from "../shared/EnumMultiSelect"
import { UserNamesCell } from "../shared/UserNamesCell"
import { RequestAccessCell } from "./RequestAccessCell"

const approvalVariant: Record<AccountApprovalStatus, StatusBadgeVariant> = {
  Pending: "warning",
  Approved: "success",
  Rejected: "error",
}

// Viewer's access-request status → badge styling + label. Pending shows a
// "Requested" pill, Approved a granted pill, Rejected a denied pill.
const accessStatusVariant: Record<AccessRequestStatusWire, StatusBadgeVariant> = {
  Pending: "warning",
  Approved: "success",
  Rejected: "error",
}

const accessStatusLabel: Record<AccessRequestStatusWire, string> = {
  Pending: S.list.access.requested,
  Approved: S.list.access.granted,
  Rejected: S.list.access.rejected,
}

const tagVariant: Record<AccountTagWire, StatusBadgeVariant> = {
  Hunting: "warning",
  Farming: "success",
  Cold: "neutral",
}

export function AccountsTable({
  list,
  showAccess = true,
  rejected = false,
}: {
  list: ReturnType<typeof useAccountsList>
  /** Per-row Request Access column. Off on the Rejected tab — nobody requests
   *  access to a rejected account. */
  showAccess?: boolean
  /** Rejected tab — the decider column + filter read "Rejected By". */
  rejected?: boolean
}) {
  const { user } = useAuth()
  const currentUserId = user?.id ?? null
  // 2026-05-27: the /accounts list response now ships category arrays and
  // an enriched account_owners embed (batched server-side, no N+1) — we
  // add Owners + Categories columns inline. Tag column tolerates `null`
  // since tag became nullable in the same enhancement.
  const accountsTab: TabConfig = useMemo(
    () => ({
      id: "accounts",
      label: S.list.tabLabel,
      columns: [
        {
          key: "name",
          label: S.list.columns.name,
          sortable: true,
          truncate: true,
          width: "240px",
        },
        { key: "entityType", label: S.list.columns.entityType, sortable: true },
        { key: "industry", label: S.list.columns.industry, sortable: true },
        { key: "type", label: S.list.columns.type, sortable: true },
        { key: "owners", label: S.list.columns.owners },
        { key: "status", label: S.list.columns.status, sortable: true },
        { key: "categoriesInterested", label: S.list.columns.interested },
        { key: "categoriesBought", label: S.list.columns.bought },
        { key: "tag", label: S.list.columns.tag, sortable: true },
        { key: "createdOn", label: S.list.columns.createdOn },
        // Rentals › Accounts only: when the customer first rented.
        ...(list.hasRentals
          ? [
              { key: "firstRentalOrder", label: S.list.columns.firstRentalOrder },
              // How many rental SOs the account has or had, any status.
              {
                key: "rentalOrders",
                label: S.list.columns.rentalOrders,
                align: "right" as const,
              },
            ]
          : []),
        // Approval + who approved sit together, right before Access.
        { key: "approvalStatus", label: S.list.columns.approval, filterable: true },
        {
          key: "approvedBy",
          label: rejected ? S.list.columns.rejectedBy : S.list.columns.approvedBy,
        },
        ...(showAccess
          ? [{ key: "access", label: S.list.columns.access, align: "right" as const }]
          : []),
      ],
      data: list.items.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        // Owner ids + the backend `can_request_access` flag drive the per-row
        // Request Access affordance: shown only to non-owners who don't already
        // have a Pending/Approved request (flag is false in that case).
        _ownerIds: (a.account_owners ?? []).map((o) => o.id),
        _canRequestAccess: a.can_request_access,
        _accessRequestStatus: a.access_request_status ?? null,
        // Hierarchy discriminator: a null parent means this is a top-level
        // company (Parent); any value means it's a sub-account (Child).
        entityType: a.parent_account_id ? "Child" : "Parent",
        industry: a.industry ?? "—",
        type: a.account_type,
        tag: a.tag ?? "",
        createdOn: a.created_at,
        // Defensive `?? []` — when the running backend hasn't been
        // deployed with the 2026-05-27 enhancement, the list response
        // doesn't carry `account_owners` and reads as undefined. Primary
        // owner first so it lands in the single inline pill.
        owners: [...(a.account_owners ?? [])].sort(
          (x, y) =>
            Number(y.id === a.primary_owner_id) -
            Number(x.id === a.primary_owner_id),
        ),
        categoriesInterested: a.categories_interested ?? [],
        categoriesBought: a.categories_bought ?? [],
        status: a.status,
        approvalStatus: a.approval_status,
        approvedBy: a.approval_by ? [a.approval_by] : [],
        firstRentalOrder: formatIST_date(a.first_rental_order_at),
        // A real 0 (defaults-only account) is a value and shows as 0; only
        // an absent field (older backend) falls back to the dash.
        rentalOrders: a.rental_order_count ?? EMPTY_VALUE,
      })),
    }),
    [list.items, list.hasRentals, showAccess, rejected],
  )

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "createdOn") {
      return { display: typeof value === "string" && value ? formatIST_date(value) : "—" }
    }
    if (key === "access") {
      const ownerIds = (row._ownerIds as string[] | undefined) ?? []
      const isOwner = currentUserId != null && ownerIds.includes(currentUserId)
      // Owners already have access — nothing to show.
      if (isOwner) return { display: null }

      const status = row._accessRequestStatus as AccessRequestStatusWire | null
      const canRequest = row._canRequestAccess !== false

      if (status != null) {
        // A rejected request is not surfaced as an alarming "Access Denied"
        // pill — instead show the Re-request affordance (lock button) so the
        // user can act directly. (`can_request_access` is true only for the
        // Rejected case, which is exactly when re-requesting is allowed.)
        if (status === "Rejected") {
          return {
            display: (
              <RequestAccessCell
                accountId={String(row.id)}
                accountName={String(row.name)}
                reRequest
              />
            ),
          }
        }
        // Pending / Approved: informational pill only — no action, since the
        // user can't re-request while a request is pending or already granted.
        return {
          display: (
            <div className="flex justify-end">
              <StatusBadge variant={accessStatusVariant[status]}>
                {accessStatusLabel[status]}
              </StatusBadge>
            </div>
          ),
        }
      }

      // No request yet: offer the request affordance to those who may raise one
      // (non-owner, non-admin/auto-view). Admins / auto-view roles have
      // `can_request_access === false` with no status → render nothing.
      if (!canRequest) return { display: null }
      return {
        display: (
          <RequestAccessCell accountId={String(row.id)} accountName={String(row.name)} />
        ),
      }
    }
    if (key === "name" && typeof value === "string") {
      return { display: <span className="uppercase">{value}</span> }
    }
    if (key === "entityType" && typeof value === "string") {
      return {
        display: <Badge variant="secondary">{value}</Badge>,
      }
    }
    if (key === "status" && typeof value === "string") {
      const status = value as AccountStatus
      const variant = ACCOUNT_STATUS_VARIANT[status] ?? "neutral"
      return {
        display: (
          <StatusBadge variant={variant}>
            {ACCOUNT_STATUS_LABELS[status] ?? value}
          </StatusBadge>
        ),
      }
    }
    if (key === "approvalStatus" && typeof value === "string") {
      const variant = approvalVariant[value as AccountApprovalStatus] ?? "neutral"
      return { display: <StatusBadge variant={variant}>{value}</StatusBadge> }
    }
    if (key === "approvedBy" && Array.isArray(value)) {
      return { display: <UserNamesCell users={value as CrmIdNameRef[]} /> }
    }
    if (key === "tag") {
      // Tag is nullable since 2026-05-27 — render an em-dash on rows
      // where sales hasn't classified the account yet.
      if (typeof value !== "string" || !value) {
        return { display: <Typography variant="helper" tone="muted">—</Typography> }
      }
      const variant = tagVariant[value as AccountTagWire] ?? "neutral"
      return { display: <StatusBadge variant={variant}>{value}</StatusBadge> }
    }
    if (key === "owners" && Array.isArray(value)) {
      const owners = value as { id: string; name: string }[]
      return {
        display: (
          <OverflowPillList
            items={owners}
            getItemKey={(o) => o.id}
            getItemLabel={(o) => o.name}
            summaryLabel={S.list.pills.owners}
            hoverTitle={S.list.pills.ownersHover}
          />
        ),
      }
    }
    if ((key === "categoriesInterested" || key === "categoriesBought") && Array.isArray(value)) {
      const categories = value as CrmIdNameRef[]
      return {
        display: (
          <OverflowPillList
            items={categories}
            getItemKey={(c) => c.id}
            getItemLabel={(c) => c.name}
            summaryLabel={key === "categoriesInterested" ? S.list.pills.interested : S.list.pills.bought}
            hoverTitle={key === "categoriesInterested" ? S.list.pills.interestedHover : S.list.pills.boughtHover}
          />
        ),
      }
    }
    return null
  }

  return (
    <div className="flex">
      {/* Rentals › Accounts has no aside facets (Industry / Entity Type are CRM-only). */}
      {!list.hasRentals && (
        <CrmFilterAside
          open={list.filtersOpen}
          activeFilterCount={list.activeFilterCount}
          onClose={() => list.setFiltersOpen(false)}
        >
          <CrmListFilterPanel
            selects={list.asideSelects}
            checkboxes={list.asideCheckboxes}
            activeFilterCount={list.activeFilterCount}
            onResetAll={list.resetAllFilters}
          />
        </CrmFilterAside>
      )}
      <div className="min-w-0 flex-1">
        <CrmDataTable
          className="cpt-compact crm-premium-table crm-toolbar-wrap accounts-list-table"
          toolbarLayout="inline"
          tabs={[accountsTab]}
          cellFormatter={cellFormatter}
          pageSize={list.pageSize}
          searchable
          searchValue={list.search}
          onSearchChange={list.setSearch}
          toolbarFilters={list.toolbarFilters}
          onToolbarFilterChange={list.handleToolbarFilterChange}
          onToolbarDateRangeChange={list.handleToolbarDateRangeChange}
          // Filters button + Created Date chip sit right beside the search box.
          dateRangePlacement="start"
          leadingFilters={
            list.hasRentals ? undefined : (
              <CrmFiltersButton
                compact
                open={list.filtersOpen}
                onToggle={() => list.setFiltersOpen((v) => !v)}
                activeFilterCount={list.activeFilterCount}
              />
            )
          }
          extraFilters={<AccountsExtraFilters list={list} rejected={rejected} />}
          onClearFilters={list.handleClearFilters}
          trailingFilters={
            list.activeFilterCount > 0 ? <CrmClearAllButton compact onClick={list.resetAllFilters} /> : null
          }
          persistKey="crm-accounts"
          onRowClick={(row) => list.openAccount(String(row.id))}
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
              <LoadErrorState error={list.error} fallback={S.list.loadError} />
            ) : list.isLoading ? (
              <Typography variant="body" tone="muted" align="center" asChild>
                <div className="px-4 py-12">{S.list.loading}</div>
              </Typography>
            ) : undefined
          }
          emptyState={{
            title: S.list.empty.title,
            description: S.list.empty.description,
            action: list.canWriteAccount
              ? {
                  label: S.list.empty.action,
                  onClick: list.openAccountNew,
                }
              : undefined,
          }}
        />
      </div>
    </div>
  )
}

/** Toolbar multi-selects beside the static chips. Fixed-width wrappers keep each
 *  trigger the size of a static select chip (w-[170px]) instead of growing with
 *  its "(N)" label. */
function AccountsExtraFilters({
  list,
  rejected,
}: {
  list: ReturnType<typeof useAccountsList>
  rejected: boolean
}) {
  return (
    <>
      {/* Channel Type and Approved By are CRM facets, not Rentals ones. */}
      {!list.hasRentals && (
        <div className="w-[170px]">
          <EnumMultiSelect
            label={S.list.filters.typeLabel}
            value={list.selectedTypes}
            options={list.typeOptions}
            onChange={list.setSelectedTypes}
            className="h-8 rounded-[5px] shadow-none"
          />
        </div>
      )}
      <div className="w-[170px]">
        <AsyncUserMultiSelect
          value={list.selectedOwnerIds}
          onValueChange={list.setSelectedOwnerIds}
          label={S.list.filters.owner}
          placeholder={S.list.filters.owner}
          // Only owners of accounts this list can show — not every user.
          optionsSource={list.ownerOptionsSource}
          // Match the static toolbar filter selects (size="sm"): shorter
          // height, tighter radius, no drop shadow.
          className="h-8 rounded-[5px] shadow-none"
        />
      </div>
      {!list.hasRentals && (
        <div className="w-[170px]">
          <AsyncUserMultiSelect
            value={list.selectedApprovedBy}
            onValueChange={list.setSelectedApprovedBy}
            label={rejected ? S.list.filters.rejectedBy : S.list.filters.approvedBy}
            placeholder={rejected ? S.list.filters.rejectedBy : S.list.filters.approvedBy}
            className="h-8 rounded-[5px] shadow-none"
          />
        </div>
      )}
    </>
  )
}
