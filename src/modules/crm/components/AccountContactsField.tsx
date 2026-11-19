import * as React from "react"
import { UI } from "@/shared/constants"
import { Pencil, Plus, X, Star } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Typography } from "@/components/ui/typography"
import { useInfiniteDropdownLoader } from "@/shared/hooks"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import { useContactOptions } from "../hooks/contacts/useContacts"
import type { AccountInlineContactPayload, ContactStatus } from "../api"
import { ACCOUNT_CONTACTS_STRINGS as S } from "./account-contacts.strings"
import { ContactFormDialog } from "./ContactFormDialog"

// One row the user is staging to attach at create time. Richer than the
// wire payload so we can render a label for linked contacts; projected to
// `AccountInlineContactPayload` on every change via `onChange`.
type LocalRow =
  | {
      key: string
      kind: "link"
      contactId: string
      label: string
      isPrimary: boolean
    }
  | {
      key: string
      kind: "new"
      name: string
      email: string
      phone: string
      designation: string
      department: string
      status: ContactStatus
      isPrimary: boolean
    }

interface AccountContactsFieldProps {
  value: AccountInlineContactPayload[]
  onChange: (next: AccountInlineContactPayload[]) => void
  error?: string
}

let _rowSeq = 0
function nextKey(): string {
  _rowSeq += 1
  return `acct-contact-${_rowSeq}`
}

function toPayload(rows: LocalRow[]): AccountInlineContactPayload[] {
  return rows.map((r) => {
    if (r.kind === "link") {
      return { contact_id: r.contactId, is_primary: r.isPrimary }
    }
    return {
      name: r.name.trim(),
      email: r.email.trim() || undefined,
      phone: r.phone.trim() || undefined,
      designation: r.designation.trim() || undefined,
      department: r.department.trim() || undefined,
      status: r.status,
      is_primary: r.isPrimary,
    }
  })
}

// Create-mode contacts staging. Lets the user link existing contacts and/or
// create new ones to attach in the same atomic POST /accounts call. No API
// calls here — the account doesn't exist yet; rows ride along in the payload.
export function AccountContactsField({
  onChange,
  error,
}: AccountContactsFieldProps) {
  // Component owns the staged rows; the parent consumes them via `onChange`
  // (the `value` prop exists for API symmetry but isn't read back in).
  const [rows, setRows] = React.useState<LocalRow[]>([])

  // Keep the parent payload in sync whenever rows change.
  function commit(next: LocalRow[]) {
    setRows(next)
    onChange(toPayload(next))
  }

  function setPrimary(key: string) {
    commit(rows.map((r) => ({ ...r, isPrimary: r.key === key })))
  }

  function removeRow(key: string) {
    commit(rows.filter((r) => r.key !== key))
  }

  function addLink(contactId: string, label: string) {
    if (rows.some((r) => r.kind === "link" && r.contactId === contactId)) return
    commit([
      ...rows,
      { key: nextKey(), kind: "link", contactId, label, isPrimary: false },
    ])
  }

  function addNew(row: Omit<Extract<LocalRow, { kind: "new" }>, "key" | "kind" | "isPrimary">) {
    commit([
      ...rows,
      { key: nextKey(), kind: "new", isPrimary: false, ...row },
    ])
  }

  // Replace an already-staged "new" row in place (edit flow). The account
  // doesn't exist yet, so this is a local edit only — no API call.
  function updateNew(
    key: string,
    row: Omit<Extract<LocalRow, { kind: "new" }>, "key" | "kind" | "isPrimary">,
  ) {
    commit(
      rows.map((r) =>
        r.key === key && r.kind === "new" ? { ...r, ...row } : r,
      ),
    )
  }

  // Controlled new-contact dialog: null → add a fresh row; a row → edit it.
  const [contactDialogOpen, setContactDialogOpen] = React.useState(false)
  const [editingRow, setEditingRow] = React.useState<
    Extract<LocalRow, { kind: "new" }> | null
  >(null)

  return (
    <div className="space-y-3">
      {rows.length > 0 ? (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.key}
              className="flex items-center justify-between gap-3 rounded-md border border-input bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <Typography variant="body" className="truncate">
                  {r.kind === "link"
                    ? r.label
                    : r.name || S.contactsField.unnamedContact}
                </Typography>
                <Typography variant="helper" tone="muted">
                  {r.kind === "link"
                    ? S.contactsField.existingContact
                    : S.contactsField.newContact}
                  {r.kind === "new" && r.email ? ` · ${r.email}` : ""}
                  {r.kind === "new" && !r.email && r.phone ? ` · ${r.phone}` : ""}
                </Typography>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant={r.isPrimary ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPrimary(r.key)}
                  title={S.contactsField.markPrimary}
                >
                  <Star
                    className={cn("size-3.5", r.isPrimary && "fill-current")}
                  />
                  {S.contactsField.primary}
                </Button>
                {r.kind === "new" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setEditingRow(r)
                      setContactDialogOpen(true)
                    }}
                    title={S.contactsField.editContact}
                    aria-label={S.contactsField.editAria(r.name)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeRow(r.key)}
                  title={S.contactsField.remove}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <ExistingContactPicker onPick={addLink} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingRow(null)
            setContactDialogOpen(true)
          }}
        >
          <Plus className="size-3.5" />
          {S.contactsField.addNewContact}
        </Button>
      </div>

      <ContactFormDialog
        mode="stage"
        open={contactDialogOpen}
        onOpenChange={(next) => {
          setContactDialogOpen(next)
          if (!next) setEditingRow(null)
        }}
        initial={
          editingRow
            ? {
                name: editingRow.name,
                email: editingRow.email,
                phone: editingRow.phone,
                designation: editingRow.designation,
                department: editingRow.department,
                status: editingRow.status,
              }
            : null
        }
        onSubmit={(row) => {
          if (editingRow) updateNew(editingRow.key, row)
          else addNew(row)
        }}
      />

      {error ? (
        <Typography variant="helper" tone="danger">
          {error}
        </Typography>
      ) : null}
    </div>
  )
}

// ── Existing-contact picker as a modal dialog ──
function ExistingContactPicker({
  onPick,
}: {
  onPick: (contactId: string, label: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [rawSearch, setRawSearch] = React.useState("")
  const [scrollerNode, setScrollerNode] = React.useState<HTMLDivElement | null>(null)
  const [sentinelNode, setSentinelNode] = React.useState<HTMLDivElement | null>(null)

  const query = useContactOptions(rawSearch, { status: "Active", enabled: open })
  const flatItems = React.useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  )
  const { onScroll, onWheel } = useInfiniteDropdownLoader({
    open,
    scrollerNode,
    sentinelNode,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    loadedCount: flatItems.length,
  })

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-3.5" />
        {S.picker.linkExisting}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) setRawSearch("")
        }}
      >
        <DialogContent className="overflow-x-hidden sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{S.picker.title}</DialogTitle>
          </DialogHeader>
          {/* min-w-0: DialogContent is a CSS grid, so this grid item would
              otherwise keep min-width:auto and overflow the dialog's max-w,
              giving the whole modal a horizontal scrollbar. See CLAUDE.md §8.7. */}
          <div className="min-w-0 space-y-2">
            <Input
              autoFocus
              placeholder={S.picker.searchPlaceholder}
              maxLength={UI.FILTER_SEARCH_MAX_LENGTH}
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              className="h-9"
            />
            <div
              ref={setScrollerNode}
              onScroll={onScroll}
              onWheel={onWheel}
              className="max-h-80 overflow-x-hidden overflow-y-auto rounded-md border p-1"
            >
              {query.isError ? (
                <LoadErrorState
                  error={query.error}
                  fallback={S.picker.loadError}
                  compact
                />
              ) : flatItems.length === 0 && !query.isLoading ? (
                <Typography
                  variant="helper"
                  tone="muted"
                  className="px-2 py-4 text-center"
                >
                  {S.picker.noResults}
                </Typography>
              ) : null}
              {flatItems.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onPick(c.id, c.name)
                    setOpen(false)
                    setRawSearch("")
                  }}
                  className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  {c.email ? (
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      {c.email}
                    </span>
                  ) : null}
                </button>
              ))}
              <div ref={setSentinelNode} className="h-1" />
              {query.isFetchingNextPage ? (
                <Typography
                  variant="helper"
                  tone="muted"
                  className="px-2 py-2 text-center"
                >
                  {S.picker.loadingMore}
                </Typography>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {S.picker.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
