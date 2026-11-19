import { useInfiniteQuery } from "@tanstack/react-query";

import { FIRST_PAGE, nextPage } from "@shared/api/pagination";

import { type AsyncQueryShape } from "@/components/ui/async-select";
import { PAGINATION } from "@/shared/constants";

import { fetchVariantsListPage } from "../../api";
import type { Bom, VariantListItem } from "../../api";

// ── Component-variant picker (per row) ────────────────────────────────────
//
// Backed by the normal /ims/variants list endpoint (not autocomplete) so
// the picker sees full VariantListItem rows — sku, name, condition,
// part_name — and pages through them as the operator scrolls.
//
// The `search` arg comes in pre-debounced from AsyncSelect (it runs its
// own debounce on the input). Backend enforces min_length=2; sending
// shorter strings just lists every active variant.
function useVariantPickerOptions(
  search: string,
  options: { enabled?: boolean } = {},
): AsyncQueryShape<VariantListItem> {
  const q = search.trim();
  const searchParam = q.length >= 2 ? q : undefined;
  const limit = PAGINATION.DEFAULT_PAGE_SIZE;

  const query = useInfiniteQuery({
    // `search` baked into the queryKey so each typed query is cached
    // separately. `is_active: true` keeps retired variants out of the
    // picker — operators can't unknowingly attach a dead component.
    queryKey: [
      "ims",
      "variants",
      "list-page",
      {
        search: searchParam ?? "",
        page_size: limit,
        is_active: true,
        picker: "bom",
      },
    ],
    queryFn: ({ pageParam }) =>
      fetchVariantsListPage({
        page: pageParam,
        page_size: limit,
        search: searchParam,
        is_active: true,
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
    enabled: options.enabled ?? true,
  });

  return {
    data: query.data
      ? {
          pages: query.data.pages.map((p) => ({ items: p.items })),
        }
      : undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    hasNextPage: !!query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
  };
}

export function variantPickerLabel(v: VariantListItem): string {
  // Dropdown shows only the variant name. The previous
  // 'part_number · part_name' shape duplicated values for variants
  // where part_number and part_name happened to be the same SKU.
  // Brand + SKU columns on the per-row strip below still carry the
  // disambiguating context.
  return v.name || v.part_name || v.part_number || "(unnamed)";
}

// ── Draft row shape ───────────────────────────────────────────────────────
//
// Locally-keyed for stable React reconciliation across re-renders;
// `serverId` carries the server's id (the BOM diff hinges on it). The
// embedded `componentSnapshot` lets the picker render the selected
// component's label without a follow-up fetch when editing an existing
// BOM.
export interface DraftRow {
  localKey: string;
  serverId: string | null;
  component_variant_id: string;
  componentSku: string | null;
  componentBrand: string | null;
  /** Owning part id of the component variant. Used to fan-out a
   *  per-part GET so the brand column can show oem_name for loaded
   *  rows — the BomItemComponentVariant embed doesn't carry it. Null
   *  only if the backend ever returns a row without part_id (defensive). */
  componentPartId: string | null;
  quantity: number;
  /** Position + notes are NOT surfaced in the compact UI anymore, but
   *  the row still tracks them so a round-trip (load + save) preserves
   *  whatever the backend already held — we won't silently null out
   *  values the operator can't see. */
  position: string;
  notes: string;
  /** Primary line in the row — the parent part name ("Dell Latitude 5540"). */
  componentLabel: string;
  /** Secondary line — the variant name ("Latitude 5540"). */
  componentVariantName: string;
}

export function bomToDraft(bom: Bom | null | undefined): DraftRow[] {
  if (!bom) return [];
  return bom.items.map((item, i) => ({
    localKey: `existing-${item.id}-${i}`,
    serverId: item.id,
    component_variant_id: item.component_variant_id,
    componentSku: item.component_variant.sku_code ?? null,
    // The backend's BomItemComponentVariant embed doesn't carry
    // oem_name; brand is filled in via the per-part fan-out below
    // using `componentPartId`. Newly-picked items (via the search)
    // skip the fan-out — the VariantListItem already gives us oem_name.
    componentBrand: null,
    componentPartId: item.component_variant.part_id ?? null,
    quantity: item.quantity,
    position: item.position ?? "",
    notes: item.notes ?? "",
    componentLabel: item.component_variant.part_name,
    componentVariantName: item.component_variant.name,
  }));
}

let localKeyCounter = 0;
export const nextLocalKey = () => `draft-${++localKeyCounter}`;

// Factory returning a custom hook usable as AsyncSelect's `useOptions`
// prop. The returned function starts with `use` so React's rules-of-
// hooks linter recognizes it as a custom hook (not a callback), making
// the inner useVariantPickerOptions call valid. Closes over excludeId
// so the BomTab can scope the dropdown to "everything EXCEPT this
// variant" without having to thread excludeId through AsyncSelect's
// fixed (search, opts) signature.
export function createScopedVariantPicker(excludeId: string) {
  return function useScopedVariantPicker(
    search: string,
    opts?: { enabled?: boolean },
  ): AsyncQueryShape<VariantListItem> {
    const result = useVariantPickerOptions(search, opts);
    if (!result.data) return result;
    return {
      ...result,
      data: {
        pages: result.data.pages.map((p) => ({
          ...p,
          items: p.items.filter((i) => i.id !== excludeId),
        })),
      },
    };
  };
}
