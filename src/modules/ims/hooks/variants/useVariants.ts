import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { FIRST_PAGE, nextPage } from "@shared/api/pagination";
import { toast } from "sonner";

import { VARIANTS_STRINGS } from "../../components/variants/variants.strings";

import {
  createVariant,
  deleteBom,
  deleteVariant,
  fetchPart,
  fetchVariant,
  fetchVariantsListPage,
  fetchVariantsPage,
  replaceBom,
  updateVariant,
  type Bom,
  type BomReplace,
  type PartVariantCreate,
  type PartVariantUpdate,
  type VariantsListParams,
} from "../../api";
import { IMS_PAGE_SIZE } from "../../constants";
import { PAGINATION } from "@/shared/constants";
import { PARTS_KEY } from "../parts/useParts";
import { imsKeys } from "../keys";

const KEY = imsKeys.variants;

// Page-shaped fetcher for the part-detail variants tab — exposes total.
export function useVariantsPage(
  partId: string,
  params?: { page?: number; page_size?: number },
  options?: { enabled?: boolean },
) {
  const merged = { page_size: IMS_PAGE_SIZE, page: 1, ...params };
  return useQuery({
    queryKey: [...KEY, "by-part", partId, "page", merged],
    queryFn: () => fetchVariantsPage(partId, merged),
    enabled: !!partId && (options?.enabled ?? true),
    placeholderData: keepPreviousData,
  });
}

// Cross-part variants list — drives the Stock Items listing page. Hits
// GET /api/v1/ims/variants which returns each variant with a
// `stock_summary` rollup (available / reserved / damaged / total_units)
// and rich org context (part_name, category_name, oem_name).
export function useVariantsListPage(
  params: VariantsListParams = {},
  options?: { enabled?: boolean },
) {
  const merged: VariantsListParams = {
    page: 1,
    page_size: IMS_PAGE_SIZE,
    ...params,
  };
  return useQuery({
    queryKey: [...KEY, "list-page", merged],
    queryFn: () => fetchVariantsListPage(merged),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

/**
 * Cross-part variant picker for AsyncSelect dropdowns (CRM Quote part-number
 * column, etc.). Hits `GET /api/v1/ims/variants` with page/page_size pagination
 * and the backend's `search` param (min length 2). Gated on `enabled` so the
 * dropdown defers its first fetch until the user opens the popover, per the
 * canonical §16.11 lazy-on-open pattern.
 *
 * Page size is the global `PAGINATION.DEFAULT_PAGE_SIZE` so list-pages and
 * dropdowns stay in sync per §16.6.
 */
export function useVariantsListInfinite(
  search: string,
  options?: { enabled?: boolean } & Omit<
    VariantsListParams,
    "page" | "page_size" | "search"
  >,
) {
  // Dropdown rule: only active variants surface in pickers. Default to
  // `is_active: true` but let an explicit caller override (e.g. an
  // admin surface that genuinely wants archived variants).
  const { enabled = true, is_active = true, ...filters } = options ?? {};
  return useInfiniteQuery({
    queryKey: [...KEY, "list-infinite", { search, is_active, ...filters }],
    queryFn: ({ pageParam }) =>
      fetchVariantsListPage({
        page: pageParam,
        page_size: PAGINATION.DEFAULT_PAGE_SIZE,
        search,
        is_active,
        ...filters,
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
    enabled,
  });
}

/** Single-variant detail. Pass `includeBom: true` from contexts that
 *  render the BOM tab — the value is baked into the queryKey so the
 *  bom-included and bom-omitted caches stay separate (avoids serving
 *  the trimmer response to a caller that asked for the embed). After a
 *  BOM mutation, `useReplaceBom` / `useDeleteBom` invalidate the variant
 *  detail key, so this query refetches with the same `?include=bom` and
 *  the new BOM lands in `variant.bom` on the next paint. */
export function useVariant(
  variantId: string,
  options?: { includeBom?: boolean },
) {
  const includeBom = !!options?.includeBom;
  return useQuery({
    queryKey: [...KEY, variantId, { includeBom }],
    queryFn: () => fetchVariant(variantId, { includeBom }),
    enabled: !!variantId,
  });
}

/**
 * Resolve many variants by id in one hook — for lists that reference variants
 * by id (e.g. the WMS location-contents drawer). Shares cache with
 * `useVariant`, so a row already fetched elsewhere is free here.
 */
export function useVariantsByIds(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: [...KEY, id],
      queryFn: () => fetchVariant(id),
      enabled: !!id,
    })),
  });
}

/** Many variants by id, each with its Reference BOM embedded under `bom`.
 *  Shares cache with `useVariant(id, { includeBom: true })`. */
export function useVariantsWithBomByIds(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: [...KEY, id, { includeBom: true }],
      queryFn: () => fetchVariant(id, { includeBom: true }),
      enabled: !!id,
    })),
  });
}

/** The two part-derived classification fields a catalog line inherits from
 *  its variant: Brand/OEM (lives on the PART) + Condition (on the variant). */
export interface VariantClassification {
  variantId: string;
  oemId: string;
  condition: "new" | "refurbished" | "new_pull";
}

/**
 * Resolve the OEM + condition for many variant ids in one hook.
 *
 * Callers that hold a `part_variant_id` but need its Brand/OEM + Condition
 * — e.g. the Sales Order form auto-filling a quote-driven line, which mirrors
 * a direct part pick — use this. `condition` sits on the variant, but the OEM
 * lives on the PART, so each id needs the variant detail (condition + part_id)
 * and then the part (oem_id). Both hops share the variant/part detail caches,
 * so an id already fetched elsewhere is free here.
 */
export function useVariantClassificationsByIds(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: [...KEY, id, "classification"] as const,
      queryFn: async (): Promise<VariantClassification> => {
        const variant = await fetchVariant(id);
        const part = await fetchPart(variant.part_id);
        return {
          variantId: id,
          oemId: part.oem_id,
          condition: variant.condition,
        };
      },
      enabled: !!id,
    })),
  });
}

export function useCreateVariant(partId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PartVariantCreate) => createVariant(partId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...KEY, "by-part", partId] });
      // Parts list rows fetched with `include_variants: true` embed the
      // variant array on each part — invalidate parts too so the Parts
      // page picks up the new variant row without a manual refresh.
      void qc.invalidateQueries({ queryKey: PARTS_KEY });
      toast.success(VARIANTS_STRINGS.toast.created);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateVariant(variantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PartVariantUpdate) => updateVariant(variantId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      // Same reasoning as useCreateVariant — `include_variants: true`
      // parts rows hold the variant snapshot inline; without this the
      // Parts page shows the pre-edit SKU/price/condition until refresh.
      void qc.invalidateQueries({ queryKey: PARTS_KEY });
      toast.success(VARIANTS_STRINGS.toast.updated);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (variantId: string) => deleteVariant(variantId),
    onSuccess: (_data, variantId) => {
      // Refresh every variants query EXCEPT the deleted variant's own
      // detail query (`[...KEY, variantId]`). A plain invalidate of `KEY`
      // also matches that detail query, and the Variant Details page is
      // still mounted when this runs (the caller navigates away only a
      // tick later, in its own onSuccess) — so the invalidate would
      // refetch GET /ims/variants/:id for an id the backend just
      // deleted, returning 404. The detail query is left untouched; its
      // observer unmounts on navigate and the entry is GC'd.
      // Skip the deleted variant's detail queries (any `?include=` flag
      // variant). `queryKey[2]` used to be the id; after the includeBom
      // addition it's still the id for detail entries — the trailing
      // `{includeBom}` segment sits at [3]. Defensive equality on the
      // string id keeps this resilient to future additions.
      void qc.invalidateQueries({
        queryKey: KEY,
        predicate: (query) => query.queryKey[2] !== variantId,
      });
      // Parts list rows fetched with `include_variants: true` embed the
      // variant array on each part — invalidate parts too so the Parts
      // page drops the deleted variant row without a manual refresh.
      // (PartsPage was the recurring "table doesn't update after delete"
      // symptom.)
      void qc.invalidateQueries({ queryKey: PARTS_KEY });
      toast.success(VARIANTS_STRINGS.toast.deleted);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Reference BOM ───────────────────────────────────────────────────────────
//
// The BOM lives embedded under `variant.bom` on the variant detail GET, so
// readers re-use `useVariant` and pick the field off. These mutations
// invalidate the variant query so the embedded `bom` field re-syncs after
// every save / delete — no manual cache surgery needed.

export function useReplaceBom(variantId: string) {
  const qc = useQueryClient();
  return useMutation<Bom, Error, BomReplace>({
    mutationFn: (body) => replaceBom(variantId, body),
    onSuccess: () => {
      // Only invalidate the variant DETAIL key — that's the surface
      // BomTab reads (`variant.bom`) and the one that actually needs
      // the new data on the next paint. Was also invalidating
      // [...KEY, "list-page"] which prefix-matches BomTab's own
      // variant picker (`useVariantPickerOptions`) AND the cross-part
      // /ims/variants list page on StockPage; both got force-refetched
      // on every BOM save and showed up as 'multiple unnecessary
      // Variant API calls' on each row remove / qty change. Those
      // lists only embed BOM metadata; they refresh on the next mount
      // / window focus (staleTime: 0 + refetchOnMount: "always") so
      // there's no correctness gap.
      void qc.invalidateQueries({ queryKey: [...KEY, variantId] });
      // No success toast — the BomTab auto-saves on every change
      // (add row, remove row, qty edit), and a toast per save would
      // be a storm. The inline 'Saving…' indicator under the items
      // covers the in-flight feedback.
    },
    onError: (e) =>
      toast.error(e.message || VARIANTS_STRINGS.bomToast.saveFailed),
  });
}

export function useDeleteBom(variantId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => deleteBom(variantId),
    onSuccess: () => {
      // Same scoping as useReplaceBom above — list-page invalidate
      // dropped, only the variant detail refetches.
      void qc.invalidateQueries({ queryKey: [...KEY, variantId] });
      // No success toast — same reasoning as useReplaceBom above.
    },
    onError: (e) => {
      // Backend returns 404 BOM_NOT_FOUND on double-clicks so the FE can
      // suppress the toast. Match on the slug rather than HTTP status —
      // the apiClient wraps errors as Error with a message body that
      // includes the slug for typed errors.
      if (/BOM_NOT_FOUND/i.test(e.message)) return;
      toast.error(e.message || VARIANTS_STRINGS.bomToast.deleteFailed);
    },
  });
}
