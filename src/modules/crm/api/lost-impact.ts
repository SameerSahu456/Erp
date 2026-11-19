import { apiClient } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";
import type { components } from "@/shared/api/schema.gen";

// What marking a lead / deal "Closed Lost" would cancel, and which already-
// dispatched orders block it (backend returns 409 LOST_BLOCKED_BY_FULFILMENT
// for those). Backend: crm/schemas/lost_impact.py.
export type LostImpact = components["schemas"]["LostImpactResponse"];
export type LostImpactDocument = components["schemas"]["LostImpactDocument"];
export type LostImpactEntity = "lead" | "deal";

export async function fetchLostImpact(
  entityType: LostImpactEntity,
  id: string,
): Promise<LostImpact> {
  const url =
    entityType === "lead"
      ? endpoints.crm.leadLostImpact(id)
      : endpoints.crm.dealLostImpact(id);
  return apiClient.get<LostImpact>(url);
}
