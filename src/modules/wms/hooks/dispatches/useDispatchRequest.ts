import { useQuery } from "@tanstack/react-query";

import { fetchDispatchLineItems, fetchDispatchRequest } from "../../api/dispatch";
import { wmsKeys } from "../keys";

/** One dispatch request header (status, source, metadata). */
export function useDispatchRequest(id: string) {
  return useQuery({
    queryKey: wmsKeys.dispatches.detail(id),
    queryFn: () => fetchDispatchRequest(id),
    enabled: !!id,
  });
}

/** The dispatch's line items (primary + added_component rows). */
export function useDispatchLineItems(id: string) {
  return useQuery({
    queryKey: wmsKeys.dispatches.lineItems(id),
    queryFn: () => fetchDispatchLineItems(id),
    enabled: !!id,
  });
}
