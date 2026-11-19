import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { AccountFormController } from "../../hooks/accounts/useAccountForm"
import { ACCOUNTS_STRINGS as S } from "./accounts.strings"
import { AccountContactsEditor } from "../AccountContactsEditor"
import { AccountContactsField } from "../AccountContactsField"

export function AccountContactsCard({ form }: { form: AccountFormController }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {S.formCards.contacts}
          {!form.isEdit ? <span className="text-destructive"> *</span> : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {form.isEdit && form.accountId ? (
          <AccountContactsEditor
            accountId={form.accountId}
            onPrimaryStaged={form.setPendingPrimaryContactId}
          />
        ) : (
          <AccountContactsField
            value={form.contactRows}
            onChange={form.setContactRows}
            error={form.errors.contacts}
          />
        )}
      </CardContent>
    </Card>
  )
}
