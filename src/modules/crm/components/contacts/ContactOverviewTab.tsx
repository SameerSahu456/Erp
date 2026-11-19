import { Link } from "react-router-dom"
import { Building2, CalendarDays, Mail, Phone, User } from "lucide-react"

import { formatIST_date } from "@shared/lib/date"

import type { ContactAccountEmbed, ContactResponse } from "../../api"
import { CONTACTS_STRINGS } from "./contacts.strings"
import { ContactInfoRow } from "./ContactInfoRow"

interface ContactOverviewTabProps {
  contact: ContactResponse
  primaryAccount: ContactAccountEmbed | null
  lastContactIso: string
}

export function ContactOverviewTab({ contact, primaryAccount, lastContactIso }: ContactOverviewTabProps) {
  return (
    // The outer card frame comes from `<DetailTabs cardContent>`. Inside
    // we render the Contact Information panel with its own border so it
    // reads as a distinct block, matching the Account/Deal layout.
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-[15px] font-semibold tracking-tight">
          {CONTACTS_STRINGS.detail.overview.heading}
        </h2>
        <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          <ContactInfoRow icon={Mail} label={CONTACTS_STRINGS.detail.overview.labels.email}>
            {contact.email ? (
              <a
                href={`mailto:${contact.email}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {contact.email}
              </a>
            ) : (
              "—"
            )}
          </ContactInfoRow>
          <ContactInfoRow icon={Phone} label={CONTACTS_STRINGS.detail.overview.labels.phone}>
            {contact.phone ? (
              <a
                href={`tel:${contact.phone}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {contact.phone}
              </a>
            ) : (
              "—"
            )}
          </ContactInfoRow>
          <ContactInfoRow icon={User} label={CONTACTS_STRINGS.detail.overview.labels.designation}>
            {contact.designation ?? "—"}
          </ContactInfoRow>
          <ContactInfoRow icon={Building2} label={CONTACTS_STRINGS.detail.overview.labels.account}>
            {primaryAccount ? (
              <Link
                to={`/crm/accounts/${primaryAccount.account_id}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {primaryAccount.account_name}
              </Link>
            ) : (
              "—"
            )}
          </ContactInfoRow>
          <ContactInfoRow icon={CalendarDays} label={CONTACTS_STRINGS.detail.overview.labels.lastContact}>
            {formatIST_date(lastContactIso)}
          </ContactInfoRow>
          <ContactInfoRow icon={CalendarDays} label={CONTACTS_STRINGS.detail.overview.labels.created}>
            {formatIST_date(contact.created_at)}
          </ContactInfoRow>
        </dl>
      </div>
    </div>
  )
}
