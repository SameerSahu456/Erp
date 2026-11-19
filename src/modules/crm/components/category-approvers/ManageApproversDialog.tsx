import { useMemo, useState } from "react"
import { ChevronDown, Plus, Trash2 } from "lucide-react"

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
  CategoryApproverWire,
  CategoryApproverReplaceItem,
  EligibleApproverWire,
} from "../../api/category-approvers"
import {
  useCategoryApprovers,
  useEligibleApprovers,
  useReplaceCategoryApprovers,
} from "../../hooks/category-approvers/useCategoryApprovers"
import { CATEGORY_APPROVERS_STRINGS } from "./category-approvers.strings"

interface Row {
  // Local-only id so React can key rows during add/remove even before a
  // user is picked. Doesn't survive save — the backend returns its own.
  rowKey: string
  userId: string | null
  threshold: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryId: string
  scope: ApprovalScope
  /** Fired after a successful save, before the dialog closes. */
  onSaved?: () => void
}

function newRow(): Row {
  return {
    rowKey: `row-${Math.random().toString(36).slice(2, 11)}`,
    userId: null,
    threshold: "",
  }
}

// Server codes this dialog reacts to (category_approver_service.py).
const CODE_DUPLICATE_USER = "APPROVER_DUPLICATE_USER"
const CODE_CONCURRENT_WRITE = "APPROVER_CONCURRENT_WRITE"
// `approvers[<index>].user_id` — the row a server error points at.
const APPROVER_FIELD_RE = /^approvers\[(\d+)\]\.user_id$/

type RowErrors = Record<string, string>

// Row keys whose user is picked on more than one row — the first pick AND
// each repeat, so both rows of a pair are marked.
function duplicateRowKeys(rows: Row[]): string[] {
  const keysByUser = new Map<string, string[]>()
  for (const r of rows) {
    if (!r.userId) continue
    keysByUser.set(r.userId, [...(keysByUser.get(r.userId) ?? []), r.rowKey])
  }
  return [...keysByUser.values()].filter((keys) => keys.length > 1).flat()
}

function seedRowsFrom(current: CategoryApproverWire[]): Row[] {
  if (current.length === 0) return [newRow()]
  return current.map((a) => ({
    rowKey: `seed-${a.id}`,
    userId: a.user_id,
    threshold: a.threshold,
  }))
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

export function ManageApproversDialog({
  open,
  onOpenChange,
  categoryId,
  scope,
  onSaved,
}: Props) {
  const strings = CATEGORY_APPROVERS_STRINGS.dialog
  const [rows, setRows] = useState<Row[]>(() => [newRow()])
  const [error, setError] = useState<string | null>(null)
  // Per-row messages, keyed by the row's local key. Shown under that row.
  const [rowErrors, setRowErrors] = useState<RowErrors>({})

  // The dialog loads the COMPLETE approver set itself. Save is a full
  // replace, and the table behind this dialog only holds one PAGE — seeding
  // from that page would delete every approver on the other pages.
  const currentQuery = useCategoryApprovers(categoryId, scope, { enabled: open })
  const currentApprovers = currentQuery.data?.approvers
  // Seed the editable rows ONCE per open, and only from a settled fetch: a
  // cached copy may be stale, and a background refetch landing mid-edit must
  // not wipe what the user has typed. Adjusted during render (not in an
  // effect) so the first painted frame after the load already has the rows.
  const [seeded, setSeeded] = useState(false)
  const currentSettled = currentQuery.isSuccess && !currentQuery.isFetching
  if (!open && seeded) {
    // Closing drops every message, so a reopen starts clean.
    setSeeded(false)
    setError(null)
    setRowErrors({})
  } else if (open && !seeded && currentSettled) {
    // `error` is deliberately kept: a concurrent-write failure reseeds from
    // the fresh set and its message must stay on screen.
    setRows(seedRowsFrom(currentApprovers ?? []))
    setRowErrors({})
    setSeeded(true)
  }

  const eligibleQuery = useEligibleApprovers(scope, { enabled: open })
  const eligibleUsers = eligibleQuery.data?.users ?? []
  const replace = useReplaceCategoryApprovers(categoryId, scope)

  // User ids already picked across any row — hides them in sibling
  // dropdowns so the FE never submits duplicates.
  const pickedIds = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) if (r.userId) s.add(r.userId)
    return s
  }, [rows])

  const updateRow = (rowKey: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.rowKey === rowKey ? { ...r, ...patch } : r)))
    // A duplicate is a property of a PAIR of rows — changing either one's
    // user resolves both, so clear them all rather than just this row.
    if ("userId" in patch) setRowErrors({})
  }

  const removeRow = (rowKey: string) => {
    setRows((prev) => (prev.length === 1 ? [newRow()] : prev.filter((r) => r.rowKey !== rowKey)))
    setRowErrors({})
  }

  const addRow = () => setRows((prev) => [...prev, newRow()])

  const handleSave = async () => {
    setError(null)
    setRowErrors({})

    // One approver at most once per category per approval type. The pickers
    // already hide a taken user, so this only fires if a duplicate slipped
    // in another way — but it must never reach the server unannounced.
    const duplicates = duplicateRowKeys(rows)
    if (duplicates.length > 0) {
      setRowErrors(
        Object.fromEntries(duplicates.map((key) => [key, strings.duplicateApprover])),
      )
      return
    }

    // Every row must have a user selected — dropping rows silently would
    // cause admins to think their approver was saved when it wasn't.
    const missingUser = rows.filter((r) => !r.userId)
    if (missingUser.length > 0) {
      setRowErrors(
        Object.fromEntries(missingUser.map((r) => [r.rowKey, strings.userRequired])),
      )
      return
    }

    // `payloadRowKeys[i]` is the row behind `payload[i]`, so a server error
    // on `approvers[i]` can be shown on the right row. Empty-string threshold
    // becomes 0 (every line needs review).
    const payload: CategoryApproverReplaceItem[] = []
    const payloadRowKeys: string[] = []
    for (const r of rows) {
      const n = r.threshold.trim() === "" ? 0 : Number(r.threshold)
      if (!Number.isFinite(n) || n < 0) {
        setRowErrors({ [r.rowKey]: strings.invalidThreshold })
        return
      }
      payload.push({ user_id: r.userId!, threshold: n.toFixed(2) })
      payloadRowKeys.push(r.rowKey)
    }

    try {
      await replace.mutateAsync({ approvers: payload })
      onSaved?.()
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : strings.saveFailed
      const apiError = err instanceof ApiError ? err : null

      if (apiError?.businessCode === CODE_DUPLICATE_USER) {
        const mapped: RowErrors = {}
        for (const detail of apiError.errors ?? []) {
          const index = APPROVER_FIELD_RE.exec(detail.field ?? "")?.[1]
          const rowKey = index == null ? undefined : payloadRowKeys[Number(index)]
          if (rowKey) mapped[rowKey] = strings.duplicateApprover
        }
        if (Object.keys(mapped).length > 0) {
          setRowErrors(mapped)
          return
        }
      }

      setError(msg)
      // Someone else saved this set in between: reload it so the rows show
      // what is actually stored, keeping the message above on screen.
      if (apiError?.businessCode === CODE_CONCURRENT_WRITE) {
        setSeeded(false)
        void currentQuery.refetch()
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{strings.title}</DialogTitle>
          <DialogDescription>{strings.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {currentQuery.isError && !seeded ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive-soft px-3 py-2">
              <Typography variant="body" tone="danger">
                {strings.loadError}
              </Typography>
              <Button variant="ghost" size="sm" onClick={() => currentQuery.refetch()}>
                {strings.retry}
              </Button>
            </div>
          ) : eligibleQuery.isLoading || !seeded ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : eligibleUsers.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-center">
              <Typography variant="body" tone="muted">
                {strings.emptyPicker}
              </Typography>
            </div>
          ) : (
            <>
              {rows.map((row) => {
                const activeUser = eligibleUsers.find((u) => u.user_id === row.userId)
                const selectable = eligibleUsers.filter(
                  (u) => u.user_id === row.userId || !pickedIds.has(u.user_id),
                )
                return (
                  <div
                    key={row.rowKey}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,160px)_auto] items-end gap-2"
                  >
                    <div className="min-w-0 space-y-1">
                      <Typography variant="helper" tone="muted">
                        {strings.userPickerLabel}
                      </Typography>
                      <ApproverPickerDropdown
                        value={row.userId}
                        selectable={selectable}
                        activeUser={activeUser}
                        strings={strings}
                        invalid={Boolean(rowErrors[row.rowKey])}
                        onChange={(v) => updateRow(row.rowKey, { userId: v })}
                      />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <Typography variant="helper" tone="muted">
                        {strings.thresholdLabel}
                      </Typography>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        inputMode="decimal"
                        value={row.threshold}
                        placeholder={strings.thresholdPlaceholder}
                        onChange={(e) => updateRow(row.rowKey, { threshold: e.target.value })}
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={strings.removeRow}
                      onClick={() => removeRow(row.rowKey)}
                      className="mb-0.5"
                    >
                      <Trash2 className="size-4" />
                    </Button>

                    {/* Row error on its own grid line: the row is bottom-
                        aligned, so a message inside a cell would push that
                        cell's input out of line with its neighbours. */}
                    {rowErrors[row.rowKey] && (
                      <FieldError
                        message={rowErrors[row.rowKey]}
                        className="col-span-full mt-0"
                      />
                    )}
                  </div>
                )
              })}

              <Typography variant="helper" tone="muted">
                {strings.thresholdHelper}
              </Typography>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
                disabled={pickedIds.size >= eligibleUsers.length}
              >
                <Plus className="mr-1 size-4" />
                {strings.addRow}
              </Button>
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
            disabled={replace.isPending}
          >
            {strings.cancelButton}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            // Never savable before the full set is loaded: an unseeded save
            // would replace every approver with an empty list.
            disabled={replace.isPending || !seeded || eligibleUsers.length === 0}
          >
            {replace.isPending ? strings.savingButton : strings.saveButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
