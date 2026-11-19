import { useQuery } from "@tanstack/react-query";

import { findEligiblePMs, type EligiblePMsRequest } from "../../api";

// Eligible-PM lookup for the SO line Reassign dialog. The endpoint is a
// POST but it's a read (no state mutation), so this is a `useQuery`. We
// key by every request dimension that affects the result so two open
// dialogs against different categories don't collide. `enabled` is the
// load-on-open flag — the dialog passes `open && !!categoryId`.

const KEY = ["ims", "pm-lookup", "eligible-pms"] as const;

export function useEligiblePMs(
  body: EligiblePMsRequest | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...KEY, body],
    queryFn: () => findEligiblePMs(body as EligiblePMsRequest),
    enabled: !!body?.category_id && (options?.enabled ?? true),
  });
}
