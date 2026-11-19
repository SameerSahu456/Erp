import { useQuery } from "@tanstack/react-query";

import { fetchDispatchReadyUnits } from "../../api/dispatch";
import { wmsKeys } from "../keys";


/** Issued Material Issue units ready to dispatch for a demand document
 *  (a Sales Order in Phase A), each with its copied component tree. */
export function useDispatchReadyUnits(sourceType: string, sourceId: string) {
  return useQuery({
    queryKey: wmsKeys.dispatches.readyUnits(sourceType, sourceId),
    queryFn: () =>
      fetchDispatchReadyUnits({
        source_entity_type: sourceType,
        source_entity_id: sourceId,
      }),
    enabled: !!sourceType && !!sourceId,
  });
}
