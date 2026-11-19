import { UserPlus } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { AccountOwnerWire } from "../../api"
import { ACCOUNTS_STRINGS as S } from "./accounts.strings"
import { AccountOwnerCard } from "./AccountOwnerCard"

interface AccountOwnersCardProps {
  owners: AccountOwnerWire[]
  onAddOwnerClick: () => void
  onMakePrimary: (userId: string) => void
  onRemove: (userId: string) => void
  isPromoting: boolean
  isRemoving: boolean
}

export function AccountOwnersCard({
  owners,
  onAddOwnerClick,
  onMakePrimary,
  onRemove,
  isPromoting,
  isRemoving,
}: AccountOwnersCardProps) {
  return (
    <Card size="sm">
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm">{S.owners.cardTitle}</CardTitle>
        <button
          type="button"
          onClick={onAddOwnerClick}
          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground"
          aria-label={S.owners.addOwner}
          title={S.owners.addOwner}
        >
          <UserPlus className="size-3.5" />
        </button>
      </CardHeader>
      <CardContent>
        {owners.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">
            {S.owners.empty}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {owners.map((o) => (
              <AccountOwnerCard
                key={o.id}
                owner={o}
                onMakePrimary={() => onMakePrimary(o.user_id)}
                onRemove={() => onRemove(o.user_id)}
                isPromoting={isPromoting}
                isRemoving={isRemoving}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
