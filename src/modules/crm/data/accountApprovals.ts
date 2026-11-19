/**
 * Types for the Accounts → Approval tab row + review dialog.
 *
 * `useAccountApprovals` fetches `GET /crm/accounts/pending-approvals` and maps
 * each `PendingApprovalListItem` into this shape (see `toApprovalRow`). The
 * fields mirror what that slim endpoint returns — clicking a row opens the full
 * detail page for everything else.
 */
import type { AccountTypeWire } from "../api"

export type AccountApprovalDecision = "Approved" | "Rejected"

/** A pending account-creation request awaiting an approver's decision. */
export interface AccountApproval {
  id: string
  code: string
  name: string
  /** Parent = top-level company; Child = sub-account under a parent. */
  entityType: "Parent" | "Child"
  industry: string
  /** The account's channel classification — rendered in the "Type" column. */
  accountType: AccountTypeWire
  /** Submitter display name (embedded `created_by.name` from the API). */
  submittedBy: string
  /** UTC ISO-8601 — rendered in IST via `formatIST`. */
  submittedAt: string
}

/** Badge variant per channel classification, shared by the table + dialog. */
export const ACCOUNT_TYPE_BADGE_VARIANT: Record<
  AccountTypeWire,
  "primary-soft" | "success-soft" | "info" | "grey-soft"
> = {
  "Channel Partner": "primary-soft",
  "End Customer": "success-soft",
  "Cloud / Data Center": "info",
  "End User": "grey-soft",
}
