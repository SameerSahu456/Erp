import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  CheckCircle2,
  Layers,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { TablePagination } from "@/components/common/tables/TablePagination";
import { EntityHeader } from "@/components/page-shells/EntityHeader";
import { DetailTabs } from "@/components/page-shells/DetailTabs";

import { DeleteWithPreconditionsDialog } from "../../components/shared/DeleteWithPreconditionsDialog";
import { useDeleteOEM, useOEM } from "../../hooks/oems/useOEMs";
import { OEMS_STRINGS } from "./oems.strings";
import { usePartsPage } from "../../hooks/parts/useParts";
// PM-assignment probe import — commented 2026-05-28 alongside the delete
// dialog's PM precondition row. Restore when re-enabling PM gating.
// import { usePMAssignmentsPage } from "../../hooks/pm-assignments/usePMAssignments";
import { usePageSizeParam, useQueryParam } from "@/shared/hooks";
import { usePermission } from "@shared/rbac";
import { formatIST_date } from "@shared/lib/date";
import { AuditTrail } from "../../components/shared/AuditTrail";
import { IMS_PAGE_SIZE } from "../../constants";
import { formatINR } from "../../lib/format";
import { SR_NO_TD_CLASS, SR_NO_TH_CLASS } from "../../lib/sr-no";
import { imsCan } from "../../permissions";
import { getInitials } from "./oem-detail-helpers";
import { QuickStat } from "./QuickStat";


export function OEMDetailBody() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // RBAC: read-only users see OEM detail without the Edit + Delete buttons.
  const { can } = usePermission();
  const canWrite = can([...imsCan.write]);
  const { data: oem, isLoading, isError } = useOEM(id);

  // Delete-confirmation dialog state. The dialog gates a soft-delete with
  // a live precondition checklist sourced from the backend's `OEMService.
  // delete()` guards (`app/modules/ims/services/oem_service.py` ~L252-302):
  //   1. No active parts linked → otherwise 409 OEM_HAS_PARTS
  //   2. No active PM assignments → otherwise 409 OEM_HAS_PM_ASSIGNMENTS
  // We show each precondition with a live ✓/✗ derived from the loaded
  // counts. The backend remains the source of truth — if state drifts
  // between page-load and click, the mutation's onError toast surfaces
  // the 409 message verbatim.
  const [showDelete, setShowDelete] = useState(false);
  const deleteOEM = useDeleteOEM();
  // PM-assignment count for the delete precondition checklist —
  // commented out 2026-05-28 per product request: no PM-related
  // activity in IMS delete dialogs (and don't fire the PM API for the
  // precondition probe either). Restore the block + the matching
  // precondition row in the dialog below when PM gating is wanted back.
  //
  // const oemPmCountQuery = usePMAssignmentsPage({
  //   oem_id: id,
  //   page_size: 1,
  // });
  // const pmAssignmentCount = oemPmCountQuery.data?.total ?? 0;

  // Total parts — read straight off the OEM detail payload. Backend already
  // rolls this up as `parts_count`; an extra page_size=1 query would only
  // duplicate the same number.
  const totalModelsCount = oem?.parts_count ?? 0;

  // Active subset — backend doesn't expose this on the OEM payload, so a
  // cheap page_size=1 query is still needed for the "Active" stat.
  const activeQuery = usePartsPage({
    oem_id: id,
    is_active: true,
    page: 1,
    page_size: 1,
  });
  const activeModelsCount = activeQuery.data?.total ?? 0;

  // Models tab — server-paginated parts under this OEM. The Models query
  // is gated on the active tab so visitors who land on Overview / Activity
  // don't trigger a wasted parts fetch. `models_page` + `models_search`
  // live in the URL so back-nav from a Part detail page restores the same
  // page AND the search filter that produced it.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "overview";
  const [modelsPageRaw, setModelsPageRaw] = useQueryParam("models_page");
  const modelsPage = Math.max(1, Number(modelsPageRaw ?? "1") || 1);
  const setModelsPage = (n: number) =>
    setModelsPageRaw(n > 1 ? String(n) : null);
  const [modelsSearchRaw] = useQueryParam("models_search");
  const modelsSearch = modelsSearchRaw ?? "";
  // Sequential setSearchParams calls stomp each other (each sees the
  // same `prev` URL until React applies the previous). Write search +
  // page in ONE update so the API actually sees the new filter.
  const setModelsSearchAndReset = (v: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v) next.set("models_search", v);
        else next.delete("models_search");
        next.delete("models_page");
        return next;
      },
      { replace: true },
    );
  };
  // Backend rejects search shorter than 2 chars; gate locally.
  const modelsSearchParam =
    modelsSearch.trim().length >= 2 ? modelsSearch.trim() : undefined;
  const [modelsPageSize, setModelsPageSize] = usePageSizeParam({
    key: "models_page_size",
    pageKey: "models_page",
    defaultSize: IMS_PAGE_SIZE,
  });
  const modelsList = usePartsPage(
    {
      oem_id: id,
      page: modelsPage,
      page_size: modelsPageSize,
      search: modelsSearchParam,
    },
    { enabled: activeTab === "models" },
  );
  const models = modelsList.data?.items ?? [];
  const modelsListTotal = modelsList.data?.total ?? 0;
  const modelsListTotalPages = Math.max(
    1,
    Math.ceil(modelsListTotal / modelsPageSize),
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError || !oem) {
    return (
      <EmptyState
        title={OEMS_STRINGS.detail.notFoundTitle}
        description={OEMS_STRINGS.detail.notFoundDescription}
      />
    );
  }

  // ── Quick stats bar ──
  // Three roll-ups: total models under this OEM, active subset, distinct
  // categories spanned. `categories_count` lives on the OEM detail payload;
  // the two model counts come from the cheap page_size=1 queries above.
  const categoriesCount = oem.categories_count ?? 0;
  const quickStatsBar = (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <QuickStat
        icon={<Package className="size-3.5 text-muted-foreground" />}
        label={OEMS_STRINGS.detail.quickStats.totalModels}
        value={totalModelsCount}
      />
      <QuickStat
        icon={<CheckCircle2 className="size-3.5 text-success" />}
        label={OEMS_STRINGS.detail.quickStats.activeModels}
        value={activeModelsCount}
        valueClassName="text-success"
      />
      <QuickStat
        icon={<Layers className="size-3.5 text-info" />}
        label={OEMS_STRINGS.detail.quickStats.categories}
        value={categoriesCount}
        valueClassName="text-info"
      />
    </div>
  );

  // ── Overview tab ──
  const overviewTab = {
    id: "overview",
    label: OEMS_STRINGS.detail.tabs.overview,
    content: (
      <div className="space-y-6">
        <div>
          <Typography asChild variant="body-strong" className="mb-2">
            <h3>{OEMS_STRINGS.detail.overview.about}</h3>
          </Typography>
          {oem.notes ? (
            <Typography variant="body" tone="muted">{oem.notes}</Typography>
          ) : (
            <Typography variant="body" tone="muted" className="italic">
              {OEMS_STRINGS.detail.overview.noDescription}
            </Typography>
          )}
        </div>

        {(oem.parts_by_category?.length ?? 0) > 0 && (
          <div>
            <Typography asChild variant="body-strong" className="mb-2">
              <h3>
                {OEMS_STRINGS.detail.overview.categoriesHeading}{" "}
                <Typography asChild variant="helper" className="font-normal">
                  <span>({oem.parts_by_category?.length ?? 0})</span>
                </Typography>
              </h3>
            </Typography>
            <div className="flex flex-wrap gap-2">
              {oem.parts_by_category?.map((c) => (
                <Typography
                  key={c.category_id}
                  variant="helper"
                  tone="default"
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-medium"
                >
                  <Layers className="size-3 text-muted-foreground" />
                  {c.name}
                </Typography>
              ))}
            </div>
          </div>
        )}

        <div>
          <Typography asChild variant="body-strong" className="mb-2">
            <h3>{OEMS_STRINGS.detail.overview.identity}</h3>
          </Typography>
          <div className="rounded-md border">
            <Typography asChild variant="helper" tone="default">
              <dl className="divide-y">
              <div className="flex items-start justify-between gap-3 px-3 py-2">
                <dt className="font-medium text-muted-foreground">{OEMS_STRINGS.detail.overview.identityRows.code}</dt>
                <dd className="font-mono font-medium">{oem.code}</dd>
              </div>
              <div className="flex items-start justify-between gap-3 px-3 py-2">
                <dt className="font-medium text-muted-foreground">{OEMS_STRINGS.detail.overview.identityRows.status}</dt>
                <dd>
                  <StatusBadge variant={oem.is_active ? "success" : "neutral"}>
                    {oem.is_active ? OEMS_STRINGS.detail.activeLabel : OEMS_STRINGS.detail.inactiveLabel}
                  </StatusBadge>
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 px-3 py-2">
                <dt className="font-medium text-muted-foreground">{OEMS_STRINGS.detail.overview.identityRows.created}</dt>
                <dd>{formatIST_date(oem.created_at)}</dd>
              </div>
              <div className="flex items-start justify-between gap-3 px-3 py-2">
                <dt className="font-medium text-muted-foreground">
                  {OEMS_STRINGS.detail.overview.identityRows.lastUpdated}
                </dt>
                <dd>{formatIST_date(oem.updated_at)}</dd>
              </div>
              </dl>
            </Typography>
          </div>
        </div>
      </div>
    ),
  };

  // ── Models tab ──
  const modelsTab = {
    id: "models",
    label: OEMS_STRINGS.detail.tabs.models,
    count: totalModelsCount,
    content: (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Typography asChild variant="body-strong">
            <h3>
              {OEMS_STRINGS.detail.models.partsCataloguedUnder(oem.name)}
              <Typography asChild variant="helper" className="ml-2 font-normal">
                <span>({totalModelsCount})</span>
              </Typography>
            </h3>
          </Typography>
          {/* Add-Model CTA — only renders for users with `ims:manage`
              (a Model is a Part). Read-only viewers see the models
              table without the affordance. */}
          {canWrite && (
            <Button
              size="sm"
              variant="outline"
              render={<Link to={`/ims/parts/new?oem_id=${oem.id}`} />}
            >
              <Plus className="mr-1 size-3.5" />
              {OEMS_STRINGS.detail.models.addModel}
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={modelsSearch}
            onChange={(e) => setModelsSearchAndReset(e.target.value)}
            placeholder={OEMS_STRINGS.detail.models.searchPlaceholder}
            className="h-9 pl-8"
          />
        </div>

        {models.length > 0 ? (
          <div className="max-h-[480px] overflow-auto rounded-md border">
            {/* `cpt-tbl` is the canonical CRM table skin (see
                modules/crm/components/CrmDataTable.tsx). It provides
                the gradient header, uppercase 11px captions, sticky
                header, body cell padding/color, and hover tint — so
                the previous inline `text-sm` isn't needed (§8.4
                forbids it). Pairs with SR_NO_*_CLASS for the "Sr No"
                column. */}
            <table className="cpt-tbl min-w-full">
              <thead className="sticky top-0 z-10 bg-muted/50 shadow-[0_1px_0_0_var(--border)]">
                <tr className="border-b">
                  <th className={SR_NO_TH_CLASS}>{OEMS_STRINGS.detail.models.tableHeaders.srNo}</th>
                  <th className="px-3 py-2 text-left font-medium">{OEMS_STRINGS.detail.models.tableHeaders.model}</th>
                  <th className="px-3 py-2 text-left font-medium">{OEMS_STRINGS.detail.models.tableHeaders.partNo}</th>
                  <th className="px-3 py-2 text-left font-medium">{OEMS_STRINGS.detail.models.tableHeaders.category}</th>
                  <th className="px-3 py-2 text-right font-medium">{OEMS_STRINGS.detail.models.tableHeaders.price}</th>
                </tr>
              </thead>
              <tbody>
                {models.map((p, idx) => {
                  const price =
                    "sell_price" in p && p.sell_price != null
                      ? Number(p.sell_price)
                      : null;
                  return (
                    <tr
                      key={p.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      {/* Absolute row index across pages. */}
                      <td className={SR_NO_TD_CLASS}>
                        {(modelsPage - 1) * modelsPageSize + idx + 1}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          to={`/ims/parts/${p.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <Typography asChild variant="helper" tone="inherit">
                        <td className="px-3 py-2 font-mono">
                          {p.part_number}
                        </td>
                      </Typography>
                      <Typography asChild variant="helper" tone="inherit">
                        <td className="px-3 py-2">
                          {p.category_name ?? "—"}
                        </td>
                      </Typography>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {price != null ? formatINR(price) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Typography variant="body-strong">{OEMS_STRINGS.detail.models.emptyTitle}</Typography>
            <Typography asChild variant="helper" className="mt-1">
              <p>{OEMS_STRINGS.detail.models.emptyDescription}</p>
            </Typography>
          </div>
        )}

        {modelsListTotal > 0 && (
          <TablePagination
            page={modelsPage}
            totalPages={modelsListTotalPages}
            pageSize={modelsPageSize}
            total={modelsListTotal}
            isFetching={modelsList.isFetching}
            onPageChange={setModelsPage}
            onPageSizeChange={setModelsPageSize}
          />
        )}
      </div>
    ),
  };

  // ── Audit Trail tab — backed by GET /api/v1/ims/activity ──
  // Tab id stays `activity` so existing `?tab=activity` shareable URLs
  // still land on the renamed tab.
  const activityTab = {
    id: "activity",
    label: OEMS_STRINGS.detail.tabs.auditTrail,
    content: <AuditTrail resourceType="oem" resourceId={oem.id} />,
  };

  return (
    <div className="space-y-6">
      <EntityHeader
        title={oem.name}
        subtitle={`Code: ${oem.code}`}
        status={{
          label: oem.is_active ? OEMS_STRINGS.detail.activeLabel : OEMS_STRINGS.detail.inactiveLabel,
          variant: oem.is_active ? "success" : "neutral",
        }}
        backHref="/ims/oems"
        actions={
          canWrite ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/ims/oems/${oem.id}/edit`)}
              >
                <Pencil className="mr-1.5 size-4" />
                {OEMS_STRINGS.detail.actions.edit}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDelete(true)}
                className="text-destructive hover:bg-destructive/5 hover:text-destructive"
                aria-label={`Delete ${oem.name}`}
              >
                <Trash2 className="mr-1.5 size-4" />
                {OEMS_STRINGS.detail.actions.delete}
              </Button>
            </div>
          ) : undefined
        }
      />

      {quickStatsBar}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: Tabs */}
        <DetailTabs cardContent tabs={[overviewTab, modelsTab, activityTab]} />

        {/* Right: Sidebar — offset aligns with the left content card */}
        <div className="space-y-4 lg:mt-14">
          <Card>
            <CardHeader className="pb-3">
              <Typography asChild variant="body">
                <CardTitle>{OEMS_STRINGS.detail.sidebar.cardTitle}</CardTitle>
              </Typography>
            </CardHeader>
            <Typography asChild variant="body">
              <CardContent className="space-y-2">
              <div className="flex items-center gap-3 pb-2">
                <Typography asChild variant="body" tone="primary">
                  <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 font-semibold">
                    {getInitials(oem.name)}
                  </div>
                </Typography>
                <div className="min-w-0">
                  <p className="truncate font-medium">{oem.name}</p>
                  <Typography asChild variant="helper">
                    <p className="font-mono">
                      {oem.code}
                    </p>
                  </Typography>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{OEMS_STRINGS.detail.sidebar.status}</span>
                <StatusBadge variant={oem.is_active ? "success" : "neutral"}>
                  {oem.is_active ? OEMS_STRINGS.detail.activeLabel : OEMS_STRINGS.detail.inactiveLabel}
                </StatusBadge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{OEMS_STRINGS.detail.sidebar.totalModels}</span>
                <span className="font-medium tabular-nums">
                  {totalModelsCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{OEMS_STRINGS.detail.sidebar.activeModels}</span>
                <span className="font-medium tabular-nums">
                  {activeModelsCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{OEMS_STRINGS.detail.sidebar.categories}</span>
                <span className="font-medium tabular-nums">
                  {categoriesCount}
                </span>
              </div>
              </CardContent>
            </Typography>
          </Card>
        </div>
      </div>

      {/* Delete confirmation — preconditions mirror OEMService.delete()
          guards (`app/modules/ims/services/oem_service.py`). */}
      <DeleteWithPreconditionsDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title={OEMS_STRINGS.delete.title}
        entityName={oem.name}
        description={OEMS_STRINGS.delete.description}
        preconditions={[
          {
            satisfied: totalModelsCount === 0,
            label: OEMS_STRINGS.delete.preconditions.noActiveParts,
            detail:
              totalModelsCount > 0
                ? OEMS_STRINGS.delete.preconditions.activePartsDetail(totalModelsCount)
                : undefined,
          },
          // PM precondition row — hidden 2026-05-28 per product request;
          // restore alongside the `oemPmCountQuery` block above when PM
          // gating on delete is wanted back.
          /*
          {
            satisfied: pmAssignmentCount === 0,
            loading: oemPmCountQuery.isLoading,
            label: "No active PM assignments scoped to this OEM",
            detail:
              pmAssignmentCount > 0
                ? `${pmAssignmentCount} active assignment${pmAssignmentCount === 1 ? "" : "s"} — revoke from PM Assignments first`
                : undefined,
          },
          */
        ]}
        isPending={deleteOEM.isPending}
        confirmLabel={OEMS_STRINGS.delete.confirmLabel}
        onConfirm={() =>
          deleteOEM.mutate(oem.id, {
            onSuccess: () => {
              // No removeQueries here: the deleted id's still-mounted
              // observer would re-subscribe and fire a fresh GET
              // (which 404s). useDeleteOEM's invalidate now skips the
              // deleted id via predicate, so the cache entry stays put
              // until this page unmounts on the navigate below.
              setShowDelete(false);
              navigate("/ims/oems");
            },
          })
        }
      />
    </div>
  );
}

