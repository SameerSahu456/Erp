import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { ACCOUNTS_STRINGS as S } from "./accounts.strings"
import { type CrmIdNameRef } from "../../api"

interface AccountCategoriesCardProps {
  categoriesInterested: CrmIdNameRef[]
  categoriesBought: CrmIdNameRef[]
}

export function AccountCategoriesCard({
  categoriesInterested,
  categoriesBought,
}: AccountCategoriesCardProps) {
  if (categoriesInterested.length === 0 && categoriesBought.length === 0) {
    return null
  }

  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{S.categoriesCard.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {categoriesInterested.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {S.categoriesCard.interested}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {categoriesInterested.map((cat) => (
                <Badge key={cat.id} variant="primary-soft" size="sm">
                  {cat.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {categoriesBought.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {S.categoriesCard.bought}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {categoriesBought.map((cat) => (
                <Badge key={cat.id} variant="success-soft" size="sm">
                  {cat.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
