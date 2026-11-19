import { useEffect, useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Typography } from "@/components/ui/typography"
import { Skeleton } from "@/components/ui/skeleton"
import { FieldError } from "@/components/common/forms/FieldError"
import { cn } from "@/lib/utils"
import { ApiError } from "@/shared/api/envelope"

import type {
  ApprovalScope,
  CategoryApproverReplaceItem,
  CategoryApproverWire,
  EligibleApproverWire,
} from "../../api/category-approvers"
import {
  useCategoryApprovers,
  useEligibleApprovers,
  useReplaceCategoryApprovers,
} from "../../hooks/category-approvers/useCategoryApprovers"
import { CATEGORY_APPROVERS_STRINGS } from "./category-approvers.strings"

const CODE_DUPLICATE_USER = "APPROVER_DUPLICATE_USER"
const CODE_CONCURRENT_WRITE = "APPROVER_CONCURRENT_WRITE"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryId: string
  scope: ApprovalScope
  /** The row being edited. */
  approver: CategoryApproverWire
  /** Fired after a successful save, before the dialog closes. */
  onSaved?: () => void
}

export function EditApproverDialog({
  open,
  onOpenChange,
  categoryId,
  scope,
  approver,
  onSaved,
}: Props) {
  const S = CATEGORY_APPROVERS_STRINGS
  const strings = S.editDialog
  const dialogStrings = S.dialog

  const [userId, setUserId] = useState<string>(approver.user_id)
  const [threshold, setThreshold] = useState<string>(approver.threshold)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)

  // Re-seed when a different row is opened or when the dialog is reopened —
  // state is cleared on close so a stale half-edit from a prior open never
  // leaks into the next row's edit.
  useEffect(() => {
    if (!open) return
    setUserId(approver.user_id)
    setThreshold(approver.threshold)
    setError(null)
    setFieldError(null)
  }, [open, approver.id, approver.user_id, approver.threshold])

  // Load the full set so Save can send a replace payload that keeps every
  // other row intact. Only the ONE row being edited is modified.
  const currentQuery = useCategoryApprovers(categoryId, scope, { enabled: open })
  const currentApprovers = currentQuery.data?.approvers ?? []

  const eligibleQuery = useEligibleApprovers(scope, { enabled: open })
  const eligibleUsers = eligibleQuery.data?.users ?? []

  // User ids already picked on OTHER rows — hidden from the picker so the FE
  // never submits duplicates. The current approver's own user stays visible.
  const pickedByOthers = useMemo(() => {
    const s = new Set<string>()
    for (const a of currentApprovers) if (a.id !== approver.id) s.add(a.user_id)
    return s
  }, [currentApprovers, approver.id])

  const activeUser = eligibleUsers.find((u) => u.user_id === userId)
  const selectable = eligibleUsers.filter(
    (u) => u.user_id === userId || !pickedByOthers.has(u.user_id),
  )

  const replace = useReplaceCategoryApprovers(categoryId, scope)

  const handleSave = async () => {
    setError(null)
    setFieldError(null)

    const n = threshold.trim() === "" ? 0 : Number(threshold)
    if (!Number.isFinite(n) || n < 0) {
      setFieldError(dialogStrings.invalidThreshold)
      return
    }
    if (!userId) {
      setFieldError(dialogStrings.duplicateApprover)
      return
    }

    // Build the replace payload: every current row preserved, with the one
    // being edited swapped for the new (userId, threshold).
    const payload: CategoryApproverReplaceItem[] = currentApprovers.map((a) =>
      a.id === approver.id
        ? { user_id: userId, threshold: n.toFixed(2) }
        : { user_id: a.user_id, threshold: a.threshold },
    )

    try {
      await replace.mutateAsync({ approvers: payload })
      onSaved?.()
      onOpenChange(false)
    } catch (err) {
      const apiError = err instanceof ApiError ? err : null
      if (apiError?.businessCode === CODE_DUPLICATE_USER) {
        setFieldError(dialogStrings.duplicateApprover)
        return
      }
      if (apiError?.businessCode === CODE_CONCURRENT_WRITE) {
        setError(err instanceof Error ? err.message : strings.saveFailed)
        void currentQuery.refetch()
        return
      }
      setError(err instanceof Error && err.message ? err.message : strings.saveFailed)
    }
  }

  const isLoading = currentQuery.isLoading || eligibleQuery.isLoading
  const isSaving = replace.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{strings.title}</DialogTitle>
          <DialogDescription>{strings.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <Typography variant="helper" tone="muted">
                  {dialogStrings.userPickerLabel}
                </Typography>
                <ApproverPickerDropdown
                  value={userId}
                  selectable={selectable}
                  activeUser={activeUser}
                  strings={dialogStrings}
                  invalid={Boolean(fieldError)}
                  onChange={(v) => {
                    setUserId(v)
                    setFieldError(null)
                  }}
                />
              </div>

              <div className="space-y-1">
                <Typography variant="helper" tone="muted">
                  {dialogStrings.thresholdLabel}
                </Typography>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  inputMode="decimal"
                  value={threshold}
                  placeholder={dialogStrings.thresholdPlaceholder}
                  onChange={(e) => {
                    setThreshold(e.target.value)
                    setFieldError(null)
                  }}
                />
                <Typography variant="helper" tone="muted">
                  {dialogStrings.thresholdHelper}
                </Typography>
              </div>

              {fieldError && <FieldError message={fieldError} />}
            </>
          )}

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive-soft px-3 py-2">
              <Typography variant="body-strong" tone="danger">
                {strings.errorHeading}
              </Typography>
              <Typography variant="helper" tone="danger">
                {error}
              </Typography>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {strings.cancelButton}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading || !userId}
          >
            {isSaving ? strings.savingButton : strings.saveButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ApproverPickerProps {
  value: string | null
  selectable: EligibleApproverWire[]
  activeUser: EligibleApproverWire | undefined
  strings: typeof CATEGORY_APPROVERS_STRINGS.dialog
  invalid?: boolean
  onChange: (userId: string) => void
}

function ApproverPickerDropdown({
  value,
  selectable,
  activeUser,
  strings,
  invalid = false,
  onChange,
}: ApproverPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return selectable
    return selectable.filter(
      (u) =>
        u.user_name.toLowerCase().includes(q) ||
        (u.user_role && u.user_role.toLowerCase().includes(q)),
    )
  }, [selectable, search])

  function pick(userId: string) {
    onChange(userId)
    setOpen(false)
    setSearch("")
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setSearch("")
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className={cn(
          "flex h-10 w-full items-center justify-between gap-1.5 rounded-[7px] border border-input bg-card",
          "py-0 pl-[10px] pr-[10px] text-[13.5px] whitespace-nowrap transition-colors",
          "outline-none select-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring",
          "data-[popup-open]:border-primary",
          invalid && "border-destructive",
        )}
        aria-invalid={invalid}
      >
        {activeUser ? (
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate">{activeUser.user_name}</span>
            {activeUser.is_superuser && (
              <Typography
                variant="badge"
                tone="muted"
                className="shrink-0 rounded bg-muted px-1.5 py-0.5"
              >
                {strings.superuserBadge}
              </Typography>
            )}
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">
            {strings.userPickerPlaceholder}
          </span>
        )}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground opacity-50 transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </PopoverTrigger>
      <PopoverContent
        className="min-w-[var(--anchor-width)] max-w-[calc(100vw-1.5rem)] p-0"
        align="start"
      >
        <div className="border-b border-border p-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={strings.searchPlaceholder}
            className="h-8 text-sm"
            autoFocus
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <Typography asChild variant="helper" align="center">
              <div className="px-2 py-5">{strings.searchNoResults}</div>
            </Typography>
          ) : (
            filtered.map((u) => (
              <button
                key={u.user_id}
                type="button"
                onClick={() => pick(u.user_id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                  value === u.user_id && "bg-accent font-medium text-accent-foreground",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{u.user_name}</span>
                {u.user_role && (
                  <Typography variant="caption" tone="muted" className="shrink-0">
                    · {u.user_role}
                  </Typography>
                )}
                {u.is_superuser && (
                  <Typography
                    variant="badge"
                    tone="muted"
                    className="shrink-0 rounded bg-muted px-1.5 py-0.5"
                  >
                    {strings.superuserBadge}
                  </Typography>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
