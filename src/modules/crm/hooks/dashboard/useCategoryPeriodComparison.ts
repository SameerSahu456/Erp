import { useQuery } from '@tanstack/react-query'

import {
  fetchCategoryPeriodComparison,
  type CategoryPeriodComparisonParams,
} from '../../api/dashboard'

// Category — Period Comparison widget on the /crm board. Query defaults are
// global (§6.5.1) — no per-hook staleTime / retry here.

export const CATEGORY_PERIOD_COMPARISON_KEY = ['crm', 'dashboard', 'category-period-comparison'] as const

export function useCategoryPeriodComparison(params: CategoryPeriodComparisonParams) {
  return useQuery({
    queryKey: [...CATEGORY_PERIOD_COMPARISON_KEY, params],
    queryFn: () => fetchCategoryPeriodComparison(params),
  })
}
