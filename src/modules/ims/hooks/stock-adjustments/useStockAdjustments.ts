import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  fetchStockAdjustment,
  fetchStockAdjustments,
  type StockAdjustmentsParams,
} from "../../stock-adjustments.api";
import { imsKeys } from "../keys";

const K = imsKeys.stockAdjustments;

/** Server-paged adjustments list (§16.7). */
export function useStockAdjustmentsPage(params: StockAdjustmentsParams) {
  return useQuery({
    queryKey: K.list(params),
    queryFn: () => fetchStockAdjustments(params),
    placeholderData: keepPreviousData,
  });
}

/** One adjustment with its lines and pinned units. Disabled for an empty id. */
export function useStockAdjustment(id: string) {
  return useQuery({
    queryKey: K.detail(id),
    queryFn: () => fetchStockAdjustment(id),
    enabled: !!id,
  });
}
