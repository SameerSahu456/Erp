import { useQuery } from "@tanstack/react-query";

import { fetchStatsOverview } from "../../api";

const KEY = ["ims", "stats", "overview"] as const;

export function useStatsOverview() {
  return useQuery({
    queryKey: KEY,
    queryFn: fetchStatsOverview,
  });
}
