import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PARTS_STRINGS } from "../../components/parts/parts.strings";

import {
  fetchPriceHistory,
  updatePrice,
  type UpdatePriceRequest,
} from "../../api";

const KEY = ["ims", "price-history"] as const;

export function useUpdatePrice(variantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdatePriceRequest) => updatePrice(variantId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...KEY, variantId] });
      void qc.invalidateQueries({ queryKey: ["ims", "variants", variantId] });
      toast.success(PARTS_STRINGS.toasts.priceUpdated);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Price-change trail for one variant, newest first.
 *
 * Returns an empty page rather than throwing when the caller lacks
 * `ims:price_read` — the panel simply doesn't render. A 403 here is an
 * expected outcome for warehouse roles, not a failure worth a toast.
 */
export function usePriceHistory(
  variantId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...KEY, variantId],
    queryFn: () => fetchPriceHistory(variantId),
    enabled: options?.enabled ?? true,
  });
}
