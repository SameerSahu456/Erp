import { ACCOUNTS_STRINGS as S } from "./accounts.strings"

export function AccountPlaceholderTab({ label }: { label: string }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dashed border-border bg-secondary/30 px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          {S.placeholderTab(label)}
        </p>
      </div>
    </div>
  )
}
