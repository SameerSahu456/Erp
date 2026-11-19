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
  Boxes,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Package,
  Pencil,
  Trash2,
  Truck,
  Wrench,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@shared/errors/ErrorBoundary";
import { EntityHeader } from "@/components/page-shells/EntityHeader";
import {
  DetailTabs,
  type DetailTab,
} from "@/components/page-shells/DetailTabs";

import { useDeletePart, usePart } from "../../hooks/parts/useParts";
import {
  useClearFiltersOnReload,
  usePageSizeParam,
  useQueryParam,
} from "@/shared/hooks";
import {
  useVariantsPage,
  useVariantsListPage,
  useDeleteVariant,
  useVariant,
} from "../../hooks/variants/useVariants";
import { useStockItemsPage } from "../../hooks/stock/useStock";
import { MoveStockDialog, STOCK_TRANSFER_STRINGS } from "@modules/wms";
import { AuditTrail } from "../../components/shared/AuditTrail";
import { IMS_PAGE_SIZE, IMS_SEARCH_MAX_LEN } from "../../constants";
import { uomLabel } from "../../uom";
import { sumStockByStatus } from "../../api";
import type { PartVariant } from "../../api";
import { DeleteWithPreconditionsDialog } from "../../components/shared/DeleteWithPreconditionsDialog";
import { formatINR } from "../../lib/format";
import { imsCan } from "../../permissions";
import { usePermission } from "@shared/rbac";
import { PARTS_STRINGS } from "./parts.strings";
import { formatDate, isTabKey, type TabKey } from "./part-detail-helpers";
import { QuickStat } from "./QuickStat";
import { OverviewTab } from "./OverviewTab";
import { InventoryTab } from "./InventoryTab";
import { VariantsTab } from "./VariantsTab";
import { ChecklistTab } from "./ChecklistTab";
import { CompatibleTab } from "./CompatibleTab";
import { MovementsTab } from "./MovementsTab";
import { LinkedOrdersTab } from "./LinkedOrdersTab";
import { PartKitTab } from "./kit/PartKitTab";
import { PART_KIT_STRINGS } from "./kit/part-kit.strings";

const SD = PARTS_STRINGS.detail;
const SV = PARTS_STRINGS.variants;
const SDV = PARTS_STRINGS.deleteVariant;
const SDP = PARTS_STRINGS.deletePart;

export function PartDetailBody() {
  const { partId = "" } = useParams<{ partId: string }>();
  const navigate = useNavigate();

  // A browser refresh is "start over": clear the URL-persisted list-view
  // filters (Inventory search/status/condition, Variants search/page) — and any
  // BMT sessionStorage — while keeping the active `tab`, so a refresh no longer
  // rehydrates the old filters. SPA back-nav still restores them.
  useClearFiltersOnReload({ keep: ["tab"] });

  // RBAC: read-only users see the part + variants + checklists without
  // the Edit / Add / Delete action affordances.
  const { can } = usePermission();
  // Stock relocation / transfer (stock-transfer spec §12), surfaced as a
  // PAGE-level action rather than inside the Inventory tab — it acts on the
  // part, and burying it in a tab made it undiscoverable.
  //
  // Only AVAILABLE, serialised units in ONE warehouse are offered: relocation
  // cannot cross warehouses, so a mixed list would fail every unit on the
  // backend's CROSS_WAREHOUSE_LOCATION guard and reject the whole batch.
  const canWrite = can([...imsCan.write]);

  const { data: part, isLoading, isError } = usePart(partId);

  // `variants_page` + `variants_search` live in the URL so back-nav from
  // a Variant detail page restores the same page AND the search the
  // user had applied. `useVariantsPage` doesn't accept a server-side
  // search param, so the search filters the visible page client-side.
  // Page size stays local — power preference.
  const [variantsPageRaw, setVariantsPageRaw] = useQueryParam("variants_page");
  const variantsPage = Math.max(1, Number(variantsPageRaw ?? "1") || 1);
  const setVariantsPage = (n: number) =>
    setVariantsPageRaw(n > 1 ? String(n) : null);
  const [variantsSearchRaw, setVariantsSearchRaw] =
    useQueryParam("variants_search");
  const variantsSearch = variantsSearchRaw ?? "";
  // Inventory tab — server-paginated stock items across every variant
  // under this part (uses /stock-items?part_id=…). URL state lives in
  // separate keys so navigating between tabs doesn't stomp filters.
  // Query is GATED on the Inventory tab being active so opening a part
  // on Overview / Variants / Activity doesn't fire a /stock-items
  // request the user can't see.
  const [inventorySearchRaw, setInventorySearchRaw] =
    useQueryParam("inventory_search");
  const inventorySearch = inventorySearchRaw ?? "";
  const [inventoryPageRaw, setInventoryPageRaw] =
    useQueryParam("inventory_page");
  const inventoryPage = Math.max(1, Number(inventoryPageRaw ?? "1") || 1);
  const setInventoryPage = (n: number) =>
    setInventoryPageRaw(n > 1 ? String(n) : null);
  const [inventoryPageSize, setInventoryPageSize] = usePageSizeParam({
    key: "inventory_page_size",
    pageKey: "inventory_page",
    defaultSize: IMS_PAGE_SIZE,
  });
  // Backend rejects search < 2 chars on /stock-items.
  const inventorySearchParam =
    inventorySearch.trim().length >= 2
      ? inventorySearch.trim().slice(0, IMS_SEARCH_MAX_LEN) // cap so a long paste can't 422
      : undefined;
  // Active-tab gate — read the URL param early so the query below can
  // skip the network call unless the operator is actually on Inventory.
  // (The same `searchParams` instance powers the `tab` derivation
  // further down — calling useSearchParams twice would be wasteful, but
  // the second derivation reads it from the same hook value.)
  const [tabSearchParams, setSearchParams] = useSearchParams();
  const isInventoryActive = tabSearchParams.get("tab") === "inventory";
  // Server-side status filter ("all" = no filter). Changing it resets to page 1
  // in one URL write so we never strand on an empty trailing page.
  const inventoryStatus = tabSearchParams.get("inventory_status") ?? "all";
  const setInventoryStatus = (v: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v && v !== "all") next.set("inventory_status", v);
        else next.delete("inventory_status");
        next.delete("inventory_page");
        return next;
      },
      { replace: true },
    );
  };
  // Server-side condition filter — sibling of Status, same reset-to-page-1 write.
  const inventoryCondition =
    tabSearchParams.get("inventory_condition") ?? "all";
  const setInventoryCondition = (v: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v && v !== "all") next.set("inventory_condition", v);
        else next.delete("inventory_condition");
        next.delete("inventory_page");
        return next;
      },
      { replace: true },
    );
  };
  // Clear ALL inventory filters in a SINGLE URL write. Calling the individual
  // setters in sequence doesn't work: each `setSearchParams(prev => …)` reads the
  // same pre-update URL, so the last write wins and the others (status, search)
  // are clobbered — the "Clear Filters" button then only cleared one filter.
  const clearInventoryFilters = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("inventory_status");
        next.delete("inventory_condition");
        next.delete("inventory_search");
        next.delete("inventory_page");
        return next;
      },
      { replace: true },
    );
  };
  const stockItemsQuery = useStockItemsPage(
    {
      part_id: partId,
      page: inventoryPage,
      page_size: inventoryPageSize,
      q: inventorySearchParam,
      // The filter is repeatable server-side now; this dropdown is
      // single-select, so it sends a one-element list.
      status: inventoryStatus === "all" ? undefined : [inventoryStatus],
      condition:
        inventoryCondition === "all" ? undefined : inventoryCondition,
    },
    { enabled: isInventoryActive },
  );
  const stockItems = stockItemsQuery.data?.items ?? [];
  const stockItemsTotal = stockItemsQuery.data?.total ?? 0;
  // Move Stock at PART level. The dialog self-resolves its own movable pool
  // (available + in_operations units across this part's variants, server-side
  // filtered) from `partId`, so it never depends on the paginated Inventory
  // tab query above (CP-352).
  const [moveOpen, setMoveOpen] = useState(false);
  const [variantsPageSize, setVariantsPageSize] = usePageSizeParam({
    key: "variants_page_size",
    pageKey: "variants_page",
    defaultSize: IMS_PAGE_SIZE,
  });
  // Variants stay fetched on every tab — the right-hand side panel (always
  // visible) reads `defaultVariant.sell_price` and `defaultVariant.condition`
  // off the first page of variants. Gating this on tab broke Overview's
  // side panel for a saved trip that wasn't actually wasted.
  const { data: variantsData, isFetching: variantsFetching } = useVariantsPage(
    partId,
    { page: variantsPage, page_size: variantsPageSize },
  );
  const variants = variantsData?.items ?? [];
  const variantsTotal = variantsData?.total ?? 0;
  const variantsTotalPages = Math.max(
    1,
    Math.ceil(variantsTotal / variantsPageSize),
  );

  // Per-variant stock for the side "Variants" card. `useVariantsPage`
  // (per-part list) omits the stock denorm, so this reads the cross-part
  // list (VariantListItem) filtered to this part — the same
  // `part_variants.stock_summary` denorm columns, no extra backend cost.
  const variantStockQuery = useVariantsListPage(
    { part_id: partId },
    { enabled: Boolean(partId) },
  );
  const variantStockItems = variantStockQuery.data?.items ?? [];
  const variantStockTotal = variantStockQuery.data?.total ?? 0;

  // Soft / ATP reserved (D69 Layer 1) — units promised to approved orders
  // (Sales Order / Demo / Replacement), summed across the part's variants from
  // the `stock_summary.reserved` denorm. This is what "Reserved" means to a
  // stock manager and it moves when an SO line is approved / fulfilled /
  // cancelled. The quick stat previously read the HARD `stock_by_status.reserved`
  // (physical units flagged `status='reserved'`), a rarely-set bucket that read
  // 0 and never responded to those actions.
  const reservedSoft = useMemo(
    () =>
      (variantStockQuery.data?.items ?? []).reduce(
        (sum, v) => sum + (v.stock_summary?.reserved ?? 0),
        0,
      ),
    [variantStockQuery.data?.items],
  );

  const [pendingDeleteVariant, setPendingDeleteVariant] =
    useState<PartVariant | null>(null);
  const deleteVariant = useDeleteVariant();
  // Lazy refetch of the variant by id when the delete dialog opens —
  // the variants-list payload doesn't include the stock rollup, but
  // `GET /ims/variants/{id}` returns `available_qty`. `useVariant` is
  // gated on a truthy id, so this fires only when a row's Delete
  // button populates the state.
  const pendingVariantQuery = useVariant(pendingDeleteVariant?.id ?? "");
  const pendingVariantStockQty = Number(
    pendingVariantQuery.data?.available_qty ?? 0,
  );

  // Part-level delete confirmation. Preconditions mirror
  // `part_service.delete_part()` guards: only the default variant may
  // remain (`variant_count <= 1`), and the default variant must have
  // zero stock. Both counts are already on the Part payload.
  const [showDeletePart, setShowDeletePart] = useState(false);
  const deletePart = useDeletePart();

  // Tab persistence in URL — read-only. DetailTabs owns its own active state
  // after mount; we use the URL param as the initial tab so a refresh / share
  // / back navigation still lands on the right tab.
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: TabKey = isTabKey(tabParam) ? tabParam : "overview";
  // `from=stock-items` is set by StockPage when a parent-part stock-item
  // row is clicked. Honored on part-level delete so the post-delete
  // redirect lands on the Stock Items tab instead of the Parts listing.
  const cameFromStockItems = searchParams.get("from") === "stock-items";

  const stockByStatus = part?.stock_by_status;
  // Sums every bucket, not a hardcoded five. The old version omitted
  // dispatched / issued / returned, so Total read short of the real unit
  // count — the symptom that surfaced this whole class of bug.
  const totalUnits = useMemo(
    () => sumStockByStatus(stockByStatus),
    [stockByStatus],
  );

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

  if (isError || !part) {
    return (
      <EmptyState
        title={SD.notFoundTitle}
        description={SD.notFoundDescription}
        action={{
          label: SD.backToPartsLabel,
          onClick: () => navigate("/ims/parts"),
        }}
      />
    );
  }

  const defaultVariant =
    variants.find((v) => v.is_default) ?? variants[0] ?? null;
  const sellPrice = defaultVariant?.sell_price ?? null;
  const condition = defaultVariant?.condition ?? null;
  const aliasChips = part.aliases ?? [];

  const conditionLabelMap: Record<
    string,
    { label: string; variant: "success" | "info" | "warning" }
  > = {
    new: { label: "New", variant: "success" },
    refurbished: { label: "Refurbished", variant: "info" },
    new_pull: { label: "New Pull", variant: "warning" },
  };

  // ── Tab content shells ─────────────────────────────────────────────────────

  const overviewTab: DetailTab = {
    id: "overview",
    label: "Overview",
    content: (
      <OverviewTab
        partId={part.id}
        description={part.description}
        specs={part.specs ?? null}
        aliasChips={aliasChips}
        uom={part.uom}
        brand={part.oem_name ?? null}
        modelName={part.name}
        hsnCode={(part as { hsn_code?: string | null }).hsn_code ?? null}
      />
    ),
  };

  const inventoryTab: DetailTab = {
    id: "inventory",
    label: "Inventory",
    // Badge shows the part's TOTAL units (across every status) from the
    // always-available `stock_by_status` denorm — the stock-items query is
    // gated on the tab being active, so it reads 0 until opened.
    // Mirrors the Variant detail Inventory tab's `stockTotals.total`.
    count: totalUnits,
    content: (
      <InventoryTab
        stockItems={stockItems}
        page={inventoryPage}
        pageSize={inventoryPageSize}
        total={stockItemsTotal}
        isFetching={stockItemsQuery.isFetching}
        search={inventorySearch}
        status={inventoryStatus}
        onStatusChange={setInventoryStatus}
        condition={inventoryCondition}
        onConditionChange={setInventoryCondition}
        onSearchChange={(v) => setInventorySearchRaw(v || null)}
        onPageChange={setInventoryPage}
        onPageSizeChange={setInventoryPageSize}
        onClearFilters={clearInventoryFilters}
      />
    ),
  };

  const variantsTab: DetailTab = {
    id: "variants",
    label: "Variants",
    count: variantsTotal,
    content: (
      <VariantsTab
        partName={part.name}
        partId={part.id}
        variants={variants}
        variantsTotal={variantsTotal}
        variantsPage={variantsPage}
        variantsPageSize={variantsPageSize}
        variantsTotalPages={variantsTotalPages}
        variantsFetching={variantsFetching}
        search={variantsSearch}
        onSearchChange={(v) => setVariantsSearchRaw(v || null)}
        onPageChange={setVariantsPage}
        onPageSizeChange={setVariantsPageSize}
        onAddVariant={() => navigate(`/ims/parts/${part.id}/variants/new`)}
        onEditVariant={(v) =>
          navigate(`/ims/parts/${part.id}/variants/${v.id}/edit`)
        }
        onDeleteVariant={(v) => setPendingDeleteVariant(v)}
        deletePending={deleteVariant.isPending}
        onOpenVariant={(vid) =>
          navigate(`/ims/parts/${part.id}/variants/${vid}`)
        }
        canWrite={canWrite}
      />
    ),
  };

  const checklistTab: DetailTab = {
    id: "checklist",
    label: "Checklist",
    content: (
      <ErrorBoundary
        fallback={
          <div className="rounded-md border p-6 text-center">
            <Typography variant="body" tone="danger">
              Failed to load checklists. Try again or refresh the page.
            </Typography>
          </div>
        }
      >
        <ChecklistTab partId={part.id} canWrite={canWrite} />
      </ErrorBoundary>
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

  // Return by count §9: what ships with each rental unit of this model.
  const kitTab: DetailTab = {
    id: "kit",
    label: PART_KIT_STRINGS.tab,
    content: <PartKitTab partId={partId} />,
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
    content: <AuditTrail resourceType="part" resourceId={part.id} />,
  };

  const allTabs: DetailTab[] = [
    overviewTab,
    inventoryTab,
    variantsTab,
    checklistTab,
    kitTab,
    compatibleTab,
    movementsTab,
    linkedOrdersTab,
    activityTab,
  ];

  return (
    <div className="space-y-6">
      {/* Header — matches source's EntityHeader (back / title / status / actions) */}
      <EntityHeader
        title={part.name}
        subtitle={`${part.part_number}${part.oem_name ? ` | ${part.oem_name}` : ""}`}
        status={{
          label: part.is_active ? "Active" : "Inactive",
          variant: part.is_active ? "success" : "neutral",
        }}
        backHref="/ims/parts"
        actions={
          canWrite ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setMoveOpen(true)}>
                <ArrowLeftRight className="mr-1.5 size-4" />
                {STOCK_TRANSFER_STRINGS.title}
              </Button>
              <Button
                variant="outline"
                render={<Link to={`/ims/parts/${part.id}/edit`} />}
              >
                <Pencil className="mr-1.5 size-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeletePart(true)}
                className="text-destructive hover:bg-destructive/5 hover:text-destructive"
                aria-label={`Delete ${part.name}`}
              >
                <Trash2 className="mr-1.5 size-4" />
                Delete
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Quick stats — 5 cards mirroring source's quickStatsBar */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <QuickStat
          icon={<Package className="size-3.5" />}
          label={SD.quickStats.totalUnits}
          value={totalUnits}
        />
        <QuickStat
          icon={<CheckCircle2 className="size-3.5 text-success" />}
          label={SD.quickStats.available}
          // Net available-to-promise (gross sellable − soft reserved), floored at 0 —
          // same definition as the stock listing's Available column.
          value={Math.max(0, (stockByStatus?.available?.units ?? 0) - reservedSoft)}
          valueClassName="text-success"
        />
        <QuickStat
          icon={<AlertTriangle className="size-3.5 text-warning" />}
          label={SD.quickStats.reserved}
          // Soft/ATP reserved (units promised to approved orders), not the empty
          // hard status='reserved' bucket — see reservedSoft.
          value={reservedSoft}
          valueClassName="text-warning"
        />
        <QuickStat
          icon={<Truck className="size-3.5 text-info" />}
          label={SD.quickStats.dispatched}
          // Read the `dispatched` bucket — `consumed` is a different (near-zero)
          // status, which is why the Dispatched stat always read 0.
          value={stockByStatus?.dispatched?.units ?? 0}
          valueClassName="text-info"
        />
        <QuickStat
          icon={<Wrench className="size-3.5 text-destructive" />}
          label={SD.quickStats.inOperations}
          value={stockByStatus?.in_operations?.units ?? 0}
          valueClassName="text-destructive"
        />
        {/* Component-tracking D1. The answer to "I searched this part code and
            In Stock says 0 — do we really have none?": these units exist and
            are owned, they are just inside machines. Excluded from
            total_units on purpose, so this tile is the only place the number
            surfaces at part level. */}
        <QuickStat
          icon={<Cpu className="size-3.5 text-muted-foreground" />}
          label={SD.quickStats.installedInDevices}
          value={stockByStatus?.installed?.units ?? 0}
        />
      </div>

      <MoveStockDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        // Pass the part id and an empty unit list so the dialog fetches its own
        // movable pool — available + in_operations units across this part's
        // variants, server-side filtered — and derives the source warehouse
        // from them. It never reads the paginated Inventory table (CP-352).
        partId={part.id}
        units={[]}
      />

      {/* Two-column: DetailTabs left, side panel right (matches source) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <DetailTabs
          cardContent
          tabs={allTabs}
          defaultTab={tab}
          // `min-w-0` so the `1fr` grid track can shrink below its content
          // width. A grid track's implicit `min-width: auto` otherwise lets a
          // wide Inventory table grow this column to fit the table, pushing the
          // fixed 320px side panel (Part Info / Variants) off-screen. With the
          // track constrained, BMT's own `overflow-x-auto` takes
          // over and the wide table scrolls horizontally inside its card.
          className="min-w-0"
          // Persist the active tab in the URL. DetailTabs is stateful internally,
          // so we shim by re-rendering when the URL param changes (key prop).
          key={tab}
        />

        {/* Side panel cards — top-aligned with the tab content card.
            Product Manager card intentionally omitted: a parent part has
            no parent-level PM display here (PM scoping still drives
            permissions; the card just isn't rendered on this page). */}
        <div className="space-y-4 lg:mt-14">
          {/* Part Info */}
          <Card>
            <CardHeader className="pb-3">
              <Typography asChild variant="body">
                <CardTitle>
                  {SD.sidePanel.partInfoTitle}
                </CardTitle>
              </Typography>
            </CardHeader>
            <Typography asChild variant="body">
              <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {SD.sidePanel.partNo}
                </span>
                <Typography variant="helper" tone="default" className="font-mono font-medium">
                  {part.part_number}
                </Typography>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {SD.sidePanel.category}
                </span>
                <span className="font-medium">{part.category_name ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {SD.sidePanel.brandOem}
                </span>
                <span className="font-medium">{part.oem_name ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {SD.sidePanel.hsnCode}
                </span>
                <span className="font-medium">
                  {(part as { hsn_code?: string | null }).hsn_code ?? "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {SD.sidePanel.productType}
                </span>
                <StatusBadge variant="neutral">
                  {SD.sidePanel.productTypeValue}
                </StatusBadge>
              </div>
              {condition && conditionLabelMap[condition] && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {SD.sidePanel.condition}
                  </span>
                  <StatusBadge variant={conditionLabelMap[condition].variant}>
                    {conditionLabelMap[condition].label}
                  </StatusBadge>
                </div>
              )}
              {sellPrice != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {SD.sidePanel.price}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatINR(Number(sellPrice))}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {SD.sidePanel.unitOfMeasure}
                </span>
                <span className="font-medium">{uomLabel(part.uom)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {SD.sidePanel.created}
                </span>
                <span className="font-medium">
                  {formatDate(part.created_at)}
                </span>
              </div>
              </CardContent>
            </Typography>
          </Card>

          {/* Variants — per-variant condition + available quantity, so the
              operator sees the split under this part without switching to the
              Variants tab. The `available` (dispatchable) bucket is
              shown per row, not `total_units`, matching the "In Stock" stat. */}
          {variantStockItems.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <Typography asChild variant="body">
                  <CardTitle>
                    {SD.variantsCard.title(variantStockTotal)}
                  </CardTitle>
                </Typography>
              </CardHeader>
              <Typography asChild variant="body">
                <CardContent>
                {/* Ledger column headers — the Qty column reads as a real
                    right-aligned numeric column so per-variant counts stack
                    and scan cleanly. */}
                <Typography asChild variant="helper">
                  <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2 font-medium uppercase tracking-wide">
                    <span>{SV.columns.variant}</span>
                    <span>{SD.variantsCard.qtyHeader}</span>
                  </div>
                </Typography>
                <div className="divide-y divide-border">
                  {variantStockItems.map((v) => {
                    const cond = conditionLabelMap[v.condition];
                    const qty = v.stock_summary.available;
                    return (
                      <div
                        key={v.id}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-medium text-foreground">
                              {v.name}
                            </span>
                            {cond && (
                              <StatusBadge
                                variant={cond.variant}
                                className="shrink-0"
                              >
                                {cond.label}
                              </StatusBadge>
                            )}
                          </div>
                          <Typography asChild variant="helper">
                            <div className="truncate font-mono">
                              {v.sku_code}
                            </div>
                          </Typography>
                        </div>
                        {/* Zero stock stays muted so a real count is what the
                            eye lands on first (quiet by default). */}
                        <span
                          className={cn(
                            "shrink-0 tabular-nums font-semibold",
                            qty > 0
                              ? "text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {qty}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {variantStockTotal > variantStockItems.length && (
                  <Typography asChild variant="helper">
                    <div className="border-t border-border pt-2">
                      {SD.variantsCard.moreInTab(
                        variantStockTotal - variantStockItems.length,
                      )}
                    </div>
                  </Typography>
                )}
                </CardContent>
              </Typography>
            </Card>
          )}
        </div>
      </div>

      {/* Delete variant dialog — guard mirrors
          `part_service.delete_variant()`: 409 if stock items remain.
          `available_qty` is the rolled-up stock total for the variant. */}
      <DeleteWithPreconditionsDialog
        open={pendingDeleteVariant != null}
        onOpenChange={(o) => !o && setPendingDeleteVariant(null)}
        title={SDV.title}
        entityName={pendingDeleteVariant?.name ?? ""}
        description={SDV.description}
        preconditions={
          pendingDeleteVariant
            ? [
                {
                  // `available_qty` is the rolled-up stock count from
                  // `GET /ims/variants/{id}` (lazily refetched above).
                  // `loading` shows a shimmer while the fetch is in
                  // flight so the row doesn't flash a false ✓.
                  satisfied: pendingVariantStockQty === 0,
                  loading: pendingVariantQuery.isLoading,
                  label: SDV.preconditionLabel,
                  detail:
                    pendingVariantStockQty > 0
                      ? `${pendingVariantStockQty} unit${pendingVariantStockQty === 1 ? "" : "s"} of stock still linked — clear or transfer them first`
                      : undefined,
                },
              ]
            : []
        }
        isPending={deleteVariant.isPending}
        confirmLabel={SDV.confirmLabel}
        onConfirm={() => {
          if (!pendingDeleteVariant) return;
          deleteVariant.mutate(pendingDeleteVariant.id, {
            onSuccess: () => setPendingDeleteVariant(null),
          });
        }}
      />

      {/* Delete part dialog — guards mirror `part_service.delete_part()`:
            1. variant_count <= 1 (default-only)
            2. zero stock on the sole-default variant — which rolls up to
               `part.available_stock_qty` only when variant_count === 1.
          When variant_count > 1 the backend short-circuits on guard 1, so
          the stock row may flash ✓ on a misleading rollup; that's fine —
          the operator has to clear extra variants first regardless. */}
      <DeleteWithPreconditionsDialog
        open={showDeletePart}
        onOpenChange={setShowDeletePart}
        title={SDP.title}
        entityName={part.name}
        description={SDP.description}
        preconditions={[
          {
            satisfied: (part.variant_count ?? 0) <= 1,
            label: SDP.precondition1Label,
            detail:
              (part.variant_count ?? 0) > 1
                ? `${part.variant_count} variants — delete the non-default ones first`
                : undefined,
          },
          {
            satisfied: Number(part.available_stock_qty ?? 0) === 0,
            label: SDP.precondition2Label,
            detail:
              Number(part.available_stock_qty ?? 0) > 0
                ? `${part.available_stock_qty} unit${Number(part.available_stock_qty) === 1 ? "" : "s"} of stock still linked — clear or transfer them first`
                : undefined,
          },
        ]}
        isPending={deletePart.isPending}
        confirmLabel={SDP.confirmLabel}
        onConfirm={() =>
          deletePart.mutate(part.id, {
            onSuccess: () => {
              // No removeQueries here: it triggers the still-mounted
              // usePart(id) observer to re-fetch, hitting GET
              // /ims/parts/<deleted-id> and 404. useDeletePart's
              // invalidate now skips the deleted id via predicate,
              // so the cache stays put until this page unmounts on
              // navigate.
              setShowDeletePart(false);
              navigate(cameFromStockItems ? "/ims/stock-items" : "/ims/parts");
            },
          })
        }
      />
    </div>
  );
}

// Suppress unused-icon lint on icons reserved for future tabs.
void ChevronDown;
void X;
void Boxes;
