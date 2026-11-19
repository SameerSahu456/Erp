import * as React from "react"
import { Pencil, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Popover } from "@/components/ui/popover"
import { PopoverSelectTrigger } from "@/components/ui/popover-select-trigger"

import { useContact, useContactOptions } from "../../hooks/contacts/useContacts"
import { ContactFormDialog } from "../ContactFormDialog"
import { InfiniteScrollPickerContent } from "../shared/InfiniteScrollPickerContent"
import { DEALS_STRINGS } from "./deals.strings"

interface DealContactSelectProps {
  /** Contact id, or null when no contact is selected. */
  value: string | null
  onValueChange: (id: string | null) => void
  // When set, scopes the contact list to those linked to this account.
  // The form clears the selection when accountId changes (see DealFormPage).
  accountId?: string
  placeholder?: string
  disabled?: boolean
}

// Single-select async combobox over GET /contacts. Paginated +
// IntersectionObserver scroll-to-load-more + debounced search per §16.11.
// Filtered by `accountId` when supplied so users only see contacts already
// linked to the selected account. Component owns label resolution: it pins
// the saved selection into the dropdown if it doesn't appear in the loaded
// pages, and resolves the trigger label from a single GET when needed.
export function DealContactSelect({
  value,
  onValueChange,
  accountId,
  placeholder = DEALS_STRINGS.picker.contactPlaceholder,
  disabled,
}: DealContactSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [rawSearch, setRawSearch] = React.useState("")
  // Inline "add/edit contact" dialog — self-hosted (we already have
  // `accountId`). `editingContact` is null for the add flow, or the row being
  // edited for the edit flow.
  const [addOpen, setAddOpen] = React.useState(false)
  const [editingContact, setEditingContact] = React.useState<
    (typeof items)[number] | null
  >(null)

  // Pre-fetch when an account is selected and no contact is picked yet, so
  // the auto-select-single-option effect below can fire before the user
  // opens the popover. Once a value exists OR the popover is open, the
  // query stays enabled normally.
  const shouldPrefetch = !!accountId && value == null
  const query = useContactOptions(rawSearch, {
    accountId,
    status: "Active",
    enabled: open || shouldPrefetch,
  })
  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = query

  const rawItems = React.useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.items),
    [data?.pages],
  )

  // Always resolve the selected contact through its detail query. The list
  // (options) query is disabled while the popover is closed, so an inline edit
  // can't refresh the row there — but useUpdateContact writes the fresh contact
  // straight into this detail cache, so preferring it makes the edited name
  // show in the trigger immediately (no reopen needed).
  // Resolve the saved selection's label with the access-gate bypass (display
  // only) so a previously-linked contact the viewer can't otherwise access
  // still renders its name in the trigger. Mirrors DealAccountSelect.
  const valueDetailQuery = useContact(value ?? null, { bypassAccess: true })

  const items = React.useMemo(() => {
    const seen = new Set<string>()
    const out: typeof rawItems = []
    if (value && valueDetailQuery.data?.id === value) {
      out.push(valueDetailQuery.data as (typeof rawItems)[number])
      seen.add(value)
    }
    for (const item of rawItems) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      out.push(item)
    }
    return out
  }, [value, valueDetailQuery.data, rawItems])

  const selectedItem = items.find((i) => i.id === value) ?? null

  // Auto-select a sensible default contact once an account is chosen. Priority:
  //   1. the contact whose PRIMARY account is the selected account (first such
  //      when several share it), then
  //   2. the lone contact when the account has exactly one linked.
  // Guarded by an account-scoped ref so we don't re-fire if the user later
  // clears the selection (re-selecting would feel like a bug). Only triggers on
  // the unfiltered first page: a search narrowing to one match shouldn't
  // silently commit a pick.
  const autoSelectedForAccountRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!accountId || value != null) return
    if (rawSearch.trim() !== "") return
    if (query.isLoading || query.isError) return
    if (autoSelectedForAccountRef.current === accountId) return
    const firstPage = query.data?.pages[0]
    if (!firstPage) return
    const primaryMatch = firstPage.items.find(
      (c) => c.primary_account_id === accountId,
    )
    const lone =
      firstPage.total === 1 && firstPage.items.length === 1
        ? firstPage.items[0]
        : undefined
    const pick = primaryMatch ?? lone
    if (!pick) return
    autoSelectedForAccountRef.current = accountId
    onValueChange(pick.id)
  }, [
    accountId,
    value,
    rawSearch,
    query.isLoading,
    query.isError,
    query.data?.pages,
    onValueChange,
  ])
  // Reset the auto-select memo when the account flips so the next account
  // with a single contact also auto-selects.
  React.useEffect(() => {
    if (autoSelectedForAccountRef.current !== accountId) {
      autoSelectedForAccountRef.current = null
    }
  }, [accountId])

  function pick(id: string) {
    onValueChange(id)
    setOpen(false)
    setRawSearch("")
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onValueChange(null)
  }

  const triggerText = selectedItem?.name
    ? selectedItem.name
    : value
      ? DEALS_STRINGS.picker.loading
      : accountId
        ? placeholder
        : DEALS_STRINGS.picker.contactSelectAccountFirst

  const effectiveDisabled = disabled || !accountId

  return (
    <Popover
      open={open}
      onOpenChange={(next) => !effectiveDisabled && setOpen(next)}
    >
      <PopoverSelectTrigger
        hasValue={!!value}
        onClear={clear}
        disabled={effectiveDisabled}
        clearLabel={DEALS_STRINGS.picker.contactClear}
      >
        {triggerText}
      </PopoverSelectTrigger>
      <InfiniteScrollPickerContent
        search={{ value: rawSearch, onChange: setRawSearch, placeholder: DEALS_STRINGS.picker.contactSearch }}
        query={{ isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage }}
        items={items}
        errorText={DEALS_STRINGS.picker.contactError}
        renderItem={(item) => (
          <div
            className={cn(
              "group/contact-row flex items-center rounded-sm pr-1 hover:bg-accent",
              // Selection shown by a tinted background, not a check icon.
              value === item.id && "bg-accent font-medium text-accent-foreground",
            )}
          >
            <button
              type="button"
              onClick={() => pick(item.id)}
              className="flex min-w-0 flex-1 items-center rounded-sm px-2 py-1.5 text-left text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate">{item.name}</div>
                <div className="truncate text-[10.5px] text-muted-foreground">
                  {item.email ?? item.phone ?? ""}
                </div>
              </div>
            </button>
            {/* Edit the contact in place, then re-select it. Hidden
                until the row is hovered/focused to keep the list calm. */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setEditingContact(item)
                setOpen(false)
                setAddOpen(true)
              }}
              className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus:opacity-100 group-hover/contact-row:opacity-100"
              aria-label={DEALS_STRINGS.picker.editContact(item.name)}
            >
              <Pencil className="size-3.5" />
            </button>
          </div>
        )}
        footer={
          accountId && (
            <div className="border-t border-border p-1">
              <button
                type="button"
                onClick={() => {
                  setEditingContact(null)
                  setOpen(false)
                  setAddOpen(true)
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm font-medium text-primary hover:bg-accent"
              >
                <Plus className="size-4" />
                {DEALS_STRINGS.picker.addNewContact}
              </button>
            </div>
          )
        }
      />
      {/* Rendered as a sibling of the popup (not inside it) so it survives the
          popover closing when the user clicks "Add new contact". */}
      {accountId && (
        <ContactFormDialog
          mode="persist"
          open={addOpen}
          onOpenChange={(next) => {
            setAddOpen(next)
            // Clear edit mode on close so the next "Add new contact" opens blank.
            if (!next) setEditingContact(null)
          }}
          accountId={accountId}
          contact={editingContact}
          onCreated={(contact) => pick(contact.id)}
        />
      )}
    </Popover>
  )
}
