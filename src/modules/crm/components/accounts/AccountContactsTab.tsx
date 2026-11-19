import { Link } from "react-router-dom"
import { Mail, Phone, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import type { useAccountDetail } from "../../hooks/accounts/useAccountDetail"
import { ACCOUNTS_STRINGS as S } from "./accounts.strings"
import { AccountEmptyState } from "./AccountEmptyState"

type Detail = ReturnType<typeof useAccountDetail>

interface AccountContactsTabProps {
  account: NonNullable<Detail["account"]>
  contacts: Detail["contacts"]
}

export function AccountContactsTab({ account, contacts }: AccountContactsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {S.contacts.linkedCount(contacts.length)}
        </p>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link to={`/crm/contacts/new?accountId=${account.id}`} />}
        >
          <Plus className="size-3.5" data-icon="inline-start" />
          {S.contacts.addContact}
        </Button>
      </div>
      {contacts.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {contacts.map((contact) => (
            <Link
              key={contact.id}
              to={`/crm/contacts/${contact.id}`}
              className="group rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.04)] transition-all hover:-translate-y-px hover:border-primary/25"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-2 ring-card transition-transform group-hover:scale-105">
                  {contact.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[13px] font-semibold text-foreground">
                      {contact.name}
                    </p>
                    {(contact.primary_account_id === account.id ||
                      contact.accounts.some(
                        (link) => link.account_id === account.id && link.is_primary,
                      )) && (
                      <Badge variant="primary-soft" size="sm" className="shrink-0">
                        {S.contacts.primary}
                      </Badge>
                    )}
                  </div>
                  {contact.designation && (
                    <p className="truncate text-[11.5px] text-muted-foreground">
                      {contact.designation}
                    </p>
                  )}
                  {contact.email && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                      <Mail className="size-3 shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                      <Phone className="size-3 shrink-0" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <AccountEmptyState text={S.contacts.empty} />
      )}
    </div>
  )
}
