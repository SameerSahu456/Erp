import type { ComponentType } from 'react'

import type { MetricKey } from '../insights.registry'
import { AccountMovementInsightView } from './AccountMovementInsightView'
import { AccountRevenueInsightView } from './AccountRevenueInsightView'
import { AccountTypeRevenueInsightView } from './AccountTypeRevenueInsightView'
import { AvgOrderValueInsightView } from './AvgOrderValueInsightView'
import { CategoryOemInsightView } from './CategoryOemInsightView'
import { GrowthInsightView } from './GrowthInsightView'
import { InactiveAccountsInsightView } from './InactiveAccountsInsightView'
import { ConditionRevenueInsightView } from './ConditionRevenueInsightView'
import type { InsightViewProps } from './insight-view.types'
import { MonthlyRevenueInsightView } from './MonthlyRevenueInsightView'
import { NewAccountsInsightView } from './NewAccountsInsightView'
import { SalesFunnelInsightView } from './SalesFunnelInsightView'
import { SalesTeamInsightView } from './SalesTeamInsightView'
import { TopOrdersInsightView } from './TopOrdersInsightView'

// Metric → its page component. `CrmInsightDetailPage` looks the metric up here
// instead of branching, so adding a metric is: a key in `METRIC_KEYS`, an entry
// in `INSIGHTS`, a view file, and a line here. `Record<MetricKey, …>` means a
// new metric that forgets its view is a TYPE ERROR, not a blank page.
export const METRIC_VIEWS: Record<MetricKey, ComponentType<InsightViewProps>> = {
  'sales-team': SalesTeamInsightView,
  'monthly-revenue': MonthlyRevenueInsightView,
  'account-revenue': AccountRevenueInsightView,
  'category-oem': CategoryOemInsightView,
  'condition-revenue': ConditionRevenueInsightView,
  'account-type-revenue': AccountTypeRevenueInsightView,
  'avg-order-value': AvgOrderValueInsightView,
  'top-orders': TopOrdersInsightView,
  'sales-funnel': SalesFunnelInsightView,
  growth: GrowthInsightView,
  'account-movement': AccountMovementInsightView,
  'new-accounts': NewAccountsInsightView,
  'inactive-accounts': InactiveAccountsInsightView,
}

export type { InsightViewProps }
