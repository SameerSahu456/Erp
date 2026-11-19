import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Typography } from "@/components/ui/typography"

import type { ContactAccountEmbed } from "../../api"
import { CONTACTS_STRINGS } from "./contacts.strings"
import { LinkedAccountRow } from "./LinkedAccountRow"

export function ContactLinkedAccountsCard({ linkedAccounts }: { linkedAccounts: ContactAccountEmbed[] }) {
  return (
    <Card size="sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{CONTACTS_STRINGS.detail.linkedAccounts.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {linkedAccounts.length === 0 ? (
          <Typography variant="helper" className="italic" asChild>
            <p>{CONTACTS_STRINGS.detail.linkedAccounts.empty}</p>
          </Typography>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {linkedAccounts.map((a) => (
              <LinkedAccountRow key={a.account_id} link={a} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
