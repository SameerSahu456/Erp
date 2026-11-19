// The single cache window for rarely-changing reference data (§6.5.1): 5 min.
const REFERENCE_DATA_STALE_TIME_MS = 5 * 60 * 1000;

export const API = {
  TIMEOUT_MS: 60_000,
  UPLOAD_TIMEOUT_MS: 120_000,
  // The assistant's AI model reasons before it answers and can take minutes;
  // the backend answers within ASSISTANT_TIMEOUT_SECONDS (default 240).
  ASSISTANT_TIMEOUT_MS: 270_000,
  MAX_RETRIES: 3,
  // Cache window for rarely-changing reference data (OEMs, categories, users).
  STALE_TIME_MS: REFERENCE_DATA_STALE_TIME_MS,
  // The ONE reference-data query policy (§6.5.1). Rarely-changing lists (OEM /
  // category / PM / engineer rosters, warehouse teams, option dropdowns) opt
  // out of the global always-refetch default by SPREADING this object into
  // their useQuery options — `...API.REFERENCE_DATA_QUERY_OPTIONS` — rather than
  // each hook setting `staleTime` inline. One policy, one place to change it.
  REFERENCE_DATA_QUERY_OPTIONS: { staleTime: REFERENCE_DATA_STALE_TIME_MS },
  // Background-job status polling (§6.5.1 exception): a function refetchInterval
  // returns this while a job is active and `false` once none is.
  JOB_POLL_MS: 5_000,
  QUERY_DEFAULTS: {
    // staleTime 0 + refetchOnMount "always" is intentional: transactional data is
    // kept always-fresh. Reference-data hooks opt out via STALE_TIME_MS above.
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },
} as const;








