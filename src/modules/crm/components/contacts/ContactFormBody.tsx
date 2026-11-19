import { Link } from "react-router-dom"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Typography } from "@/components/ui/typography"

import type { ContactFormController } from "../../hooks/contacts/useContactForm"
import { CONTACTS_STRINGS } from "./contacts.strings"
import { ContactIdentitySection } from "./ContactIdentitySection"
import { ContactRoleAccountsSection } from "./ContactRoleAccountsSection"

export function ContactFormBody({ form }: { form: ContactFormController }) {
  return (
    <>
      {form.duplicate && (
        <Typography variant="body" tone="inherit" asChild>
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-600/40 dark:bg-amber-950/30 dark:text-amber-100">
            {CONTACTS_STRINGS.form.duplicateBefore}{" "}
            <strong>{form.duplicate.existing_contact_name}</strong>.{" "}
            <Link
              to={`/crm/contacts/${form.duplicate.existing_contact_id}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {CONTACTS_STRINGS.form.duplicateLink}
            </Link>
          </div>
        </Typography>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{CONTACTS_STRINGS.form.cardTitle(form.isEdit)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-x-7 gap-y-6 md:grid-cols-2">
            {/* Left column — identity */}
            <ContactIdentitySection form={form} />
            {/* Right column — role + accounts */}
            <ContactRoleAccountsSection form={form} />
          </div>
        </CardContent>
      </Card>
    </>
  )
}
