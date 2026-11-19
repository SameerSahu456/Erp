import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { FIRST_PAGE, nextPage } from "@shared/api/pagination";
import { toast } from "sonner";

import { makeStaticAsyncOptions } from "@/components/ui/async-select";
import { PAGINATION } from "@/shared/constants";

import { SPEC_ATTRIBUTES_STRINGS } from "../../components/specification-attributes/specification-attributes.strings";
import {
  createSpecificationAttribute,
  deleteSpecificationAttribute,
  fetchSpecificationAttribute,
  fetchSpecificationAttributesPaged,
  updateSpecificationAttribute,
  type SpecificationAttributeCreate,
  type SpecificationAttributeShort,
  type SpecificationAttributeSortField,
  type SpecificationAttributeUpdate,
} from "../../api";

const KEY = ["ims", "specification-attributes"] as const;
// Category responses embed their linked attributes (name + values), so a
// rename / values edit here must refresh category detail queries too.
const CATEGORIES_KEY = ["ims", "categories"] as const;

/** Server-paginated, searchable, sortable list — the master page, and (with
 *  `category_id`) the category detail page's Specifications tab. */
export function useSpecificationAttributesPaged(params: {
  page: number;
  page_size: number;
  search?: string;
  is_active?: boolean;
  sort?: SpecificationAttributeSortField;
  category_id?: string;
}) {
  return useQuery({
    queryKey: [...KEY, "paged", params],
    queryFn: () => fetchSpecificationAttributesPaged(params),
    placeholderData: keepPreviousData,
  });
}

/**
 * Options hook for the attribute dropdowns (§16.11): infinite query, server
 * search (min 2 chars), active attributes only — an inactive attribute stays
 * on records that already use it but isn't offered for new picks.
 */
export function useSpecificationAttributeOptions(
  search: string,
  options: { enabled?: boolean } = {},
) {
  const trimmed = search.trim();
  const searchParam = trimmed.length >= 2 ? trimmed : undefined;
  return useInfiniteQuery({
    queryKey: [
      ...KEY,
      "options",
      { search: searchParam ?? "", isActive: true },
    ],
    queryFn: ({ pageParam }) =>
      fetchSpecificationAttributesPaged({
        page: pageParam,
        page_size: PAGINATION.DEFAULT_PAGE_SIZE,
        is_active: true,
        ...(searchParam ? { search: searchParam } : {}),
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
    enabled: options.enabled ?? true,
  });
}

/**
 * Builds an options hook for the spec-key dropdown that lists ONLY the
 * selected category's active attributes (CP-421 point 4): a part/variant may
 * carry only specifications mapped to its category, so the whole-master append
 * is gone. The category's attributes already ride on the category response
 * (no extra fetch), so this is a static, in-memory search list. An existing
 * key that isn't on the category is still resolved for display by
 * `useSpecificationAttributeByName`.
 */
export function makeSpecKeyOptionsHook(
  categoryAttributes: SpecificationAttributeShort[],
) {
  return makeStaticAsyncOptions(
    categoryAttributes.filter((a) => a.is_active),
    (a) => a.name,
  );
}

/**
 * Resolves spec keys that aren't on the category to their master row, so the
 * value dropdown can still offer that attribute's suggested values (and the
 * editor can flag a key that isn't in the master at all). One small server
 * search per unresolved key; disabled for keys the caller already knows.
 */
export function useSpecificationAttributeByName(
  name: string,
  enabled: boolean,
) {
  const trimmed = name.trim();
  return useQuery({
    queryKey: [...KEY, "by-name", trimmed.toLowerCase()],
    queryFn: async () => {
      const page = await fetchSpecificationAttributesPaged({
        page: 1,
        page_size: PAGINATION.DEFAULT_PAGE_SIZE,
        search: trimmed,
      });
      return (
        page.items.find(
          (a) => a.name.toLowerCase() === trimmed.toLowerCase(),
        ) ?? null
      );
    },
    // Backend search needs 2+ chars; a 1-char key can't be looked up by
    // search, so it's treated as unresolved by the caller.
    enabled: enabled && trimmed.length >= 2,
  });
}

export function useSpecificationAttribute(id: string) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => fetchSpecificationAttribute(id),
    enabled: !!id,
  });
}

export function useCreateSpecificationAttribute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SpecificationAttributeCreate) =>
      createSpecificationAttribute(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      toast.success(SPEC_ATTRIBUTES_STRINGS.toasts.created);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSpecificationAttribute(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SpecificationAttributeUpdate) =>
      updateSpecificationAttribute(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: CATEGORIES_KEY });
      toast.success(SPEC_ATTRIBUTES_STRINGS.toasts.updated);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSpecificationAttribute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSpecificationAttribute(id),
    onSuccess: (_data, id) => {
      // Skip the deleted row's own detail query — refetching it would 404.
      void qc.invalidateQueries({
        queryKey: KEY,
        predicate: (query) => query.queryKey[2] !== id,
      });
      toast.success(SPEC_ATTRIBUTES_STRINGS.toasts.deleted);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
