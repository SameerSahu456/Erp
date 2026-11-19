import * as React from "react"
import { UI } from "@/shared/constants"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Pencil, Plus, Star, Trash2 } from "lucide-react"
import { toast } from "sonner"

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

import { addContactAccountLink, removeContactAccountLink } from "../api"
import { useAccountContacts } from "../hooks/accounts/useAccounts"
import { useContactOptions } from "../hooks/contacts/useContacts"
import { ContactFormDialog } from "./ContactFormDialog"
import { ACCOUNT_CONTACTS_STRINGS as S } from "./account-contacts.strings"

interface AccountContactsEditorProps {
  accountId: string
  // The form owns the staged primary choice; the editor reports clicks up so
  // the promote API call fires on form Save (not on every star click).
  onPrimaryStaged?: (contactId: string) => void
}

// Edit-mode contacts manager. Link/unlink hit the contact-rooted endpoints
// immediately (PATCH /accounts can't carry contacts). The primary star is
// STAGED — selecting one clears the others locally and the actual promote
// runs when the parent form is saved. Mirrors AccountDocumentsSection's
// list + per-row-action pattern.
export function AccountContactsEditor({
  accountId,
  onPrimaryStaged,
}: AccountContactsEditorProps) {
  const qc = useQueryClient()
  const listQuery = useAccountContacts(accountId)
  const contacts = listQuery.data?.items ?? []

  const [addOpen, setAddOpen] = React.useState(false)
  // null → add flow; a linked contact → edit it in the inline dialog.
  const [editingContact, setEditingContact] = React.useState<
    (typeof contacts)[number] | null
  >(null)

  // Current primary as the server sees it (for this account). The backend
  // may signal primacy via the per-account embed flag OR the contact-level
  // `primary_account_id` (the contact's primary account) — check both so the
  // star renders regardless of which the list endpoint populates.
  const serverPrimaryId = React.useMemo(
    () =>
      contacts.find(
        (c) =>
          c.primary_account_id === accountId ||
          c.accounts.some((l) => l.account_id === accountId && l.is_primary),
      )?.id ?? null,
    [contacts, accountId],
  )
  // Local override once the user clicks a star — single-select, so picking one
  // visually clears every other star immediately.
  const [stagedPrimary, setStagedPrimary] = React.useState<string | null>(null)
  const effectivePrimary = stagedPrimary ?? serverPrimaryId

  const listKey = ["crm", "contacts", "by-account", accountId]
  function invalidate() {
    void qc.invalidateQueries({ queryKey: listKey })
    void qc.invalidateQueries({ queryKey: ["crm", "accounts", "detail", accountId] })
  }

  function selectPrimary(contactId: string) {
    setStagedPrimary(contactId)
    onPrimaryStaged?.(contactId)
  }

  const linkMut = useMutation({
    mutationFn: (contactId: string) =>
      addContactAccountLink(contactId, { account_id: accountId }),
    onSuccess: () => {
      invalidate()
      toast.success(S.contactsEditor.toast.linked)
    },
    onError: (e: Error) =>
      toast.error(e.message || S.contactsEditor.toast.linkFailed),
  })

  const unlinkMut = useMutation({
    mutationFn: (contactId: string) =>
      removeContactAccountLink(contactId, accountId),
    onSuccess: () => {
      invalidate()
      toast.success(S.contactsEditor.toast.unlinked)
    },
    onError: (e: Error) =>
      toast.error(e.message || S.contactsEditor.toast.unlinkFailed),
  })

  if (listQuery.isLoading) {
    return (
      <Typography variant="helper" tone="muted">
        {S.contactsEditor.loading}
      </Typography>
    )
  }
  if (listQuery.isError) {
    return (
      <LoadErrorState
        error={listQuery.error}
        fallback={S.contactsEditor.loadError}
        compact
      />
    )
  }

  return (
    <div className="space-y-3">
      {contacts.length > 0 ? (
        <ul className="space-y-2">
          {contacts.map((c) => {
            const isPrimary = effectivePrimary === c.id
            return (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-md border border-input bg-background px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => selectPrimary(c.id)}
                  title={
                    isPrimary
                      ? S.contactsEditor.primary
                      : S.contactsEditor.setPrimary
                  }
                  aria-label={
                    isPrimary
                      ? S.contactsEditor.primary
                      : S.contactsEditor.setPrimary
                  }
                  className="shrink-0 rounded p-0.5 hover:bg-accent"
                >
                  <Star
                    className={cn(
                      "size-4",
                      isPrimary
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground",
                    )}
                  />
                </button>
                <div className="min-w-0">
                  <Typography variant="body" className="truncate">
                    {c.name}
                  </Typography>
                  <Typography variant="helper" tone="muted" className="truncate">
                    {[c.designation, c.email, c.phone].filter(Boolean).join(" · ") ||
                      "—"}
                  </Typography>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setEditingContact(c)
                    setAddOpen(true)
                  }}
                  title={S.contactsEditor.editContact}
                  aria-label={S.contactsEditor.editAria(c.name)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={unlinkMut.isPending}
                  onClick={() => {
                    // An account must always keep at least one contact — block
                    // unlinking the only remaining one.
                    if (contacts.length <= 1) {
                      toast.error(S.contactsEditor.lastContactBlocked)
                      return
                    }
                    if (window.confirm(S.contactsEditor.unlinkConfirm(c.name))) {
                      unlinkMut.mutate(c.id)
                    }
                  }}
                  title={S.contactsEditor.unlink}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
            )
          })}
        </ul>
      ) : (
        <Typography variant="helper" tone="muted">
          {S.contactsEditor.empty}
        </Typography>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <LinkExistingContact
          disabled={linkMut.isPending}
          onPick={(contactId) => linkMut.mutate(contactId)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingContact(null)
            setAddOpen(true)
          }}
        >
          <Plus className="size-3.5" />
          {S.contactsEditor.addNewContact}
        </Button>
      </div>

      <ContactFormDialog
        mode="persist"
        open={addOpen}
        onOpenChange={(next) => {
          setAddOpen(next)
          if (!next) setEditingContact(null)
        }}
        accountId={accountId}
        contact={editingContact}
        onCreated={() => {
          invalidate()
          setAddOpen(false)
        }}
      />
    </div>
  )
}

function LinkExistingContact({
  onPick,
  disabled,
}: {
  onPick: (contactId: string) => void
  disabled?: boolean
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
        disabled={disabled}
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
              {flatItems.length === 0 && !query.isLoading ? (
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
                    onPick(c.id)
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
