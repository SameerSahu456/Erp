import { useContext } from "react"

import { type FeatureFlags, FeatureFlagsContext } from "./feature-flags"

/** The environment's feature switches (see `FeatureFlags`). */
export function useFeatures(): FeatureFlags {
  return useContext(FeatureFlagsContext)
}
