import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { AccountFormController } from "../../hooks/accounts/useAccountForm"
import { ACCOUNTS_STRINGS as S } from "./accounts.strings"
import { AccountAddressesCard } from "./AccountAddressesCard"
import { AccountCategoriesFields } from "./AccountCategoriesFields"
import { AccountCompanyDetailsSection } from "./AccountCompanyDetailsSection"
import { AccountContactsCard } from "./AccountContactsCard"
import { AccountDocumentsFormCard } from "./AccountDocumentsFormCard"
import { AccountSizeRevenueSection } from "./AccountSizeRevenueSection"
import { AccountStatusOwnershipSection } from "./AccountStatusOwnershipSection"

export function AccountFormBody({ form }: { form: AccountFormController }) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {form.isEdit ? S.form.bodyTitleEdit : S.form.createByKind[form.createKind].body}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-x-7 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
            <AccountCompanyDetailsSection form={form} />
            <AccountSizeRevenueSection form={form} />
            <AccountStatusOwnershipSection form={form} />
          </div>

          <AccountCategoriesFields form={form} />
        </CardContent>
      </Card>

      <AccountAddressesCard form={form} />
      <AccountContactsCard form={form} />
      <AccountDocumentsFormCard form={form} />
    </>
  )
}
