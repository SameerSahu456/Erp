import { QuoteBuilderPanel } from '../components/QuoteBuilderPanel'
import { EntityHeader } from '../components/EntityHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function QuoteBuilderPage() {
  return (
    <div className="space-y-6">
      <EntityHeader
        title="Quote Builder"
        subtitle="Build quotes with BOM component configuration"
        backHref="/crm/quotes"
      />
      <Card>
        <CardHeader>
          <CardTitle>New Quote</CardTitle>
        </CardHeader>
        <CardContent>
          <QuoteBuilderPanel />
        </CardContent>
      </Card>
    </div>
  )
}

export { QuoteBuilderPage }
