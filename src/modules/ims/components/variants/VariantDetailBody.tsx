import { useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Cpu,
  Package,
  Pencil,
  Trash2,
  Truck,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";




import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { EntityHeader } from "@/components/page-shells/EntityHeader";
import {
  DetailTabs,
  type DetailTab,
} from "@/components/page-shells/DetailTabs";
import { useAuth } from "@shared/auth/use-auth";

import { DeleteWithPreconditionsDialog } from "../../components/shared/DeleteWithPreconditionsDialog";
import {
  useDeleteVariant,
  useVariant,
  useVariantsListPage,
} from "../../hooks/variants/useVariants";
import { usePart } from "../../hooks/parts/useParts";
import { MoveStockDialog, STOCK_TRANSFER_STRINGS } from "@modules/wms";
import { useStockItemsPage } from "../../hooks/stock/useStock";
import {
  hasPMAccess,
  useMyPMAssignments,
} from "../../hooks/pm-assignments/usePMAssignments";
import {
  IMS_PAGE_SIZE,
  IMS_SEARCH_MAX_LEN,
} from "../../constants";
import { usePageSizeParam, useQueryParam } from "@/shared/hooks";
import { AuditTrail } from "../../components/shared/AuditTrail";
import { OverviewTab } from "./VariantOverviewTab";
import { InventoryTab } from "./VariantInventoryTab";
import { QuickStat } from "./QuickStat";
import { formatDate, CONDITION_LABELS } from "./variant-detail-helpers";
import { formatINR } from "../../lib/format";
import { imsCan } from "../../permissions";
import { usePermission } from "@shared/rbac";

// Reuse the tab content shells from PartDetailPage so the two pages
// share the same vocabulary. The Variants tab is intentionally NOT
// imported -- variants don't have sub-variants. Checklist is also
// omitted -- inspection checklists live at the Part level, and the
// Part Detail page is the canonical surface for them; surfacing them
// again on each variant would just duplicate the same list per row.
import { CompatibleTab } from "../parts/CompatibleTab";
import { LinkedOrdersTab } from "../parts/LinkedOrdersTab";
import { MovementsTab } from "../parts/MovementsTab";
// BomTab lives next to its variant-specific hooks under
// components/variants/.
import { BomTab } from "../../components/variants/BomTab";
import { sumStockByStatus } from "../../api";
import { PriceHistoryPanel } from "./PriceHistoryPanel";
import { VARIANTS_STRINGS } from "./variants.strings";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function VariantDetailBody() {
  const { partId = "", variantId = "" } = useParams<{
    partId: string;
    variantId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  // RBAC: read-only users see variant data but not Edit / Delete.
  const { can } = usePermission();
  const canWrite = can([...imsCan.write]);

  // `includeBom: true` adds `?include=bom` to the GET so the variant
  // response carries `variant.bom` (or null). The BOM tab reads that
  // field directly; without the flag the editor never re-hydrates
  // after a save.
  const {
    data: variant,
    isLoading,
    isError,
  } = useVariant(variantId, {
    includeBom: true,
  });
  const { data: part } = usePart(partId);
  // Soft/ATP reserved for THIS variant (units promised to approved SO / Demo /
  // Replacement lines). Read from the cross-part list's `stock_summary.reserved`
  // denorm — the single-variant response only carries the HARD stock_by_status
  // (status='reserved'), a rarely-set bucket that read 0 and never moved on an
  // order approval/fulfil/cancel. Mirrors the Part detail's card.
  const { data: variantStockList } = useVariantsListPage(
    { part_id: partId },
    { enabled: Boolean(partId) },
  );
  const reservedSoft = useMemo(
    () =>
      variantStockList?.items.find((v) => v.id === variantId)?.stock_summary?.reserved ?? 0,
    [variantStockList?.items, variantId],
  );
  // Move Stock at VARIANT level (stock-transfer spec §12). Same dialog as the
  // device page — the dialog self-resolves the movable pool for this variant
  // (available + in_operations units, server-side filtered) via `variantId`,
  // so it never depends on the paginated Inventory table below (CP-352).
  const [moveOpen, setMoveOpen] = useState(false);
  const { data: myAssignments = [] } = useMyPMAssignments();
  const deleteVariant = useDeleteVariant();

  const [deleteOpen, setDeleteOpen] = useState(false);
  // `stock_page` + `stock_search` live in the URL so back-nav restores
  // the same page of stock items AND the search the user had applied.
  const [stockItemsPageRaw, setStockItemsPageRaw] = useQueryParam("stock_page");
  const stockItemsPage = Math.max(1, Number(stockItemsPageRaw ?? "1") || 1);
  const setStockItemsPage = (n: number) =>
    setStockItemsPageRaw(n > 1 ? String(n) : null);
  const [stockSearchRaw] = useQueryParam("stock_search");
  const stockSearch = stockSearchRaw ?? "";
  // Sequential setSearchParams calls stomp each other (each sees the
  // same `prev` URL until React applies the previous). Write search +
  // page in ONE update so the filter actually takes effect.
  const [searchParams, setSearchParams] = useSearchParams();
  // `from=stock-items` is set by StockPage when the user clicks through
  // from the Stock Items tab; we honor it on delete so the post-delete
  // redirect goes back to the same listing the user came from.
  const cameFromStockItems = searchParams.get("from") === "stock-items";
  const setStockSearchAndReset = (v: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v) next.set("stock_search", v);
        else next.delete("stock_search");
        next.delete("stock_page");
        return next;
      },
      { replace: true },
    );
  };
  // Client-side status filter over the loaded units ("all" = no filter).
  // Reset to page 1 in the same URL write so we don't strand on an empty page.
  const stockStatus = searchParams.get("stock_status") ?? "all";
  const setStockStatus = (v: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v && v !== "all") next.set("stock_status", v);
        else next.delete("stock_status");
        next.delete("stock_page");
        return next;
      },
      { replace: true },
    );
  };
  const [stockItemsPageSize, setStockItemsPageSize] = usePageSizeParam({
    key: "stock_page_size",
    pageKey: "stock_page",
    defaultSize: IMS_PAGE_SIZE,
  });

  // Inventory TABLE data — server-paged + server-filtered (§16.7), so a
  // variant with thousands of units never loads them all into the browser.
  // Only fetches while the Inventory tab is showing. `q` respects the
  // backend's 2-character minimum, mirroring the Part-detail inventory list.
  const isInventoryActive = searchParams.get("tab") === "inventory";
  const stockItemsQuery = useStockItemsPage(
    {
      part_variant_id: variantId,
      page: stockItemsPage,
      page_size: stockItemsPageSize,
      q: stockSearch.trim().length >= 2 ? stockSearch.trim().slice(0, IMS_SEARCH_MAX_LEN) : undefined,
      status: stockStatus === "all" ? undefined : [stockStatus],
    },
    { enabled: isInventoryActive },
  );
  const stockRows = stockItemsQuery.data?.items ?? [];
  // Footer count = matches for the current filter (server total).
  const stockItemsTotal = stockItemsQuery.data?.total ?? 0;

  const isAdmin = user?.roles.includes("admin") ?? false;
  const pmAccess = hasPMAccess(
    myAssignments,
    part?.category_id ?? null,
    part?.oem_id ?? null,
    variant?.condition ?? null,
  );
  const canViewPrice = isAdmin || pmAccess.canView;

  // Read the server's breakdown rather than recomputing from the raw items
  // list. The old client-side version had its own hardcoded five-case switch
  // (available/reserved/consumed/damaged/disposed) and ignored
  // workflow_status entirely, so a device mid-inspection counted as
  // available and dispatched units fell through unmatched.
  //
  // `stock_by_status` now carries every bucket and applies the same
  // definition of "available" as the listing, the picker and the denorm:
  // out of the ops pipeline and racked.
  const stockTotals = useMemo(() => {
    const byStatus = variant?.stock_by_status;
    const units = (bucket?: { units: number }) => bucket?.units ?? 0;
    return {
      total: sumStockByStatus(byStatus),
      available: units(byStatus?.available),
      reserved: units(byStatus?.reserved),
      // Everything sitting in a warehouse-operations stage — inspection,
      // repair, paint, QC. Physically here, not dispatchable.
      inOperations: units(byStatus?.in_operations),
      dispatched: units(byStatus?.dispatched),
      issued: units(byStatus?.issued),
      // Fitted inside a parent device (component-tracking D1). Counted and
      // owned, but not sellable until pulled — `installed` is excluded from
      // total_units on purpose, so this tile is the only place it surfaces.
      installed: units(byStatus?.installed),
    };
  }, [variant?.stock_by_status]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError || !variant) {
    return (
      <EmptyState
        title={VARIANTS_STRINGS.notFound.title}
        description={VARIANTS_STRINGS.notFound.description}
        action={{
          label: VARIANTS_STRINGS.notFound.backLabel,
          onClick: () => navigate(`/ims/parts/${partId}?tab=variants`),
        }}
      />
    );
  }

  const conditionMeta = CONDITION_LABELS[variant.condition] ?? {
    label: variant.condition,
    variant: "info" as const,
  };

  const aliasChips = variant.aliases ?? [];
  const hsnCode = variant.hsn_code ?? null;

  // Tab content shells -- mirror PartDetailPage's structure minus Variants

  const overviewTab: DetailTab = {
    id: "overview",
    label: "Overview",
    content: (
      <OverviewTab
        variantId={variant.id}
        description={variant.description}
        specs={variant.specs ?? null}
        aliasChips={aliasChips}
        skuCode={variant.sku_code}
        conditionLabel={conditionMeta.label}
        conditionVariant={conditionMeta.variant}
        isActive={variant.is_active}
        sellPrice={variant.sell_price}
        hsnCode={hsnCode}
      />
    ),
  };

  const inventoryTab: DetailTab = {
    id: "inventory",
    label: "Inventory",
    // Badge shows the variant's TOTAL units (denorm) — always available, even
    // before the tab's paged query has run.
    count: stockTotals.total,
    content: (
      <InventoryTab
        stockItems={stockRows}
        variantSku={variant.sku_code}
        conditionLabel={conditionMeta.label}
        conditionVariant={conditionMeta.variant}
        status={stockStatus}
        onStatusChange={setStockStatus}
        page={stockItemsPage}
        pageSize={stockItemsPageSize}
        total={stockItemsTotal}
        // "Nothing at all" vs "nothing matched this filter": the unfiltered
        // total comes from the always-available stock-by-status denorm.
        allTotal={stockTotals.total}
        search={stockSearch}
        onSearchChange={(v) => setStockSearchAndReset(v)}
        onPageChange={setStockItemsPage}
        onPageSizeChange={setStockItemsPageSize}
      />
    ),
  };

  const bomTab: DetailTab = {
    id: "bom",
    label: "BOM",
    content: (
      <BomTab
        variantId={variant.id}
        bom={variant.bom ?? null}
        categoryId={part?.category_id}
        canWrite={canWrite}
        selfVariantId={variant.id}
      />
    ),
  };

  const compatibleTab: DetailTab = {
    id: "compatible",
    label: "Compatible",
    content: <CompatibleTab />,
  };

  const movementsTab: DetailTab = {
    id: "movements",
    label: "Movements",
    content: <MovementsTab />,
  };

  const linkedOrdersTab: DetailTab = {
    id: "linked-orders",
    label: "Linked Orders",
    content: <LinkedOrdersTab />,
  };

  // Tab id stays `activity` so existing `?tab=activity` shareable URLs
  // still land on the renamed "Audit Trail" tab.
  const activityTab: DetailTab = {
    id: "activity",
    label: "Audit Trail",
    content: <AuditTrail resourceType="part_variant" resourceId={variant.id} />,
  };

  // Price History sits right after Overview: it is the audit answer to
  // "who changed this price and when", and the Overview tab is where the
  // current price is shown. The panel renders nothing for callers without
  // `ims:price_read` (the endpoint 403s), so the tab is harmless for
  // warehouse roles — it simply has no content for them.
  const priceHistoryTab: DetailTab = {
    id: "price-history",
    label: VARIANTS_STRINGS.priceHistory.tabLabel,
    content: <PriceHistoryPanel variantId={variant.id} />,
  };

  const allTabs: DetailTab[] = [
    overviewTab,
    priceHistoryTab,
    inventoryTab,
    bomTab,
    compatibleTab,
    movementsTab,
    linkedOrdersTab,
    activityTab,
  ];

  // "<sku> | <part number>" — the part number links to the parent part.
  const subtitle = (
    <>
      {variant.sku_code}
      {variant.sku_code && part?.part_number ? " | " : null}
      {part?.part_number ? (
        <Link
          to={`/ims/parts/${part.id}`}
          className="font-medium text-info hover:underline"
          title={part.name}
        >
          {part.part_number}
        </Link>
      ) : null}
    </>
  );

  return (
    <div className="space-y-6">
      <EntityHeader
        title={variant.name}
        subtitle={variant.sku_code || part?.part_number ? subtitle : undefined}
        status={{
          label: variant.is_active ? "Active" : "Inactive",
          variant: variant.is_active ? "success" : "neutral",
        }}
        backHref={`/ims/parts/${partId}?tab=variants`}
        actions={
          canWrite ? (
            <>
              <Button variant="outline" onClick={() => setMoveOpen(true)}>
                <ArrowLeftRight className="mr-1.5 size-4" />
                {STOCK_TRANSFER_STRINGS.title}
              </Button>
              <Button
                variant="outline"
                render={
                  <Link
                    to={`/ims/parts/${partId}/variants/${variantId}/edit`}
                  />
                }
              >
                <Pencil className="mr-1.5 size-4" />
                {VARIANTS_STRINGS.headerActions.edit}
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteOpen(true)}
                disabled={deleteVariant.isPending}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-1.5 size-4" />
                {deleteVariant.isPending
                  ? VARIANTS_STRINGS.headerActions.deleting
                  : VARIANTS_STRINGS.headerActions.delete}
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <QuickStat
          icon={<Package className="size-3.5" />}
          label={VARIANTS_STRINGS.quickStats.totalUnits}
          value={stockTotals.total}
        />
        <QuickStat
          icon={<CheckCircle2 className="size-3.5 text-success" />}
          label={VARIANTS_STRINGS.quickStats.available}
          // Net available-to-promise (gross sellable − soft reserved), floored at 0 —
          // same definition as the stock listing's Available column.
          value={Math.max(0, stockTotals.available - reservedSoft)}
          valueClassName="text-success"
        />
        <QuickStat
          icon={<AlertTriangle className="size-3.5 text-warning" />}
          label={VARIANTS_STRINGS.quickStats.reserved}
          // Soft/ATP reserved (promised to approved orders), not the empty hard
          // status='reserved' bucket — see reservedSoft.
          value={reservedSoft}
          valueClassName="text-warning"
        />
        <QuickStat
          icon={<Truck className="size-3.5 text-info" />}
          label={VARIANTS_STRINGS.quickStats.dispatched}
          value={stockTotals.dispatched}
          valueClassName="text-info"
        />
        <QuickStat
          icon={<Cpu className="size-3.5 text-muted-foreground" />}
          label={VARIANTS_STRINGS.quickStats.installed}
          value={stockTotals.installed}
        />
        <QuickStat
          icon={<Wrench className="size-3.5 text-destructive" />}
          label={VARIANTS_STRINGS.quickStats.inOperations}
          value={stockTotals.inOperations}
          valueClassName="text-destructive"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <MoveStockDialog
          open={moveOpen}
          onOpenChange={setMoveOpen}
          // Pass the variant id and an empty unit list so the dialog fetches
          // its own movable pool — available + in_operations units for this
          // variant, server-side filtered — and derives the source warehouse
          // from them. It never reads the paginated Inventory table (CP-352).
          variantId={variantId}
          units={[]}
        />

        {/* `min-w-0` so the `1fr` grid track can shrink below its content
            width — otherwise a wide Inventory table grows this column and
            pushes the fixed 320px side panel off-screen. With the
            track constrained, BMT's own `overflow-x-auto` scrolls the table. */}
        <DetailTabs cardContent tabs={allTabs} defaultTab="overview" className="min-w-0" />

        <div className="space-y-4 lg:mt-14">
          {/* Parent Product — the part this variant belongs to. Click-through
              to its detail page; subtitle = "{oem_name} · {part_number}". */}
          <Card>
            <CardHeader className="pb-3">
              <Typography asChild variant="body">
                <CardTitle>
                  {VARIANTS_STRINGS.parentProduct.cardTitle}
                </CardTitle>
              </Typography>
            </CardHeader>
            <CardContent>
              {part ? (
                <Link
                  to={`/ims/parts/${part.id}`}
                  className="group block rounded-md hover:bg-muted/40"
                >
                  <Typography
                    variant="body"
                    tone="info"
                    truncate
                    className="font-semibold group-hover:underline"
                  >
                    {part.name}
                  </Typography>
                  <Typography
                    asChild
                    variant="helper"
                    truncate
                    className="mt-0.5"
                  >
                    <p>
                      {part.oem_name ?? "—"}
                      <span className="mx-1.5">·</span>
                      <span className="font-mono">{part.part_number}</span>
                    </p>
                  </Typography>
                </Link>
              ) : (
                <Typography asChild variant="helper">
                  <p>{VARIANTS_STRINGS.parentProduct.notAvailable}</p>
                </Typography>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Typography asChild variant="body">
                <CardTitle>
                  {VARIANTS_STRINGS.variantInfo.cardTitle}
                </CardTitle>
              </Typography>
            </CardHeader>
            <Typography asChild variant="body">
              <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {VARIANTS_STRINGS.variantInfo.skuCode}
                </span>
                {/* Same size and weight as the other values, so the row lines up. */}
                <span className="min-w-0 break-all pl-3 text-right font-medium">
                  {variant.sku_code ?? "\u2014"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {VARIANTS_STRINGS.variantInfo.parentPart}
                </span>
                {part ? (
                  <Link
                    to={`/ims/parts/${part.id}`}
                    className="min-w-0 break-all pl-3 text-right font-medium text-info hover:underline"
                  >
                    {part.part_number}
                  </Link>
                ) : (
                  <span className="min-w-0 break-all pl-3 text-right font-medium">{partId}</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {VARIANTS_STRINGS.variantInfo.category}
                </span>
                <span className="font-medium">
                  {part?.category_name ?? "\u2014"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {VARIANTS_STRINGS.variantInfo.brandOem}
                </span>
                <span className="font-medium">
                  {part?.oem_name ?? "\u2014"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {VARIANTS_STRINGS.variantInfo.hsnCode}
                </span>
                <span className="font-medium">{hsnCode ?? "\u2014"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {VARIANTS_STRINGS.variantInfo.productType}
                </span>
                <StatusBadge variant="neutral">
                  {VARIANTS_STRINGS.variantInfo.productTypeValue}
                </StatusBadge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {VARIANTS_STRINGS.variantInfo.condition}
                </span>
                <StatusBadge variant={conditionMeta.variant}>
                  {conditionMeta.label}
                </StatusBadge>
              </div>
              {variant.is_default && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {VARIANTS_STRINGS.variantInfo.defaultLabel}
                  </span>
                  <StatusBadge variant="info">
                    {VARIANTS_STRINGS.variantInfo.defaultVariantBadge}
                  </StatusBadge>
                </div>
              )}
              {canViewPrice && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {VARIANTS_STRINGS.variantInfo.price}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatINR(Number(variant.sell_price ?? 0))}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {VARIANTS_STRINGS.variantInfo.currency}
                </span>
                <span className="font-medium">{variant.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {VARIANTS_STRINGS.variantInfo.created}
                </span>
                <span className="font-medium">
                  {formatDate(variant.created_at)}
                </span>
              </div>
              </CardContent>
            </Typography>
          </Card>
        </div>
      </div>

      {/* Delete variant \u2014 guard mirrors `part_service.delete_variant()`:
          409 if any stock items still reference this variant. */}
      <DeleteWithPreconditionsDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={VARIANTS_STRINGS.deleteDialog.title}
        entityName={variant.name}
        description={VARIANTS_STRINGS.deleteDialog.description}
        preconditions={[
          {
            // `available_qty` is the rolled-up stock count returned by
            // `GET /ims/variants/{id}` \u2014 the page already has it via
            // `useVariant(variantId)` above, so no extra fetch is
            // needed for this row.
            satisfied: Number(variant.available_qty ?? 0) === 0,
            label: VARIANTS_STRINGS.deleteDialog.noStockLabel,
            detail:
              Number(variant.available_qty ?? 0) > 0
                ? VARIANTS_STRINGS.deleteDialog.stockStillLinked(
                    Number(variant.available_qty),
                  )
                : undefined,
          },
        ]}
        isPending={deleteVariant.isPending}
        confirmLabel={VARIANTS_STRINGS.deleteDialog.confirmLabel}
        onConfirm={() =>
          deleteVariant.mutate(variant.id, {
            onSuccess: () => {
              // No removeQueries here: it triggers the still-mounted
              // useVariant(id) observer to re-fetch, hitting GET
              // /ims/variants/<deleted-id> and 404. useDeleteVariant's
              // predicate-skip handles the invalidate without queueing
              // a refetch for the deleted id; the cache entry stays
              // until this page unmounts on navigate below.
              setDeleteOpen(false);
              // Round-trip back to the originating listing: Stock Items
              // when the user came from that tab, the part's Variants
              // tab otherwise.
              navigate(
                cameFromStockItems
                  ? "/ims/stock-items"
                  : `/ims/parts/${partId}?tab=variants`,
              );
            },
          })
        }
      />
    </div>
  );
}
