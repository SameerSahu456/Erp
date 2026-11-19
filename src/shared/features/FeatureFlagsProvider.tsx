import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"

import {
  FALLBACK_FEATURE_FLAGS,
  FeatureFlagsContext,
  fetchFeatureFlags,
} from "./feature-flags"

/** Loads the feature switches once, before any route renders — the routes
 *  themselves depend on them, so a deep link to `/wms/...` must not resolve
 *  against a guess. If the request fails the build-time fallback is used. */
export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const query = useQuery({
    queryKey: ["config", "features"],
    queryFn: fetchFeatureFlags,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  })

  if (query.isPending) return null

  return (
    <FeatureFlagsContext.Provider value={query.data ?? FALLBACK_FEATURE_FLAGS}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}
