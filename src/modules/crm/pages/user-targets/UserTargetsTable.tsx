import { useCallback, useMemo, useState } from "react"
import { Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { Typography } from "@/components/ui/typography"

import { PAGINATION } from "@/shared/constants"
import { formatINRShort } from "@/lib/currency"
import { formatIST } from "@/shared/lib/date"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import { CrmDataTable } from "../../components/shared/CrmDataTable"
import type {
  CellFormatter,
  TabConfig,
  ToolbarFilter,
} from "../../components/shared/CrmDataTable"
import { AsyncUserMultiSelect } from "../../components/shared/AsyncUserMultiSelect"
import {
  TARGET_STATUSES,
  type TargetStatus,
  type UserSalesTarget,
} from "../../api"
import {
  TARGET_STATUS_LABELS,
  TARGET_STATUS_VARIANT,
} from "../../constants/user-target-status"
import { USER_TARGETS_STRINGS as S } from "../../components/user-targets/user-targets.strings"
import { useUserTargets } from "../../hooks/user-targets/useUserTargets"

// ─── Props ─────────────────────────────────────────────────────────────
//
// One table component powers both the "All Targets" tab and the "Approvals"
// tab (DRY — same cells, same renderer, different filter preset). The
// ``variant`` prop pins the behavioural differences:
//   - "all"       → user + FY + status filter chips in the toolbar.
//   - "approvals" → status locked to PendingApproval; same user + FY chips.
//
// Scope is always ``team`` — the backend intersects it with ``user_ids`` so
// a non-admin viewer sees only their reporting subtree. Admins at the top of
// the org naturally see every user through the same scope.

interface Props {
  variant: "all" | "approvals"
  /** True for admin/superadmin — enables the "Amend" action on Approved rows
   *  and removes the manager-id scope on the user picker. */
  isAdminLike: boolean
  /** True iff the actor can approve/reject (admin-only per backend §7.1). */
  canApprove: boolean
  /** Current user's id. Scopes the user picker for non-admin viewers so the
   *  dropdown lists only their reporting subtree. */
  actorId: string
  onEdit: (row: UserSalesTarget) => void
  onAmend: (row: UserSalesTarget) => void
  // ``viewOnly`` is set when the current viewer can't change the target at
  // this status — the dialog opens disabled. Only ``false`` when the viewer
  // actually has write authority at this status.
  onBifurcate: (row: UserSalesTarget, viewOnly: boolean) => void
  onAction: (
    row: UserSalesTarget,
    kind: "approve" | "reject" | "discard",
  ) => void
}

const PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE
const ALL_FILTER = ""

// FY picker range — current FY and the two years on either side. Covers the
// prior-FY (immutable) view, the active year, and planning for next year.
const FY_RANGE_RADIUS = 2

export function UserTargetsTable({
  variant,
  isAdminLike,
  canApprove,
  actorId,
  onEdit,
  onAmend,
  onBifurcate,
  onAction,
}: Props) {
  const isApprovalsVariant = variant === "approvals"

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE)
  const [userIds, setUserIds] = useState<string[]>([])
  const [fyStartYear, setFyStartYear] = useState<number | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<string>(ALL_FILTER)

  // Approvals tab locks the status chip so the toolbar can't widen the slice.
  const effectiveStatuses: readonly TargetStatus[] | undefined = isApprovalsVariant
    ? (["PendingApproval"] as const)
    : statusFilter === ALL_FILTER
      ? undefined
      : [statusFilter as TargetStatus]

  // Admin / superadmin → scope=all so they see every user (they typically
  // have no reports via users.manager_ids, so scope=team would collapse to
  // just their own id). Non-admin → scope=team (self + reporting subtree).
  // The server intersects whichever scope with the picked user_ids filter.
  const query = useUserTargets({
    scope: isAdminLike ? "all" : "team",
    status: effectiveStatuses,
    user_ids: userIds.length > 0 ? userIds : undefined,
    fy_start_year: fyStartYear,
    page,
    page_size: pageSize,
  })

  const items = useMemo<UserSalesTarget[]>(
    () => query.data?.items ?? [],
    [query.data?.items],
  )
  const total = query.data?.total ?? 0
  const currentFy = useMemo(() => currentFyStartYear(), [])

  // FY options span `currentFy ± FY_RANGE_RADIUS` so users can file against
  // next year's targets as well as review prior years. The server intersects
  // `scope=team` with the picked FY; non-admins can only see rows for users
  // in their subtree regardless of the picked year.
  const fyOptions = useMemo(() => {
    const options: number[] = []
    for (let y = currentFy - FY_RANGE_RADIUS; y <= currentFy + FY_RANGE_RADIUS; y += 1) {
      options.push(y)
    }
    return options.reverse()
  }, [currentFy])

  // ── TabConfig (columns + rows) ──────────────────────────────────────
  //
  // Keys that start with `_` are hidden from the user; the formatter reads
  // them to pick the right cell renderer and the action row re-materialises
  // the full `UserSalesTarget` from `_raw` so the callbacks fire with the
  // original wire object.
  const tabConfig: TabConfig = useMemo(
    () => ({
      id: "targets",
      label: isApprovalsVariant ? S.page.tabs.approvals : S.page.tabs.all,
      columns: [
        {
          key: "user",
          label: S.table.columns.user,
          sortable: false,
          truncate: true,
          width: "220px",
        },
        { key: "fy_label", label: S.table.columns.fy },
        { key: "q1_target", label: S.table.columns.q1, align: "right" },
        { key: "q2_target", label: S.table.columns.q2, align: "right" },
        { key: "q3_target", label: S.table.columns.q3, align: "right" },
        { key: "q4_target", label: S.table.columns.q4, align: "right" },
        {
          key: "annual_target",
          label: S.table.columns.annual,
          align: "right",
          sortable: false,
        },
        { key: "status", label: S.table.columns.status },
        { key: "reviewer", label: S.table.columns.reviewer, truncate: true, width: "180px" },
        { key: "updated_at", label: S.table.columns.updatedAt },
        { key: "actions", label: S.table.columns.actions, align: "right" },
      ],
      data: items.map((row) => ({
        id: row.id,
        _raw: row,
        _isPriorFy: row.fy_start_year < currentFy,
        user: row.user.name,
        fy_label: row.fy_label,
        q1_target: row.q1_target,
        q2_target: row.q2_target,
        q3_target: row.q3_target,
        q4_target: row.q4_target,
        annual_target: row.annual_target,
        status: row.status,
        reviewer: resolveReviewerLabel(row),
        updated_at: row.updated_at,
        actions: null,
      })),
    }),
    [currentFy, isApprovalsVariant, items],
  )

  // ── Cell formatter ──────────────────────────────────────────────────
  const cellFormatter: CellFormatter = useCallback(
    (value, key, row) => {
      if (
        key === "q1_target" ||
        key === "q2_target" ||
        key === "q3_target" ||
        key === "q4_target"
      ) {
        return { display: formatINRShort(String(value ?? "0")) }
      }
      if (key === "annual_target") {
        return {
          display: (
            <Typography variant="table-figure" numeric>
              {formatINRShort(String(value ?? "0"))}
            </Typography>
          ),
        }
      }
      if (key === "status" && typeof value === "string") {
        const status = value as TargetStatus
        const variant = TARGET_STATUS_VARIANT[status] ?? "neutral"
        return {
          display: (
            <StatusBadge variant={variant}>
              <span className="inline-flex items-center gap-1">
                {status === "Approved" ? (
                  <Lock className="size-3" aria-hidden />
                ) : null}
                {TARGET_STATUS_LABELS[status] ?? value}
              </span>
            </StatusBadge>
          ),
        }
      }
      if (key === "updated_at" && typeof value === "string") {
        return {
          display: (
            <Typography variant="table-secondary">{formatIST(value)}</Typography>
          ),
        }
      }
      if (key === "reviewer") {
        return {
          display: (
            <Typography variant="table-secondary" truncate>
              {String(value ?? S.table.noReviewer)}
            </Typography>
          ),
        }
      }
      if (key === "actions") {
        const raw = row._raw as UserSalesTarget | undefined
        if (!raw) return null
        return {
          display: (
            <RowActions
              row={raw}
              isPriorFy={Boolean(row._isPriorFy)}
              isAdminLike={isAdminLike}
              canApprove={canApprove}
              actorId={actorId}
              onEdit={onEdit}
              onAmend={onAmend}
              onBifurcate={onBifurcate}
              onAction={onAction}
            />
          ),
        }
      }
      return null
    },
    [canApprove, isAdminLike, onAction, onAmend, onBifurcate, onEdit],
  )

  // ── Toolbar filter chips ───────────────────────────────────────────
  //
  // Static filters go through `toolbarFilters` so the chip layout matches
  // the Accounts page (same height, same radius, same inline row). The user
  // multi-select is API-backed, so it rides in `extraFilters` with the
  // fixed-width wrapper that keeps the trigger from growing with the
  // "Users (N)" summary.
  const toolbarFilters: ToolbarFilter[] = useMemo(() => {
    const fyChip: ToolbarFilter = {
      kind: "select",
      key: "fy",
      label: S.filters.fy.label,
      value: fyStartYear === undefined ? ALL_FILTER : String(fyStartYear),
      options: fyOptions.map((year) => ({
        value: String(year),
        label: S.filters.fy.format(year),
      })),
      allLabel: S.filters.fy.all,
    }
    if (isApprovalsVariant) return [fyChip]
    return [
      fyChip,
      {
        kind: "select",
        key: "status",
        label: S.filters.status.label,
        value: statusFilter,
        options: TARGET_STATUSES.map((s) => ({
          value: s,
          label: TARGET_STATUS_LABELS[s],
        })),
        allLabel: S.filters.status.all,
      },
    ]
  }, [fyOptions, fyStartYear, isApprovalsVariant, statusFilter])

  const handleToolbarFilterChange = useCallback(
    (key: string, nextValue: string) => {
      setPage(1)
      if (key === "fy") {
        setFyStartYear(nextValue ? Number(nextValue) : undefined)
        return
      }
      if (key === "status") setStatusFilter(nextValue)
    },
    [],
  )

  const handleUserIdsChange = useCallback((next: string[]) => {
    setUserIds(next)
    setPage(1)
  }, [])

  const handleClearFilters = useCallback(() => {
    setUserIds([])
    setFyStartYear(undefined)
    setStatusFilter(ALL_FILTER)
    setPage(1)
  }, [])

  return (
    <CrmDataTable
      className="cpt-compact crm-premium-table user-targets-list-table"
      toolbarLayout="inline"
      tabs={[tabConfig]}
      cellFormatter={cellFormatter}
      pageSize={pageSize}
      searchable={false}
      toolbarFilters={toolbarFilters}
      onToolbarFilterChange={handleToolbarFilterChange}
      extraFilters={
        // Fixed-width wrapper so the trigger stays the same size as the
        // static select chips (w-[170px]) instead of growing with the
        // "Users (N)" label — the multiselect trigger is w-full, so it
        // fills this box. Mirrors AccountsTable's extraFilters pattern.
        <div className="w-[170px]">
          <AsyncUserMultiSelect
            value={userIds}
            onValueChange={handleUserIdsChange}
            label={S.filters.users.label}
            placeholder={S.filters.users.placeholder}
            // Non-admin: scope the picker to the actor's reporting subtree
            // so they can't paste an id outside their team (backend
            // intersects with scope=team anyway — this is UX, not security).
            managerId={isAdminLike ? undefined : actorId}
            // Match the static toolbar filter selects: shorter height,
            // tighter radius, no drop shadow.
            className="h-8 rounded-[5px] shadow-none"
          />
        </div>
      }
      onClearFilters={handleClearFilters}
      persistKey={`crm-user-targets-${variant}`}
      serverPagination={{
        page,
        pageSize,
        total,
        isFetching: query.isFetching,
        onPageChange: setPage,
        onPageSizeChange: (next) => {
          setPageSize(next)
          setPage(1)
        },
        pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
      }}
      emptyNode={
        query.isError ? (
          <LoadErrorState error={query.error} fallback={S.errors.loadFailed} />
        ) : undefined
      }
      emptyState={{
        title: isApprovalsVariant ? S.empty.noPending : S.empty.noTargets,
        description: isApprovalsVariant
          ? S.empty.noPendingHint
          : S.empty.noTargetsHint,
      }}
    />
  )
}

// ─── Row actions (right-aligned button group) ──────────────────────────

interface RowActionsProps {
  row: UserSalesTarget
  isPriorFy: boolean
  isAdminLike: boolean
  canApprove: boolean
  /** Current user's id — used to hide Approve / Reject on self-targets
   *  (nobody can approve their own target). */
  actorId: string
  onEdit: (row: UserSalesTarget) => void
  onAmend: (row: UserSalesTarget) => void
  onBifurcate: (row: UserSalesTarget, viewOnly: boolean) => void
  onAction: (
    row: UserSalesTarget,
    kind: "approve" | "reject" | "discard",
  ) => void
}

function RowActions({
  row,
  isPriorFy,
  isAdminLike,
  canApprove,
  actorId,
  onEdit,
  onAmend,
  onBifurcate,
  onAction,
}: RowActionsProps) {
  const isApproved = row.status === "Approved"
  const isPending = row.status === "PendingApproval"
  const isDraftOrRejected = row.status === "Draft" || row.status === "Rejected"

  // ``canOverride`` is the "admin or manager" authority — admins can edit
  // anything; non-admin viewers can act like admins on their reports'
  // targets (the server mirrors this rule via the hierarchy guard). Rows
  // visible to a non-admin are already scoped to self + subtree, so
  // "visible AND not self" is a safe proxy for "actor manages this subject".
  const isSelfTarget = row.user.id === actorId
  const canOverride = isAdminLike || !isSelfTarget

  // Amend applies to Approved and Pending rows the actor can override —
  // one dialog, same semantics (status lands as Approved with actor as
  // reviewer; Pending edit = approve-with-changes).
  const canAmendThis = canOverride && (isApproved || isPending) && !isPriorFy
  const canEditThis = isDraftOrRejected && !isPriorFy
  // Review (approve / reject) buttons: visible on any Pending row whose
  // subject isn't the actor themselves — nobody can approve their own
  // target, so hiding the buttons avoids a guaranteed 403. The server
  // also enforces the admin-or-manager rule for anyone else.
  const canReviewThis = canApprove && isPending && !isSelfTarget
  const canDiscardThis = isDraftOrRejected && !isPriorFy
  // Bifurcation is always surfaced on current-FY rows — the dialog opens
  // in read-only mode when the current viewer can't edit at this status.
  //  * Draft / Rejected: editable by hierarchy writer + admin.
  //  * PendingApproval: view-only for non-admin; admin can override.
  //  * Approved: view-only for non-admin; admin can amend.
  //  * Prior-FY: hide (closed books, nothing to configure here).
  const canBifurcateThis = !isPriorFy
  const bifurcationIsViewOnly =
    isPending && !isAdminLike
      ? true
      : isApproved && !isAdminLike
        ? true
        : false

  return (
    <div className="flex justify-end gap-2">
      {canReviewThis ? (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction(row, "approve")}
          >
            {S.dialog.actions.approve}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction(row, "reject")}
          >
            {S.dialog.actions.reject}
          </Button>
        </>
      ) : null}
      {canAmendThis ? (
        <Button size="sm" variant="outline" onClick={() => onAmend(row)}>
          {S.page.cta.amend}
        </Button>
      ) : null}
      {canEditThis ? (
        <Button size="sm" variant="outline" onClick={() => onEdit(row)}>
          {S.page.cta.edit}
        </Button>
      ) : null}
      {canBifurcateThis ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onBifurcate(row, bifurcationIsViewOnly)}
        >
          {bifurcationIsViewOnly
            ? S.page.cta.viewBifurcation
            : S.page.cta.bifurcate}
        </Button>
      ) : null}
      {canDiscardThis ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAction(row, "discard")}
        >
          {S.page.cta.discard}
        </Button>
      ) : null}
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────

function currentFyStartYear(): number {
  const now = new Date()
  const month = now.getUTCMonth() + 1
  const year = now.getUTCFullYear()
  return month >= 4 ? year : year - 1
}

function resolveReviewerLabel(row: UserSalesTarget): string {
  if (!row.reviewed_by) return S.table.noReviewer
  // Auto-approved rows are stamped with `reviewed_by === created_by` so
  // compliance queries can distinguish them from human approvals.
  if (
    row.status === "Approved" &&
    row.reviewed_by.id === row.created_by.id
  ) {
    return S.table.autoReviewer(row.reviewed_by.name)
  }
  return row.reviewed_by.name
}
