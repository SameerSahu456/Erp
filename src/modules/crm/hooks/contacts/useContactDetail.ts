import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { findOrphanedAccounts } from "../../lib/contactAccountGuard"
import { CONTACTS_STRINGS } from "../../components/contacts/contacts.strings"
import { useContact, useDeleteContact } from "./useContacts"

// Container logic for the Contact detail page: the contact query, linked-account
// derivations, and the delete flow.
export function useContactDetail() {
  const { id: contactId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const {
    data: contact,
    isLoading,
    isError,
    error,
  } = useContact(contactId)

  // Primary linked account drives the "Account" row in Contact
  // Information. The right-rail card lists every linked account so a
  // user can pivot to any of them from this page.
  const primaryAccount =
    contact?.accounts.find((a) => a.is_primary) ?? contact?.accounts[0] ?? null
  const linkedAccounts = contact?.accounts ?? []

  const deleteMut = useDeleteContact()
  // True while we pre-check (before deleting) whether removing this contact
  // would orphan any of its accounts.
  const [isCheckingOrphans, setIsCheckingOrphans] = useState(false)

  async function handleDelete() {
    if (!contactId || !contact) return
    // Every account must keep at least one contact. Block the delete if it
    // would leave any linked account with none.
    setIsCheckingOrphans(true)
    let orphaned
    try {
      orphaned = await findOrphanedAccounts(
        contactId,
        contact.accounts.map((a) => ({
          accountId: a.account_id,
          accountName: a.account_name,
        })),
      )
    } finally {
      setIsCheckingOrphans(false)
    }
    if (orphaned.length > 0) {
      toast.error(
        CONTACTS_STRINGS.delete.lastContactBlocked(
          orphaned.map((o) => o.accountName),
        ),
      )
      setDeleteDialogOpen(false)
      return
    }
    deleteMut.mutate(contactId, {
      onSuccess: () => {
        setDeleteDialogOpen(false)
        navigate("/crm/contacts")
      },
    })
  }

  const isDeleting = deleteMut.isPending || isCheckingOrphans

  // No `last_contact_at` on the backend yet — use `updated_at` as the
  // best available proxy so the row isn't blank.
  const lastContactIso = contact?.updated_at ?? ""

  return {
    contact,
    isLoading,
    isError,
    error,
    primaryAccount,
    linkedAccounts,
    lastContactIso,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteMut,
    isDeleting,
    handleDelete,
  }
}
