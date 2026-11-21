import { createContext } from "react"

import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import type { components } from "@/shared/api/schema.gen"

/** Which parts of the app this environment shows — the backend's
 *  `FEATURE_*` settings, read once at startup from `GET /config/features`.
 *  They hide screens only; every API keeps its own permission checks. */
export type FeatureFlags = components["schemas"]["FeatureFlagsResponse"]

export function fetchFeatureFlags(): Promise<FeatureFlags> {
  return apiClient.get<FeatureFlags>(endpoints.config.features)
}

/** Used when the backend can't be reached: the build-time
 *  `VITE_SHOW_BOM_AND_ALL_ROUTES` switch, for every feature at once.
 *  In demo mode (no `VITE_API_BASE_URL`, so no backend to read flags from)
 *  every feature is shown, otherwise the whole app would have no Warehouse,
 *  Procurement or Dashboard section. */
const DEMO_MODE = !import.meta.env.VITE_API_BASE_URL
const BUILD_TIME_ON =
  DEMO_MODE ||
  import.meta.env.VITE_SHOW_BOM_AND_ALL_ROUTES === "true" ||
  import.meta.env.VITE_SHOW_BOM_AND_ALL_ROUTES === "1"

export const FALLBACK_FEATURE_FLAGS: FeatureFlags = {
  wms: BUILD_TIME_ON,
  procurement: BUILD_TIME_ON,
  dashboard: BUILD_TIME_ON,
  crm_extras: BUILD_TIME_ON,
}

export const FeatureFlagsContext = createContext<FeatureFlags>(FALLBACK_FEATURE_FLAGS)
