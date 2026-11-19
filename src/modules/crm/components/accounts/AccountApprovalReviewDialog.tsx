import { useMemo, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Loader2,
  User2,
  XCircle,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Typography } from "@/components/ui/typography"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { OverflowPillList } from "@/components/common/display/OverflowPillList"
import { formatINRCompact } from "@/lib/currency"
import { formatIST_date } from "@shared/lib/date"

import {
  useAttachments,
  downloadAttachmentBlob,
  viewAttachmentBlob,
  type AttachmentWire,
} from "@modules/attachments"

import { ACCOUNT_TYPE_BADGE_VARIANT } from "../../data/accountApprovals"
import { accountRevenueToNumber } from "../../api"
import { useUser } from "@modules/users"

import { useAccount } from "../../hooks/accounts/useAccounts"
import type { AccountApprovalsController } from "../../hooks/accounts/useAccountApprovals"

function formatFileSize(bytes?: number) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** One uploaded KYC document — only the Download button triggers the download. */
function DocumentItem({ doc }: { doc: AttachmentWire }) {
  return (
    <li className="group flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-muted/30">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
        <FileText className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <Typography variant="helper" tone="default" truncate asChild>
          <p className="font-medium">{doc.document_type}</p>
        </Typography>
        <Typography variant="caption" tone="muted" truncate asChild>
          <p>
            {doc.document_name}
            {doc.size_bytes ? ` · ${formatFileSize(doc.size_bytes)}` : ""}
          </p>
        </Typography>
      </div>
      {/* Actions reveal on row hover/focus; tight gap so the two sit together. */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="View document"
          title="View"
          onClick={() => void viewAttachmentBlob(doc)}
        >
          <Eye className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Download document"
          title="Download"
          onClick={() => void downloadAttachmentBlob(doc)}
        >
          <Download className="size-3.5" />
        </Button>
      </div>
    </li>
  )
}

/** One label/value cell in the review dialog. */
function ReviewField({ label, value }: { label: string; value?: ReactNode }) {
  const empty = value == null || value === "" || value === "—"
  return (
    <div className="min-w-0">
      <Typography variant="badge" tone="muted" className="font-semibold tracking-wider" asChild>
        <dt>{label}</dt>
      </Typography>
      <dd
        className={cn(
          "mt-0.5 break-words text-[13px]",
          empty ? "text-muted-foreground/60" : "font-medium text-foreground",
        )}
      >
        {empty ? "—" : value}
      </dd>
    </div>
  )
}

function ReviewSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <Typography
        variant="badge"
        className="text-[11px] font-semibold tracking-wider text-foreground/70"
        asChild
      >
        <h4>{title}</h4>
      </Typography>
      {children}
    </section>
  )
}

export function AccountApprovalReviewDialog({ c }: { c: AccountApprovalsController }) {
  const { review, intent, reason, setReason, closeReview, confirmApprove, confirmReject, isDeciding } = c
  const navigate = useNavigate()

  // Full account profile for the body — fetched on open (the pending-list row is
  // slim). Header + submitter strip render immediately from the row; the body
  // sections fill in once GET /accounts/{id} resolves.
  const { data: account, isLoading } = useAccount(review?.id)
  // KYC documents uploaded with the account (separate attachments store).
  const { data: documents, isLoading: docsLoading } = useAttachments(
    "crm_account",
    review?.id,
  )
  // A slot can carry replaced/older copies of the same doc type (a re-uploaded
  // PAN, etc.), so the raw list may hold several entries per type. Show only
  // the most recent per `document_type` — matching the account detail page's
  // curated slots — instead of every historical upload.
  const recentDocuments = useMemo(() => {
    const byType = new Map<string, AttachmentWire>()
    for (const d of documents ?? []) {
      const existing = byType.get(d.document_type)
      if (!existing || d.created_at > existing.created_at) {
        byType.set(d.document_type, d)
      }
    }
    return [...byType.values()]
  }, [documents])

  const entityType = account
    ? account.parent_account_id
      ? "Child"
      : "Parent"
    : review?.entityType
  const revenue = account ? accountRevenueToNumber(account.revenue) : 0
  // Primary owner name (falls back to the first owner) for the Ownership row.
  const ownerName = account
    ? (account.account_owner_ids.find((o) => o.id === account.primary_owner_id)?.name ??
      account.account_owner_ids[0]?.name)
    : undefined
  // Role of the submitter (the account's creator), fetched via the users API.
  // If the fetch fails, hasn't resolved, or the user carries no role, we render
  // nothing in its place — never an error or placeholder.
  const creatorQuery = useUser(account?.created_by ?? "")
  const creatorRoles = creatorQuery.data?.roles ?? []
  const creatorRole = creatorRoles.length > 0 ? creatorRoles.join(", ") : null

  return (
    <Dialog open={!!review} onOpenChange={(open) => { if (!open) closeReview() }}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {review && (
          <>
            {/* ── Header ── */}
            <DialogHeader className="gap-0 space-y-0 border-b bg-gradient-to-br from-muted/50 via-muted/20 to-transparent px-6 py-5">
              <div className="flex items-start gap-3.5 pr-8">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary ring-1 ring-inset ring-primary/15">
                  <Building2 className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="truncate text-[17px] leading-tight tracking-tight">
                    {review.name}
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-xs">
                    Account creation request — review and decide
                  </DialogDescription>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <StatusBadge variant="warning">Pending</StatusBadge>
                    <Badge
                      variant={entityType === "Parent" ? "primary-soft" : "secondary"}
                      size="sm"
                    >
                      {entityType}
                    </Badge>
                    <Badge variant={ACCOUNT_TYPE_BADGE_VARIANT[review.accountType]} size="sm">
                      {review.accountType}
                    </Badge>
                    <Badge variant="secondary" size="sm">
                      {review.industry}
                    </Badge>
                  </div>
                </div>
              </div>
            </DialogHeader>

            {/* ── Submitter strip ── */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-b bg-muted/15 px-6 py-2.5">
              <Typography variant="helper" tone="muted" asChild>
                <span className="inline-flex items-center gap-1.5">
                  <User2 className="size-3.5 text-muted-foreground/70" />
                  By <span className="font-medium text-foreground">{review.submittedBy}</span>
                  {creatorRole ? <span>· {creatorRole}</span> : null}
                </span>
              </Typography>
              <Typography variant="helper" tone="muted" asChild>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground/70" />
                  {formatIST_date(review.submittedAt)}
                </span>
              </Typography>
            </div>

            {/* ── Body ── */}
            <div className="max-h-[44vh] space-y-5 overflow-y-auto px-6 py-5">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading account details…
                </div>
              ) : (
                <>
                  <ReviewSection title="Company Profile">
                    <dl className="grid grid-cols-2 gap-x-5 gap-y-3.5 sm:grid-cols-3">
                      <ReviewField label="Type" value={account?.account_type} />
                      <ReviewField label="Entity Type" value={entityType} />
                      <ReviewField label="Industry" value={account?.industry} />
                      <ReviewField label="Status" value={account?.status} />
                      <ReviewField label="Company Size" value={account?.company_size} />
                      <ReviewField
                        label="Employees"
                        value={
                          account?.employees != null
                            ? account.employees.toLocaleString("en-IN")
                            : undefined
                        }
                      />
                      <ReviewField
                        label="Website"
                        value={
                          account?.website ? (
                            <a
                              href={account.website}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {account.website.replace(/^https?:\/\//, "")}
                              <ArrowUpRight className="size-3" />
                            </a>
                          ) : undefined
                        }
                      />
                    </dl>
                  </ReviewSection>

                  <div className="h-px bg-border/60" />

                  <ReviewSection title="Business & Ownership">
                    <dl className="grid grid-cols-2 gap-x-5 gap-y-3.5 sm:grid-cols-3">
                      <ReviewField
                        label="Revenue"
                        value={revenue > 0 ? formatINRCompact(revenue) : undefined}
                      />
                      <ReviewField label="Account Owner" value={ownerName} />
                      <ReviewField
                        label="Created On"
                        value={account ? formatIST_date(account.created_at) : undefined}
                      />
                    </dl>
                  </ReviewSection>

                  <div className="h-px bg-border/60" />

                  <ReviewSection title="Categories">
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                      <div>
                        <Typography variant="badge" tone="muted" className="mb-1.5 block font-semibold tracking-wider" asChild>
                          <dt>Interested</dt>
                        </Typography>
                        <OverflowPillList
                          items={account?.categories_interested ?? []}
                          getItemKey={(c) => c.id}
                          getItemLabel={(c) => c.name}
                          maxVisible={2}
                          summaryLabel="categories"
                          hoverTitle="Categories Interested"
                          className="cursor-pointer"
                        />
                      </div>
                    </div>
                  </ReviewSection>

                  <div className="h-px bg-border/60" />

                  <ReviewSection
                    title={`Documents${recentDocuments.length ? ` (${recentDocuments.length})` : ""}`}
                  >
                    {docsLoading ? (
                      <div className="flex items-center gap-2 px-1 py-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Loading documents…
                      </div>
                    ) : recentDocuments.length > 0 ? (
                      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {recentDocuments.map((doc) => (
                          <DocumentItem key={doc.id} doc={doc} />
                        ))}
                      </ul>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/10 px-3.5 py-3">
                        <FileText className="size-4 text-muted-foreground/50" />
                        <Typography variant="helper" tone="muted">
                          No documents were uploaded with this account.
                        </Typography>
                      </div>
                    )}
                  </ReviewSection>

                  <button
                    type="button"
                    onClick={() => {
                      const href = `/crm/accounts/${review.id}`
                      closeReview()
                      navigate(href)
                    }}
                    className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                  >
                    <Typography variant="helper" tone="inherit" asChild>
                      <span>Open full details page</span>
                    </Typography>
                    <ArrowUpRight className="size-3.5" />
                  </button>
                </>
              )}
            </div>

            {/* ── Decision footer ── */}
            <div className="space-y-3 border-t bg-muted/30 px-6 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="approval-reason">
                  Decision note
                  <Typography variant="helper" tone="muted" asChild>
                    <span className="ml-1.5 font-normal">
                      {intent === "Rejected" ? "— required to reject" : "— optional"}
                    </span>
                  </Typography>
                </Label>
                <Textarea
                  id="approval-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    intent === "Rejected"
                      ? "Explain why this account is being rejected…"
                      : "Add an optional note for this decision…"
                  }
                  rows={2}
                  className="max-h-40 resize-none overflow-y-auto bg-card"
                  autoFocus={intent === "Rejected"}
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={closeReview} disabled={isDeciding}>
                  Cancel
                </Button>
                {intent === "Rejected" ? (
                  <Button
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:border-destructive hover:bg-destructive-soft"
                    onClick={confirmReject}
                    disabled={isDeciding || !reason.trim()}
                  >
                    <XCircle className="mr-1.5 size-4" />
                    Reject
                  </Button>
                ) : (
                  <Button onClick={confirmApprove} disabled={isDeciding}>
                    <CheckCircle2 className="mr-1.5 size-4" />
                    Approve &amp; create
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
