/**
 * The section master — what makes a new third-party section free.
 *
 * The sidebar entry, the route, the raise form's item suggestions, whether
 * Receive asks for a replacement serial, and the label in the device-status
 * column ALL come from these rows. Nothing in the UI may branch on a section
 * code; if you need per-section behaviour, add a column to `service_sections`.
 */
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { notifyMutationError } from "@shared/api/notify-mutation-error";

import {
  createServiceSection,
  fetchServiceSections,
  patchServiceSection,
  searchServiceSections,
  type ServiceSection,
  type ServiceSectionCreateRequest,
  type ServiceSectionListParams,
  type ServiceSectionPatchRequest,
} from "../../api/service-jobs";

import { wmsKeys } from "../keys";

const K = wmsKeys.serviceSections;

/** A section write changes the master everywhere it is read — the picker
 *  array (sidebar, routes, device cards) and the admin table. */
function invalidateSections(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: K.optionsAll() });
  void qc.invalidateQueries({ queryKey: K.lists() });
}
import { SERVICE_SECTIONS_STRINGS as S } from "../../components/vendor-jobs/service-sections.strings";

/** The whole array — the sidebar nav, `useApplicableSections`, and every
 *  section picker read this. The admin table uses `useServiceSectionsSearch`. */
export const useServiceSections = (options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: K.options("all"),
    queryFn: () => fetchServiceSections(),
    // `enabled` is control-flow, not query-config (§6.5.1 bans only stale/gc/retry/
    // refetch overrides) — it lets a picker defer its fetch until the dialog opens.
    enabled: options.enabled,
  });

/** The admin TABLE — server-side search / sort / pagination. */
export const useServiceSectionsSearch = (params: ServiceSectionListParams) =>
  useQuery({
    queryKey: K.list(params),
    queryFn: () => searchServiceSections(params),
  });

export const useServiceSection = (code: string | undefined) => {
  const { data } = useServiceSections();
  return useMemo(
    () => (code ? data?.find((s) => s.code === code) : undefined),
    [data, code],
  );
};

/**
 * Sections a given device can actually be sent to.
 *
 * PRD §12.7: server assemblies route component-level failures through the BOM
 * slot flow, so those sections opt out via `applies_to_servers`. Per-section,
 * not a global rule — an assembly can still be painted.
 */
export const useApplicableSections = (
  isAssembly: boolean | undefined,
): ServiceSection[] => {
  const { data } = useServiceSections();
  return useMemo(
    () => (data ?? []).filter((s) => s.applies_to_servers || !isAssembly),
    [data, isAssembly],
  );
};

export const useCreateServiceSection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ServiceSectionCreateRequest) => createServiceSection(body),
    // The section master drives the sidebar, the routes and every device card,
    // so a new row must invalidate more than its own list.
    onSuccess: () => {
      invalidateSections(qc);
      toast.success(S.toasts.created);
    },
    onError: notifyMutationError,
  });
};

export const usePatchServiceSection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ServiceSectionPatchRequest }) =>
      patchServiceSection(id, body),
    onSuccess: () => {
      invalidateSections(qc);
      toast.success(S.toasts.updated);
    },
    onError: notifyMutationError,
  });
};
