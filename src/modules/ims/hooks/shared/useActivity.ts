import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  fetchActivity,
  type ActivityPage,
  type ActivityResourceType,
  type FetchActivityParams,
} from "../../api";
import { IMS_PAGE_SIZE } from "../../constants";

const KEY = ["ims", "activity"] as const;

// Per-resource audit-log timeline for IMS detail pages.
//
// Backend route: GET /api/v1/ims/activity?resource_type=&resource_id=
// Pagination uses the standard page (`@shared/api/pagination`).
// Pass both `from_date` + `to_date` together (backend rejects half-open).
export function useActivity(
  resourceType: ActivityResourceType,
  resourceId: string | undefined,
  options?: {
    page?: number;
    pageSize?: number;
    fromDate?: string;
    toDate?: string;
    enabled?: boolean;
  },
) {
  const params: FetchActivityParams = {
    resource_type: resourceType,
    resource_id: resourceId ?? "",
    page: options?.page ?? 1,
    page_size: options?.pageSize ?? IMS_PAGE_SIZE,
    ...(options?.fromDate ? { from_date: options.fromDate } : {}),
    ...(options?.toDate ? { to_date: options.toDate } : {}),
  };
  return useQuery<ActivityPage>({
    queryKey: [...KEY, params],
    queryFn: () => fetchActivity(params),
    enabled: (options?.enabled ?? true) && !!resourceId,
    placeholderData: keepPreviousData,
  });
}
