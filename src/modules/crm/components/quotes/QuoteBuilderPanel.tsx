import { QuoteBuilderBody } from './QuoteBuilderBody'
import { useQuoteBuilder } from '../../hooks/quotes/useQuoteBuilder'
import type { QuoteBuilderPanelProps } from './quoteBuilderShared'

export function QuoteBuilderPanel(props: QuoteBuilderPanelProps) {
  const qb = useQuoteBuilder(props)
  return <QuoteBuilderBody qb={qb} />
}
