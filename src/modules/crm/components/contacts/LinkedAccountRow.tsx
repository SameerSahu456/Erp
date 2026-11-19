import { Link } from "react-router-dom"
import { Star } from "lucide-react"

import { formatIST_date } from "@shared/lib/date"

import type { ContactAccountEmbed } from "../../api"
import { CONTACTS_STRINGS } from "./contacts.strings"

export function LinkedAccountRow({ link }: { link: ContactAccountEmbed }) {
  const initials = link.account_name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <li>
      <Link
        to={`/crm/accounts/${link.account_id}`}
        className="flex min-h-[84px] items-start gap-2.5 rounded-lg border border-border/70 bg-secondary/25 px-3 py-3 transition-colors hover:border-primary/25"
      >
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[10.5px] font-semibold text-foreground">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-semibold leading-4">
              {link.account_name}
            </p>
            {link.is_primary && (
              <Star className="size-2.5 shrink-0 fill-amber-500 text-amber-500" />
            )}
          </div>
          <p className="mt-0.5 truncate text-[10px] font-semibold uppercase leading-3 tracking-[0.06em] text-muted-foreground">
            {link.account_code}
          </p>
          {link.linked_at && (
            <p className="mt-1 truncate text-[11px] leading-[15px] text-muted-foreground">
              {CONTACTS_STRINGS.detail.linkedAccounts.linkedAtPrefix} {formatIST_date(link.linked_at)}
            </p>
          )}
        </div>
      </Link>
    </li>
  )
}
