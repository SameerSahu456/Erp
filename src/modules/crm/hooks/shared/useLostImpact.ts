import { useQuery } from "@tanstack/react-query";

import { fetchLostImpact, type LostImpactEntity } from "../../api/lost-impact";

// Preview for the "Mark as lost" dialog. Fetched only while the dialog is
// open so the list reflects the orders as they stand right now.
export function useLostImpact(
  entityType: LostImpactEntity,
  entityId: string | null | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["crm", "lost-impact", entityType, entityId],
    queryFn: () => fetchLostImpact(entityType, entityId as string),
    enabled: enabled && Boolean(entityId),
  });
}
