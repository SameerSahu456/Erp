// Plus / Button / PermissionGuard / crmCan — re-import when the Create Quote action is restored.
// import { Plus } from "lucide-react"

// import { Button } from "@/components/ui/button"
import { ListPageShell } from "@/components/page-shells"
// import { PermissionGuard } from "@shared/rbac"

// import { crmCan } from "../../permissions"
import { QuotesTable } from "../../components/quotes/QuotesTable"
import { QUOTES_STRINGS as S } from "../../components/quotes/quotes.strings"
import { useQuotesList } from "../../hooks/quotes/useQuotesList"

function QuotesPage() {
  const list = useQuotesList()

  return (
    <ListPageShell
      title={S.list.pageTitle}
      subtitle={S.list.pageSubtitle}
      breadcrumbs={[{ label: S.form.breadcrumbCrm }, { label: S.form.breadcrumbQuotes }]}
      className="space-y-6 animate-fade-in-up"
      // Direct creation is switched OFF: a sales order / quote is only reachable
      // from its originating Lead or Deal, so the record always carries its source.
      // To restore, uncomment this block AND its imports above.
      // actions={
      //   <PermissionGuard required={[...crmCan.writeQuote]}>
      //     <Button onClick={list.openQuoteNew}>
      //       <Plus className="size-4 mr-1.5" />
      //       {S.list.empty.action}
      //     </Button>
      //   </PermissionGuard>
      // }
    >
      <QuotesTable list={list} />
    </ListPageShell>
  )
}

export default QuotesPage
