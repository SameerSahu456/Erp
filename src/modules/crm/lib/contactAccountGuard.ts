import { fetchContacts } from "../api"

// Frontend safety net for the rule "every account must keep at least one
// contact". A contact is many-to-many with accounts, so deleting a contact (or
// unlinking it from an account) can leave an account with zero contacts. These
// helpers pre-check that BEFORE the destructive call so the UI can hard-block
// with a clear message. The backend stays the eventual authority once the
// server-side guard lands — see useContactDetail / useContactForm /
// AccountContactsEditor for the call sites.

export interface OrphanedAccountRef {
  accountId: string
  accountName: string
}

// `contactId` is assumed to currently be a member of each account, so a
// direct-contact count > 1 means another contact survives the unlink. We pass
// `include_descendants: false` so child-account contacts never inflate the
// count of a parent account's own contacts.
async function accountKeepsAContact(
  accountId: string,
  removedContactId: string,
): Promise<boolean> {
  const res = await fetchContacts({
    account_id: accountId,
    include_descendants: false,
    page_size: 1,
  })
  return res.total > 1 || (res.total === 1 && res.items[0]?.id !== removedContactId)
}

/**
 * Returns the accounts that would be left with ZERO contacts if `contactId`
 * were unlinked from / removed from each of `accounts`. An empty array means
 * the delete/unlink is safe. Fails OPEN on a lookup error (mirrors the
 * check-before-write convention in useAccountForm.isAccountNameTaken) so a
 * transient network blip can't trap the user — the action is allowed and the
 * backend remains the final arbiter.
 */
export async function findOrphanedAccounts(
  contactId: string,
  accounts: OrphanedAccountRef[],
): Promise<OrphanedAccountRef[]> {
  const results = await Promise.all(
    accounts.map(async (a) => {
      try {
        return (await accountKeepsAContact(a.accountId, contactId)) ? null : a
      } catch {
        return null
      }
    }),
  )
  return results.filter((a): a is OrphanedAccountRef => a !== null)
}
