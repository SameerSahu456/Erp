import { useEffect } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ApiError } from "@/shared/api/envelope"
import { TimestampFooter } from "@/components/common/display/TimestampFooter"
import { cn } from "@/lib/utils"
import { useFeatures } from "@shared/features"
import { usePermission } from "@shared/rbac"
import { EntityHeader } from "@/components/page-shells/EntityHeader"
import { DetailTabs } from "@/components/page-shells/DetailTabs"

import { AccountBillingsTab, RENTAL_ACCOUNT_TAB_LABEL, rentalsCan } from "@modules/rentals"

import { crmCan } from "../../permissions"
import { AccountApprovalBanner } from "../../components/accounts/AccountApprovalBanner"
// import { ActivityFeed } from "../../components/shared/ActivityFeed"
import { NotesSection } from "../../components/shared/NotesSection"
import { QuoteSection } from "../../components/quotes/QuoteSection"
import { AccountAddressesTab } from "../../components/accounts/AccountAddressesTab"
import { AccountCategoriesCard } from "../../components/accounts/AccountCategoriesCard"
import { AccountContactsTab } from "../../components/accounts/AccountContactsTab"
import { AccountDealsTab } from "../../components/accounts/AccountDealsTab"
import { AccountHierarchyCards } from "../../components/accounts/AccountHierarchyCards"
import { AccountDetailHeaderActions } from "../../components/accounts/AccountDetailHeaderActions"
import { OrdersSection } from "../../components/sales-orders/OrdersSection"
import { AccountOverviewTab } from "../../components/accounts/AccountOverviewTab"
import { AccountOwnersCard } from "../../components/accounts/AccountOwnersCard"
import { AccountPlaceholderTab } from "../../components/accounts/AccountPlaceholderTab"
import { AccountThreeSixtyTab } from "../../components/accounts/AccountThreeSixtyTab"
import { AddAccountOwnerDialog } from "../../components/accounts/AddAccountOwnerDialog"
import { DeleteAccountDialog } from "../../components/accounts/DeleteAccountDialog"
import { STATUS_VARIANT_BY_AC, TAG_TONE_BY_TAG } from "../../components/accounts/accountDetailHelpers"
import { ACCOUNTS_STRINGS as S } from "../../components/accounts/accounts.strings"
import { ACCOUNT_STATUS_LABELS } from "../../constants/account-status"
import { useAccountDetail } from "../../hooks/accounts/useAccountDetail"

function AccountDetailPage() {
  const detail = useAccountDetail()
  const account = detail.account
  const [searchParams] = useSearchParams()
  const { can, isAdminRole } = usePermission()
  const features = useFeatures()
  // The Billings tab's endpoints are gated on `rentals:read`; without it
  // the tab could only render a 403, so it is not offered.
  const canViewRentals = can(rentalsCan.view)
  // admin/superadmin (by role name) OR the crm:account_approve grant (which
  // also covers is_superuser via `can`).
  const canApprove = isAdminRole || can([...crmCan.approveAccount])
  // 360° tab visibility — gated on `crm:account_360_view`. Seeded to PM/APM
  // in the backend; admin/superadmin pass via `isAdminRole` because they
  // bypass permission lookups entirely.
  const canViewThreeSixty = isAdminRole || can([...crmCan.viewAccount360])

  if (detail.isLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {S.detail.loading}
      </div>
    )
  }

  if (detail.isError || !account) {
    // A 403 means the account exists but this user isn't allowed to see it —
    // show a "restricted" state, distinct from the generic not-found shown for
    // a missing/deleted account (404) or any other failure.
    const isRestricted =
      detail.error instanceof ApiError && detail.error.statusCode === 403
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="font-display text-xl font-semibold">
          {isRestricted ? S.detail.restrictedTitle : S.detail.notFoundTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isRestricted ? S.detail.restrictedDescription : S.detail.notFoundDescription}
        </p>
        <Button variant="outline" render={<Link to="/crm/accounts" />}>
          {S.detail.back}
        </Button>
      </div>
    )
  }

  // Approval state drives the top banner + the header status pill — read
  // straight off the account response, same as every other field. Approve /
  // reject hit the real endpoints; the refetched account flips the banner.
  const approvalStatus = account.approval_status
  const isPendingApproval = approvalStatus === "Pending"
  const decidedBy = account.approval_by?.name ?? null
  const decidedAt = account.approval_at
  const approvalReason = account.approval_reason
  const isDeciding = detail.approveMut.isPending || detail.rejectMut.isPending
  // Came from the Approvals tab (the row navigates with `?from=approval` and the
  // page it was on), so "Back" returns to that tab AND that page.
  const backHref = (() => {
    if (searchParams.get("from") !== "approval") return "/crm/accounts"
    const apPage = searchParams.get("ap_page")
    return apPage
      ? `/crm/accounts?tab=approval&ap_page=${apPage}`
      : "/crm/accounts?tab=approval"
  })()

  function handleApprove(note?: string) {
    detail.approveMut.mutate(note)
  }
  function handleReject(reason: string) {
    detail.rejectMut.mutate(reason.trim())
  }

  const tabs = [
    { id: "overview", label: S.detail.tabs.overview, content: <AccountOverviewTab account={account} /> },
    {
      id: "addresses",
      label: S.detail.tabs.addresses,
      count: detail.addressesCount,
      content: <AccountAddressesTab billingAddresses={detail.billingAddresses} shippingAddresses={detail.shippingAddresses} />,
    },
    {
      id: "contacts",
      label: S.detail.tabs.contacts,
      count: detail.contactsCount ?? detail.contacts.length,
      content: <AccountContactsTab account={account} contacts={detail.contacts} />,
    },
    {
      id: "deals",
      bare: true,
      label: S.detail.tabs.deals,
      count: detail.dealsTotal,
      content: (
        <AccountDealsTab
          accountId={account.id}
          deals={detail.deals}
          total={detail.dealsListTotal}
          filters={detail.dealsFilters}
          isLoading={detail.dealsQuery.isLoading}
          isFetching={detail.dealsQuery.isFetching}
          page={detail.dealsPage}
          pageSize={detail.dealsPageSize}
          onPageChange={detail.setDealsPage}
          onPageSizeChange={detail.setDealsPageSize}
          onOpenDeal={(id) => detail.navigate(`/crm/deals/${id}`)}
        />
      ),
    },
    {
      id: "quotes",
      bare: true,
      label: S.detail.tabs.quotes,
      count: detail.quotesTotal,
      content: <QuoteSection quotableType="account" quotableId={account.id} accountId={account.id} />,
    },
    {
      id: "sales-orders",
      bare: true,
      label: S.detail.tabs.salesOrders,
      count: detail.salesOrdersTotal,
      content: <OrdersSection source="account" sourceId={account.id} />,
    },
    // Rental billing defaults. Owned by the rentals module — these
    // cascade onto every rental sales order configured for this account
    // afterwards, so the form lives beside the account it defaults, not
    // on each order. Hidden without rentals read access, which its
    // endpoint requires.
    ...(canViewRentals
      ? [
          {
            id: "billings",
            label: RENTAL_ACCOUNT_TAB_LABEL,
            content: <AccountBillingsTab accountId={account.id} />,
          },
        ]
      : []),
    // Meetings and the 360° tab below ride the `crm_extras` feature switch.
    ...(features.crm_extras
      ? [
          {
            id: "meetings",
            label: S.detail.tabs.meetings,
            content: <AccountPlaceholderTab label={S.detail.tabs.meetings} />,
          },
        ]
      : []),
    // {
    //   id: "activities",
    //   label: S.detail.tabs.activities,
    //   count: detail.activitiesCount,
    //   content: <ActivityFeed entityType="account" entityId={account.id} />,
    // },
    {
      id: "notes",
      label: S.detail.tabs.notes,
      count: detail.notesTotal,
      content: <NotesSection entityType="account" entityId={account.id} />,
    },
    // Customer 360° view — starts with Top Products; more widgets slot into
    // its widget grid over time. See `AccountThreeSixtyTab` for the shell.
    //
    // APPROVED ACCOUNTS ONLY. Every widget on this tab reports closed revenue —
    // top products, the category x brand mix, the KPI strip. An account still
    // awaiting approval (or rejected) has no settled commercial history to
    // report on, so the tab would render a grid of empty cards and read as
    // broken rather than as "not yet".
    //
    // Spread so the tab is ABSENT rather than disabled. `DetailTabs` falls back
    // to the first tab for an unknown `?tab=`, so an old `?tab=three-sixty`
    // link on a pending account (or by a role without the permission) lands
    // on Overview instead of erroring. Also gated on the
    // `crm:account_360_view` code (see `canViewThreeSixty`) — the tab reveals
    // whole-account revenue, so it is not part of the general Account read
    // surface.
    ...(features.crm_extras && approvalStatus === "Approved" && canViewThreeSixty
      ? [
          {
            id: "three-sixty",
            label: S.detail.tabs.threeSixty,
            content: <AccountThreeSixtyTab key={account.id} accountId={account.id} />,
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        sticky
        title={account.name.toUpperCase()}
        reference={account.code}
        status={
          isPendingApproval
            ? { label: S.detail.approval.pending, variant: "warning" }
            : approvalStatus === "Rejected"
              ? { label: S.detail.approval.rejected, variant: "error" }
              : approvalStatus === "Approved"
                ? { label: S.detail.approval.approved, variant: "success" }
                : {
                    label: ACCOUNT_STATUS_LABELS[account.status],
                    variant: STATUS_VARIANT_BY_AC[account.status],
                  }
        }
        badges={
          // 2026-05-27: `tag` is nullable on the backend now — render the
          // chip only when an account has been classified, no placeholder.
          account.tag ? (
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-[9px] py-[2px] text-[11.5px] font-[550] leading-[1.6] tracking-[0.005em]",
                TAG_TONE_BY_TAG[account.tag],
              )}
            >
              {account.tag}
            </span>
          ) : null
        }
        backHref={backHref}
        actions={
          <AccountDetailHeaderActions
            accountId={account.id}
            onDeleteClick={() => detail.setDeleteDialogOpen(true)}
          />
        }
      />

      {approvalStatus && (
        <AccountApprovalBanner
          status={approvalStatus}
          canApprove={canApprove}
          decidedBy={decidedBy}
          decidedAt={decidedAt}
          reason={approvalReason}
          isDeciding={isDeciding}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {/* The summary sidebar (Owners / Hierarchy / Categories) belongs to the
       *  Overview tab only. Every other tab — including the 360° widget grid,
       *  Deals, Quotes, Sales Orders, Contacts, … — gets the full page width.
       *  Reads the active tab from `?tab=` (`<DetailTabs>` mirrors it there); a
       *  missing or unknown value falls back to the first tab, Overview. */}
      <DropUnavailableTabParam tabIds={tabs.map((t) => t.id)} />
      <DetailTabs
        cardContent
        tabs={tabs}
        defaultTab="overview"
        aside={
          <>
            <AccountOwnersCard
              owners={detail.owners ?? []}
              onAddOwnerClick={() => detail.setAddOwnerOpen(true)}
              onMakePrimary={(userId) => detail.promotePrimaryMut.mutate(userId)}
              onRemove={(userId) => detail.removeOwnerMut.mutate(userId)}
              isPromoting={detail.promotePrimaryMut.isPending}
              isRemoving={detail.removeOwnerMut.isPending}
            />
            {/* Hide the parent/child hierarchy view until the account is approved
             *  — a Pending or Rejected account shouldn't surface or anchor
             *  relationships. */}
            {approvalStatus === "Approved" && (
              <AccountHierarchyCards
                account={account}
                parentAccount={detail.parentAccount}
                childAccounts={detail.childAccounts}
                childAccountsTotal={detail.childAccountsTotal}
                setChildSentinel={detail.setChildSentinel}
                isFetchingMoreChildren={detail.childrenQuery.isFetchingNextPage}
              />
            )}
            <AccountCategoriesCard
              categoriesInterested={account.categories_interested}
              categoriesBought={account.categories_bought}
            />
          </>
        }
      />

      <DeleteAccountDialog
        open={detail.deleteDialogOpen}
        onOpenChange={detail.setDeleteDialogOpen}
        accountName={account.name}
        onDelete={detail.handleDelete}
        isPending={detail.deleteMut.isPending || detail.isCheckingDealsForDelete}
      />

      <AddAccountOwnerDialog
        open={detail.addOwnerOpen}
        onOpenChange={detail.setAddOwnerOpen}
        existingIds={(detail.owners ?? []).map((o) => o.user_id)}
        onAdd={detail.handleAddOwners}
        isPending={detail.addOwnerMut.isPending}
        accountType={account?.account_type}
        accountId={account?.id}
      />

      <TimestampFooter
        createdAt={account.created_at}
        updatedAt={account.updated_at}
      />
    </div>
  )
}

/**
 * A shared `?tab=three-sixty` link opened by someone without that tab falls back
 * to Overview (`<DetailTabs>` ignores an unknown id) but leaves the stale id in
 * the address bar, so a refresh or re-share keeps pointing at a tab they don't have.
 * Drop it once the real tab set is known.
 */
function DropUnavailableTabParam({ tabIds }: { tabIds: string[] }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get("tab")
  const known = requested === null || tabIds.includes(requested)

  useEffect(() => {
    if (known) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete("tab")
        return next
      },
      { replace: true },
    )
  }, [known, setSearchParams])

  return null
}

export default AccountDetailPage
