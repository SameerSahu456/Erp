import { Label } from "@/components/ui/label"
import { CategoryMultiSelect } from "@modules/ims"

import type { AccountFormController } from "../../hooks/accounts/useAccountForm"
import { ACCOUNTS_STRINGS as S } from "./accounts.strings"

export function AccountCategoriesFields({ form }: { form: AccountFormController }) {
  const {
    categoriesInterested, setCategoriesInterested,
    categoriesBought, setCategoriesBought,
  } = form

  return (
    <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2">
      {/* Categories Interested */}
      <div className="space-y-1.5">
        <Label className="font-ui">{S.categoriesFields.interested}</Label>
        <CategoryMultiSelect
          value={categoriesInterested}
          onValueChange={setCategoriesInterested}
          placeholder={S.categoriesFields.interestedPlaceholder}
        />
      </div>

      {/* Categories Bought */}
      <div className="space-y-1.5">
        <Label className="font-ui">{S.categoriesFields.bought}</Label>
        <CategoryMultiSelect
          value={categoriesBought}
          onValueChange={setCategoriesBought}
          placeholder={S.categoriesFields.boughtPlaceholder}
        />
      </div>
    </div>
  )
}
