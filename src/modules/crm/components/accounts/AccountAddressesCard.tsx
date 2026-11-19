import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { AccountFormController } from "../../hooks/accounts/useAccountForm"
import { ACCOUNTS_STRINGS as S } from "./accounts.strings"
import { AccountAddressesEditor } from "./AccountAddressesEditor"

export function AccountAddressesCard({ form }: { form: AccountFormController }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{S.formCards.addresses}</CardTitle>
      </CardHeader>
      <CardContent>
        {form.isEdit && form.accountId ? (
          <AccountAddressesEditor accountId={form.accountId} />
        ) : (
          <AccountAddressesEditor drafts={form.drafts} onDraftsChange={form.setDrafts} />
        )}
      </CardContent>
    </Card>
  )
}
