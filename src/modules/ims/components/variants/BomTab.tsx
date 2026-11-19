import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Package, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { partOptionDescription } from "../../lib/part-description"

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { Typography } from "@/components/ui/typography";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AsyncSelect } from "@/components/ui/async-select";

import { useReplaceBom, useDeleteBom } from "../../hooks/variants/useVariants";
import { useCategory } from "../../hooks/categories/useCategories";
import { PARTS_KEY } from "../../hooks/parts/useParts";
import { fetchPart } from "../../api";
import { useQueries } from "@tanstack/react-query";
import type { Bom, BomItemReplace, VariantListItem } from "../../api";
import { VARIANTS_STRINGS } from "./variants.strings";
import { BomLine } from "./BomLine";
import {
  bomToDraft,
  createScopedVariantPicker,
  nextLocalKey,
  variantPickerLabel,
  type DraftRow,
} from "./bom-tab-helpers";

// Variant detail "BOM" tab. One Reference BOM per variant — the editor
// holds a local draft until the operator clicks Save BOM, which fires a
// declarative PUT to the backend. Items missing from the payload
// soft-delete server-side; items with a known `id` preserve / update in
// place; items without `id` insert with a fresh UUIDv7. See
// `app/modules/ims/services/bom_service.py` for the diff semantics.

interface BomTabProps {
  variantId: string;
  /** Embedded BOM from the variant fetch (`variant.bom`). Null when no
   *  live BOM exists. Source of truth for the editor's initial state. */
  bom: Bom | null | undefined;
  /** The owner part's category id — drives the `is_bom_eligible` check.
   *  When the category isn't BOM-eligible, the editor is hidden. */
  categoryId: string | undefined;
  canWrite: boolean;
  /** Component variants the user can pick as BOM items must NOT include
   *  the owner variant itself — that would let an operator declare a
   *  self-referencing BOM. Backend rejects it too; the FE guard is a
   *  faster signal. */
  selfVariantId: string;
}

export function BomTab({
  variantId,
  bom,
  categoryId,
  canWrite,
  selfVariantId,
}: BomTabProps) {
  const replaceBom = useReplaceBom(variantId);
  const deleteBom = useDeleteBom(variantId);
  const categoryQuery = useCategory(categoryId ?? "");
  const category = categoryQuery.data;
  const eligibilityLoading = !!categoryId && categoryQuery.isLoading;
  // Default to `true` only while the category is unknown (no id passed,
  // pre-fetch flash). Once the response lands, trust the server's value
  // literally — defaulting to `true` for an explicit `false` would let
  // the editor render only to bounce off the 422 on save.
  const isBomEligible = category ? !!category.is_bom_eligible : !categoryId;

  const [draft, setDraft] = useState<DraftRow[]>(() => bomToDraft(bom));
  const [headerNotes, setHeaderNotes] = useState<string>(bom?.notes ?? "");
  // Per-row remove confirmation: holds the localKey of the row whose
  // × was just clicked. Null when no remove is pending. Confirmation
  // is required on every × click so an accidental click doesn't
  // silently drop a row from the draft.
  const [pendingRemoveKey, setPendingRemoveKey] = useState<string | null>(null);

  // Re-hydrate the draft only when the upstream BOM CONTENT actually
  // changes (id + updated_at). The variant query has staleTime: 0 and
  // refetchOnWindowFocus: true (project defaults), which produces a
  // fresh `bom` REFERENCE on every refetch — even when the data is
  // unchanged. A naive `[bom]` dependency would then wipe the user's
  // unsaved row adds / removes every time the window regained focus or
  // any nearby query invalidated. The signature compare here treats
  // identical content as a no-op; only a real save / external update
  // (id change null↔non-null, or new updated_at) re-seeds the draft.
  // Guard A: rehydrate gated on bom content signature (id + updated_at).
  // Window-focus refetches that return the same data are a no-op.
  const lastBomSignatureRef = useRef<string>("");
  // Guard B: dedupe in-flight + redundant persists. Auto-save fires after
  // a 350ms debounce, but the refetch that follows replaceBom is async —
  // there's a window where isPending flips false while the cached `bom`
  // hasn't updated yet, so the effect would schedule a second timer and
  // re-send the same payload. The intent ref tracks the last-sent
  // (notes, items[]) shape; persistDraft skips when the next call would
  // send the same payload.
  const lastSavedIntentRef = useRef<string>("");

  useEffect(() => {
    const sig = bom ? `${bom.id}|${bom.updated_at}` : "<none>";
    if (sig === lastBomSignatureRef.current) return;
    lastBomSignatureRef.current = sig;
    setDraft(bomToDraft(bom));
    setHeaderNotes(bom?.notes ?? "");
    // Reset the intent guard whenever the BOM actually changes —
    // covers our own save (new updated_at) and external edits. After
    // this, a local edit that happens to match the previously-sent
    // intent can still trigger a re-save if it should.
    lastSavedIntentRef.current = "";
  }, [bom]);

  const dirty = useMemo(() => {
    if (!bom) return draft.length > 0 || headerNotes.length > 0;
    if ((bom.notes ?? "") !== headerNotes) return true;
    if (bom.items.length !== draft.length) return true;
    return draft.some((row) => {
      const matched = bom.items.find((i) => i.id === row.serverId);
      if (!matched) return true;
      return (
        matched.component_variant_id !== row.component_variant_id ||
        matched.quantity !== row.quantity ||
        (matched.position ?? "") !== row.position ||
        (matched.notes ?? "") !== row.notes
      );
    });
  }, [bom, draft, headerNotes]);

  // Search-to-add: picking a variant in the search bar mints a row
  // pre-filled with the picked component. The auto-save effect below
  // catches the dirty state on the next tick and commits the row to
  // the server. Save BOM button is gone — every change persists
  // automatically.
  const addRowFromVariant = (v: VariantListItem) => {
    if (v.id === selfVariantId) {
      toast.error(VARIANTS_STRINGS.bomToast.selfReference);
      return;
    }
    if (draft.some((r) => r.component_variant_id === v.id)) {
      toast.error(
        VARIANTS_STRINGS.bomToast.alreadyInBom(variantPickerLabel(v)),
      );
      return;
    }
    setDraft((rows) => [
      ...rows,
      {
        localKey: nextLocalKey(),
        serverId: null,
        component_variant_id: v.id,
        componentSku: v.part_number || null,
        componentBrand: v.oem_name || null,
        componentPartId: v.part_id || null,
        quantity: 1,
        position: "",
        notes: "",
        componentLabel: v.part_name || v.name,
        componentVariantName: v.name,
      },
    ]);
  };

  const updateRow = (localKey: string, patch: Partial<DraftRow>) =>
    setDraft((rows) =>
      rows.map((r) => (r.localKey === localKey ? { ...r, ...patch } : r)),
    );

  // Scoped picker hook: hides the current variant from the dropdown
  // so the user can't pick a self-reference. We re-use the underlying
  // paginated query (same network calls, same cache) and drop the
  // matching id from each page's items after the fetch lands. The
  // page containing the self variant just renders one fewer item.
  // The defensive `v.id === selfVariantId` check inside
  // addRowFromVariant stays as belt-and-suspenders — never fires in
  // normal flow now, but covers any future surface that bypasses the
  // picker.
  //
  // The factory pattern (createScopedVariantPicker) lives at module
  // scope so the returned `useScoped…` function is a top-level custom
  // hook from React's perspective — calling another hook inside it is
  // valid (Rules of Hooks).
  const useScopedVariantPicker = useMemo(
    () => createScopedVariantPicker(selfVariantId),
    [selfVariantId],
  );

  // Per-part fan-out for the brand column.
  //
  // `BomItemComponentVariant` (the embed on /variants/:id?include=bom) ships
  // `part_id` but not `oem_name`. PartResponse does carry oem_name, so we
  // fire one GET per unique part_id with a queryKey that mirrors
  // `usePart(id)` exactly — that way the calls share cache with any other
  // part detail / picker fetch in the session and won't re-hit the network
  // on revisit. Rows added through the search picker (which DO have
  // oem_name on hand) are skipped via the `r.componentBrand` filter, so
  // the fan-out only runs for loaded items missing brand.
  const partIdsNeedingBrand = useMemo(() => {
    const ids = new Set<string>();
    for (const row of draft) {
      if (row.componentBrand) continue;
      if (!row.componentPartId) continue;
      ids.add(row.componentPartId);
    }
    return Array.from(ids);
  }, [draft]);

  const partBrandQueries = useQueries({
    queries: partIdsNeedingBrand.map((id) => ({
      queryKey: [...PARTS_KEY, id],
      queryFn: () => fetchPart(id),
      enabled: !!id,
    })),
  });

  const partIdToBrand = useMemo(() => {
    const map = new Map<string, string>();
    partBrandQueries.forEach((q, i) => {
      const id = partIdsNeedingBrand[i];
      const name = q.data?.oem_name;
      if (id && name) map.set(id, name);
    });
    return map;
  }, [partBrandQueries, partIdsNeedingBrand]);

  // Project the looked-up brand onto each row without mutating the
  // saved draft state — the persisted payload never includes brand,
  // so this is purely a display concern.
  const displayDraft = useMemo<DraftRow[]>(
    () =>
      draft.map((row) =>
        row.componentBrand || !row.componentPartId
          ? row
          : {
              ...row,
              componentBrand: partIdToBrand.get(row.componentPartId) ?? null,
            },
      ),
    [draft, partIdToBrand],
  );

  // Persist `rows` to the server. Routes to DELETE when the list is
  // empty AND a saved BOM exists (backend's BomReplace requires ≥1
  // item, so an empty save is invalid). Validates rows up-front; any
  // toast errors here bail without firing the mutation.
  //
  // Dedupe via lastSavedIntentRef: a stringified (notes, items[])
  // 'intent' signature is computed BEFORE the mutation. If the same
  // intent was just sent, skip — covers the case where replaceBom's
  // invalidate has fired but the variant refetch hasn't returned yet,
  // so the dirty memo still says true and the auto-save effect would
  // otherwise re-fire for the identical payload. The intent omits
  // serverId on purpose: round-tripping draft → server → rehydrate
  // gives the same logical content, so the next persist (if dirty
  // false → true → false during the refetch race) skips correctly.
  const persistDraft = async (rows: DraftRow[]) => {
    const trimmedNotes = headerNotes.trim() || null;

    // Empty → DELETE (only if a saved BOM exists; otherwise nothing
    // to do). Use a sentinel intent so back-to-back deletes are also
    // deduped.
    if (rows.length === 0) {
      if (!bom) return;
      const intent = "__delete__";
      if (intent === lastSavedIntentRef.current) return;
      lastSavedIntentRef.current = intent;
      try {
        await deleteBom.mutateAsync();
      } catch {
        lastSavedIntentRef.current = "";
      }
      return;
    }

    // Validation — any failure bails without firing the mutation.
    for (const [i, row] of rows.entries()) {
      if (!row.component_variant_id) {
        toast.error(VARIANTS_STRINGS.bomToast.missingComponent(i + 1));
        return;
      }
      if (row.component_variant_id === selfVariantId) {
        toast.error(VARIANTS_STRINGS.bomToast.selfReferenceRow(i + 1));
        return;
      }
      if (row.quantity < 1 || row.quantity > 10_000) {
        toast.error(VARIANTS_STRINGS.bomToast.qtyOutOfRange(i + 1));
        return;
      }
    }
    const seen = new Set<string>();
    for (const [i, row] of rows.entries()) {
      if (seen.has(row.component_variant_id)) {
        toast.error(
          VARIANTS_STRINGS.bomToast.duplicateComponent(
            i + 1,
            row.componentLabel || "this component",
          ),
        );
        return;
      }
      seen.add(row.component_variant_id);
    }

    const intent = JSON.stringify({
      notes: trimmedNotes,
      items: rows.map((r) => ({
        cvid: r.component_variant_id,
        q: r.quantity,
        p: r.position.trim() || null,
        n: r.notes.trim() || null,
      })),
    });
    if (intent === lastSavedIntentRef.current) return;
    lastSavedIntentRef.current = intent;

    const items: BomItemReplace[] = rows.map((row) => ({
      ...(row.serverId ? { id: row.serverId } : {}),
      component_variant_id: row.component_variant_id,
      quantity: row.quantity,
      position: row.position.trim() || null,
      notes: row.notes.trim() || null,
    }));
    try {
      await replaceBom.mutateAsync({
        notes: trimmedNotes,
        items,
      });
    } catch {
      // Reset the intent so a retry (next dirty cycle) actually sends.
      lastSavedIntentRef.current = "";
    }
  };

  // Per-row remove confirmation. The component name shown in the
  // dialog body comes from the draft row's stored label so the
  // operator confirms against what they just saw, not against a fresh
  // backend lookup. The auto-save effect below catches the change and
  // commits it.
  const pendingRemoveRow = draft.find((r) => r.localKey === pendingRemoveKey);
  const handleConfirmRemove = () => {
    if (!pendingRemoveKey) return;
    setDraft((rows) => rows.filter((r) => r.localKey !== pendingRemoveKey));
    setPendingRemoveKey(null);
  };

  // ── Auto-save ──────────────────────────────────────────────────────
  //
  // Single source of truth: whenever the draft becomes dirty (added
  // row, removed row, qty edit, etc.) the timer below schedules a
  // persistDraft. Debounce ≈ 350ms so a stream of qty keystrokes
  // coalesces into one server call but a single add/remove feels
  // instant. `persistRef` keeps the latest closure without forcing the
  // effect to rerun on every render.
  const persistRef = useRef<(rows: DraftRow[]) => Promise<void>>(persistDraft);
  persistRef.current = persistDraft;
  const inFlightRef = useRef(false);
  useEffect(() => {
    if (!dirty) return;
    if (replaceBom.isPending || deleteBom.isPending) return;
    const timer = setTimeout(() => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      void persistRef.current(draft).finally(() => {
        inFlightRef.current = false;
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [dirty, draft, replaceBom.isPending, deleteBom.isPending]);

  const isSaving = replaceBom.isPending || deleteBom.isPending;

  // ── Eligibility / loading states ────────────────────────────────────
  if (eligibilityLoading) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <Typography variant="body" tone="muted">
          {VARIANTS_STRINGS.bom.loadingCategory}
        </Typography>
      </div>
    );
  }

  if (!isBomEligible) {
    // Surface the category name + id so the operator can tell whether
    // they enabled BOM on the wrong category (sub-category and parents
    // don't inherit — backend rejects unless THIS category's flag is
    // true). Refresh forces a fresh /categories/:id call in case the
    // cache is stale across tabs.
    const categoryName = category?.name ?? "this category";
    return (
      <div className="space-y-3 rounded-lg border border-dashed bg-muted/10 p-8 text-center">
        <Typography variant="body-strong">
          {VARIANTS_STRINGS.bom.bomsNotEnabled(categoryName)}
        </Typography>
        <Typography variant="helper" tone="muted">
          {VARIANTS_STRINGS.bom.bomsNotEnabledDetail(categoryName)}
        </Typography>
        {canWrite && (
          <div className="flex items-center justify-center gap-2 pt-1">
            {categoryId && (
              <Button
                size="sm"
                variant="outline"
                render={<Link to={`/ims/categories/${categoryId}`} />}
              >
                {VARIANTS_STRINGS.bom.openCategory(categoryName)}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void categoryQuery.refetch()}
              disabled={categoryQuery.isFetching}
              aria-label={VARIANTS_STRINGS.bom.recheckAriaLabel}
            >
              <RefreshCw
                className={
                  "mr-1.5 size-3.5" +
                  (categoryQuery.isFetching ? " animate-spin" : "")
                }
              />
              {categoryQuery.isFetching
                ? VARIANTS_STRINGS.bom.checking
                : VARIANTS_STRINGS.bom.recheck}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ── Editor ─────────────────────────────────────────────────────────
  //
  // Inline editor — no accordion chrome, no "Reference BOM" header.
  // The tab itself is already labelled BOM, so a section header here
  // would just repeat the surface name.

  return (
    <div className="space-y-3">
      {/* Search-to-add. Picking a variant adds a row immediately via
          `onItemPick` (carries the full VariantListItem;
          `onValueChange` would only carry the slim {id, label}). */}
      {canWrite && (
        <Typography asChild variant="body">
          <AsyncSelect<VariantListItem>
            value={null}
            onValueChange={() => {
              // No-op: state is set by onItemPick which carries the
              // full row. The click handler is gated on this being
              // present so it can't be omitted.
            }}
            onItemPick={(item) => addRowFromVariant(item)}
            useOptions={useScopedVariantPicker}
            toLabel={variantPickerLabel}
            getDescription={partOptionDescription}
            placeholder={VARIANTS_STRINGS.bom.searchPlaceholder}
            searchPlaceholder={VARIANTS_STRINGS.bom.searchPlaceholder}
            disabled={replaceBom.isPending}
            chevron="none"
            clearable={false}
            className="h-10 w-full"
          />
        </Typography>
      )}

      {/* BOM-level notes input is hidden per product. The `headerNotes`
          state + the load effect + the save payload field all stay
          intact, so any value already on `bom.notes` for a loaded BOM
          round-trips unchanged on the next save. To restore the input,
          drop this comment and render <BomHeaderNotes value={headerNotes}
          onChange={setHeaderNotes} canWrite={canWrite} /> here. */}

      {/* Item list — iterates `displayDraft` so each row's brand column
          reflects the looked-up oem_name. The underlying `draft` is
          unchanged; only the rendered shape is enriched. */}
      {displayDraft.length === 0 ? (
        <EmptyState
          icon={Package}
          title={VARIANTS_STRINGS.bom.emptyTitle}
          description={
            canWrite
              ? VARIANTS_STRINGS.bom.addFirstComponent
              : VARIANTS_STRINGS.bom.noBomDefined
          }
        />
      ) : (
        <ol className="overflow-hidden rounded-md border bg-card">
          {displayDraft.map((row) => (
            <BomLine
              key={row.localKey}
              row={row}
              canWrite={canWrite}
              onChange={(patch) => updateRow(row.localKey, patch)}
              onRemove={() => setPendingRemoveKey(row.localKey)}
              disabled={replaceBom.isPending || deleteBom.isPending}
            />
          ))}
        </ol>
      )}

      {/* Inline auto-save indicator — small text right-aligned under
          the list. Only renders during an in-flight save; otherwise
          there's no chrome at all. */}
      {isSaving && (
        <div className="flex items-center justify-end">
          <Typography variant="helper" tone="muted">
            {VARIANTS_STRINGS.bom.saving}
          </Typography>
        </div>
      )}

      {/* Per-row remove confirmation. Fires whenever a × is clicked on
          a BomLine; on confirm, the row is dropped from the draft and
          the auto-save effect commits the change ~350ms later. */}
      <AlertDialog
        open={pendingRemoveKey !== null}
        onOpenChange={(open) => !open && setPendingRemoveKey(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {VARIANTS_STRINGS.removeDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemoveRow?.componentLabel ??
                VARIANTS_STRINGS.removeDialog.fallbackRowLabel}
              {VARIANTS_STRINGS.removeDialog.descriptionSuffix}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {VARIANTS_STRINGS.removeDialog.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmRemove();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground"
            >
              {VARIANTS_STRINGS.removeDialog.remove}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
