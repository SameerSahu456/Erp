import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { notifyMutationError } from "@shared/api/notify-mutation-error";

import {
  createServiceVendor,
  fetchServiceVendors,
  patchServiceVendor,
  searchServiceVendors,
  type ServiceVendorCreateRequest,
  type ServiceVendorListParams,
  type ServiceVendorPatchRequest,
} from "../../api/service-jobs";

import { wmsKeys } from "../keys";

const K = wmsKeys.serviceVendors;

/** A vendor write changes every section picker and the admin table. */
function invalidateVendors(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: K.optionsAll() });
  void qc.invalidateQueries({ queryKey: K.lists() });
}
import { SERVICE_VENDORS_STRINGS as S } from "../../components/vendor-jobs/service-vendors.strings";

/** All vendors for one section's picker (not paged). `options.enabled` gates the fetch. */
export const useServiceVendors = (
  sectionCode?: string,
  includeInactive = true,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    queryKey: K.options("picker", sectionCode ?? "all", includeInactive),
    queryFn: () => fetchServiceVendors(sectionCode, includeInactive),
    enabled: options.enabled ?? true,
  });

/** The admin TABLE — server-side search / sort / pagination. `params` is part
 *  of the key so each page/search/sort is its own cache entry. */
export const useServiceVendorsSearch = (params: ServiceVendorListParams) =>
  useQuery({
    queryKey: K.list(params),
    queryFn: () => searchServiceVendors(params),
  });

export const useCreateServiceVendor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ServiceVendorCreateRequest) => createServiceVendor(body),
    onSuccess: () => {
      invalidateVendors(qc);
      toast.success(S.toasts.created);
    },
    onError: notifyMutationError,
  });
};

export const usePatchServiceVendor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ServiceVendorPatchRequest }) =>
      patchServiceVendor(id, body),
    onSuccess: () => {
      invalidateVendors(qc);
      toast.success(S.toasts.updated);
    },
    onError: notifyMutationError,
  });
};
