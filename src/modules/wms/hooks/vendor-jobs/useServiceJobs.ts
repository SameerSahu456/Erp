/**
 * The vendor-jobs queue.
 *
 * No per-hook query config — `staleTime` / `retry` / `refetchOn*` are global in
 * `API.QUERY_DEFAULTS` and overriding them here is an auto-reject
 * (Coding-guideline §6.5.1). Keys come from the module factory so the targeted
 * invalidation in §16.9 keeps working.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  cancelServiceJob,
  fetchDeviceServiceJobs,
  fetchServiceJobStats,
  fetchServiceJobsPage,
  raiseServiceJob,
  receiveServiceJob,
  resendServiceJob,
  sendServiceJobToVendor,
  type VendorJobCancelRequest,
  type VendorJobCreateRequest,
  type VendorJobListParams,
  type VendorJobReceiveRequest,
  type VendorJobResendRequest,
  type VendorJobSendRequest,
} from "../../api/service-jobs";

import { wmsKeys } from "../keys";
import { USE_SERVICE_JOBS_STRINGS } from "./use-service-jobs.strings";
import { invalidateDevice } from "../devices/useDevices";

const K = wmsKeys.serviceJobs;

/** A job action refreshes the queue + counts and the device detail. */
function invalidateJob(qc: ReturnType<typeof useQueryClient>, deviceId: string) {
  void qc.invalidateQueries({ queryKey: K.lists() });
  void qc.invalidateQueries({ queryKey: K.statsAll() });
  invalidateDevice(qc, deviceId);
}

export const useServiceJobs = (
  params: VendorJobListParams,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    queryKey: K.list(params),
    queryFn: () => fetchServiceJobsPage(params),
    enabled: options.enabled ?? true,
    // Hold the current page on screen while the next loads (§16.7) — without
    // it the table flashed empty on every page / tab change.
    placeholderData: keepPreviousData,
  });

export const useServiceJobStats = (
  params: VendorJobListParams,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    queryKey: K.stats(params),
    queryFn: () => fetchServiceJobStats(params),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
  });

export const useDeviceServiceJobs = (deviceId: string | undefined) =>
  useQuery({
    queryKey: wmsKeys.devices.serviceJobs(deviceId ?? ""),
    queryFn: () => fetchDeviceServiceJobs(deviceId as string),
    enabled: !!deviceId,
  });

/** Every action touches both the queue and the device card, so both keys are
 *  invalidated — targeted, never a blanket clear (§16.9). */
const useJobMutation = <TBody, TResult>(
  fn: (deviceId: string, jobId: string, body: TBody) => Promise<TResult>,
  // Green toast on success (§0.13). These are single-shot dialog actions, so one
  // toast per action — never the per-item loop that `raise` runs. Failures are
  // surfaced inline in each dialog, so no error toast here (would duplicate).
  successMessage: string,
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      deviceId,
      jobId,
      body,
    }: {
      deviceId: string;
      jobId: string;
      body: TBody;
    }) => fn(deviceId, jobId, body),
    onSuccess: (_data, variables) => {
      invalidateJob(qc, variables.deviceId);
      toast.success(successMessage);
    },
  });
};

export const useRaiseServiceJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      deviceId,
      body,
    }: {
      deviceId: string;
      body: VendorJobCreateRequest;
    }) => raiseServiceJob(deviceId, body),
    onSuccess: (_data, variables) => {
      invalidateJob(qc, variables.deviceId);
    },
  });
};

export const useSendServiceJobToVendor = () =>
  useJobMutation<VendorJobSendRequest, unknown>(
    sendServiceJobToVendor,
    USE_SERVICE_JOBS_STRINGS.success.send,
  );
export const useReceiveServiceJob = () =>
  useJobMutation<VendorJobReceiveRequest, unknown>(
    receiveServiceJob,
    USE_SERVICE_JOBS_STRINGS.success.receive,
  );
export const useResendServiceJob = () =>
  useJobMutation<VendorJobResendRequest, unknown>(
    resendServiceJob,
    USE_SERVICE_JOBS_STRINGS.success.resend,
  );
export const useCancelServiceJob = () =>
  useJobMutation<VendorJobCancelRequest, unknown>(
    cancelServiceJob,
    USE_SERVICE_JOBS_STRINGS.success.cancel,
  );
