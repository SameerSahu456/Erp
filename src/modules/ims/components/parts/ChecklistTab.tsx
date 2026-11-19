import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Eye, Pencil, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { TablePagination } from "@/components/common/tables/TablePagination";
import { formatIST } from "@shared/lib/date";
import { usePageSizeParam, useQueryParam } from "@/shared/hooks";
import {
  useChecklistsForPart,
  useChecklistTypes,
} from "../../hooks/checklists/useChecklists";
import { IMS_PAGE_SIZE } from "../../constants";
import type { ChecklistTemplate } from "../../api";
import { ChecklistPreviewDialog } from "../../components/checklists/ChecklistPreviewDialog";
import { ChecklistActiveSwitch } from "../../components/checklists/ChecklistActiveSwitch";
import { CHECKLISTS_STRINGS } from "../../components/checklists/checklists.strings";
import { PARTS_STRINGS } from "./parts.strings";

const SC = PARTS_STRINGS.checklist;

// ─── Checklist tab (preserved verbatim from existing target) ─────────────────

export function ChecklistTab({
  partId,
  canWrite,
}: {
  partId: string;
  /** Hides Add / Edit / Active-toggle affordances when false (read-only users). */
  canWrite: boolean;
}) {
  const [checklistsPage, setChecklistsPage] = useState(1);
  const [checklistsPageSize, setChecklistsPageSize] = usePageSizeParam({
    key: "checklists_page_size",
    // ChecklistTab keeps `checklistsPage` in local React state, not the
    // URL — so the hook shouldn't try to reset a `page` URL key here.
    pageKey: null,
    defaultSize: IMS_PAGE_SIZE,
  });
  // Client-side filter on the visible page — checklists API doesn't take
  // a search param. URL state so back-nav restores the filter.
  const [checklistSearchRaw, setChecklistSearchRaw] =
    useQueryParam("checklist_search");
  const checklistSearch = checklistSearchRaw ?? "";
  const { data, isLoading, isError, isFetching } = useChecklistsForPart(
    partId,
    { page: checklistsPage, page_size: checklistsPageSize },
  );
  const { data: types } = useChecklistTypes();

  const checklists = data?.items ?? [];
  const checklistsTotal = data?.total ?? 0;
  const checklistsTotalPages = Math.max(
    1,
    Math.ceil(checklistsTotal / checklistsPageSize),
  );
  const typeLabelFor = (code: string): string =>
    (types ?? []).find((t) => t.code === code)?.label ?? code;
  const checklistSearchQuery = checklistSearch.trim().toLowerCase();
  const filteredChecklists = checklistSearchQuery
    ? checklists.filter((cl) => {
        const name = (cl.name ?? "").toLowerCase();
        const typeLbl = typeLabelFor(cl.type_code).toLowerCase();
        return (
          name.includes(checklistSearchQuery) ||
          typeLbl.includes(checklistSearchQuery)
        );
      })
    : checklists;

  // Create + edit now live at /ims/parts/:partId/checklists/new and
  // /ims/parts/:partId/checklists/:templateId/edit. Preview stays inline.
  // No delete here — a checklist is deactivated instead (row switch).
  const navigate = useNavigate();
  const [previewTemplate, setPreviewTemplate] =
    useState<ChecklistTemplate | null>(null);

  function openCreate() {
    navigate(`/ims/parts/${partId}/checklists/new`);
  }
  function openEdit(template: ChecklistTemplate) {
    navigate(`/ims/parts/${partId}/checklists/${template.id}/edit`);
  }
  function openPreview(template: ChecklistTemplate) {
    setPreviewTemplate(template);
  }

  return (
    <section>
      <header className="flex items-center justify-between border-b pb-3 mb-4">
        <Typography asChild variant="body">
          <h2 className="font-semibold">
            {`Checklists${checklists.length ? ` · ${checklists.length}` : ""}`}
          </h2>
        </Typography>
        {canWrite && (
          <Button
            type="button"
            size="sm"
            onClick={openCreate}
            data-testid="checklist-add-button"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {SC.addChecklist}
          </Button>
        )}
      </header>

      {isLoading ? (
        <div className="space-y-2 py-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="py-10 text-center">
          <Typography variant="body-strong">
            {SC.checklistsLoadError}
          </Typography>
          <Typography asChild variant="helper" className="mt-1">
            <p>{SC.checklistsLoadErrorHelper}</p>
          </Typography>
        </div>
      ) : checklists.length === 0 ? (
        <ChecklistEmptyState onAdd={openCreate} canWrite={canWrite} />
      ) : (
        <>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={checklistSearch}
              onChange={(e) => setChecklistSearchRaw(e.target.value || null)}
              placeholder={SC.searchPlaceholder}
              className="h-9 pl-8"
            />
          </div>
          {filteredChecklists.length === 0 ? (
            <div className="rounded-md border p-8 text-center">
              <Typography variant="body-strong">
                {SC.noMatchTitle(checklistSearch.trim())}
              </Typography>
              <Typography asChild variant="helper" className="mt-1">
                <p>{SC.noMatchHelper}</p>
              </Typography>
            </div>
          ) : (
            <ul className="divide-y divide-border" data-testid="checklist-list">
              {filteredChecklists.map((cl) => (
                <ChecklistRow
                  key={cl.id}
                  template={cl}
                  typeLabel={typeLabelFor(cl.type_code)}
                  onView={() => openPreview(cl)}
                  onEdit={() => openEdit(cl)}
                  canWrite={canWrite}
                />
              ))}
            </ul>
          )}
          <TablePagination
            page={checklistsPage}
            totalPages={checklistsTotalPages}
            pageSize={checklistsPageSize}
            total={checklistsTotal}
            isFetching={isFetching}
            onPageChange={setChecklistsPage}
            onPageSizeChange={(size) => {
              setChecklistsPageSize(size);
              setChecklistsPage(1);
            }}
          />
        </>
      )}

      <ChecklistPreviewDialog
        open={previewTemplate != null}
        onOpenChange={(v) => !v && setPreviewTemplate(null)}
        template={previewTemplate}
        typeLabel={
          previewTemplate ? typeLabelFor(previewTemplate.type_code) : undefined
        }
      />
    </section>
  );
}

function ChecklistEmptyState({
  onAdd,
  canWrite,
}: {
  onAdd: () => void;
  /** Hides the "Add checklist" CTA for read-only viewers — same gate
   *  the in-list Add button uses, so the empty-state and the populated
   *  view stay consistent for `ims:read`-only users. */
  canWrite: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <ClipboardList className="h-5 w-5" />
      </span>
      <div className="space-y-1">
        <Typography variant="body-strong">{SC.empty.title}</Typography>
        <Typography asChild variant="helper">
          <p>{SC.empty.description}</p>
        </Typography>
      </div>
      {canWrite && (
        <Button type="button" size="sm" onClick={onAdd}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {SC.addChecklist}
        </Button>
      )}
    </div>
  );
}

function ChecklistRow({
  template,
  typeLabel,
  onView,
  onEdit,
  canWrite,
}: {
  template: ChecklistTemplate;
  typeLabel: string;
  onView: () => void;
  onEdit: () => void;
  /** Hides Edit / Active toggle; view-only stays visible. */
  canWrite: boolean;
}) {
  const required = template.items.filter((i) => i.required).length;
  const total = template.items.length;
  return (
    <li
      className="flex flex-col gap-2 px-1 py-3 sm:flex-row sm:items-center sm:gap-4"
      data-testid="checklist-row"
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <Typography asChild variant="body-strong" truncate className="min-w-0">
            <p>{template.name}</p>
          </Typography>
          {!template.is_active && (
            <StatusBadge variant="neutral">{CHECKLISTS_STRINGS.activeToggle.inactive}</StatusBadge>
          )}
        </div>
        <Typography asChild variant="helper" truncate className="mt-0.5">
          <p>
            {typeLabel} · {SC.updatedPrefix}
            {formatIST(template.updated_at)}
          </p>
        </Typography>
      </div>
      <Typography asChild variant="helper">
        <div className="flex items-center gap-3 tabular-nums sm:gap-5">
        <span className="inline-flex flex-col items-end leading-tight">
          <Typography variant="caption" className="uppercase tracking-[0.06em]">
            {SC.columns.items}
          </Typography>
          <span className="text-foreground">{total}</span>
        </span>
        <span className="inline-flex flex-col items-end leading-tight">
          <Typography variant="caption" className="uppercase tracking-[0.06em]">
            {SC.columns.required}
          </Typography>
          <span className="text-foreground">{required}</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onView}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          aria-label={`View ${template.name}`}
          title={SC.tooltips.viewChecklist}
          data-testid="checklist-view-button"
        >
          <Eye className="h-4 w-4" />
        </Button>
        {canWrite && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              aria-label={`Edit ${template.name}`}
              title={SC.tooltips.editChecklist}
              data-testid="checklist-edit-button"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <ChecklistActiveSwitch template={template} />
          </>
        )}
        </div>
      </Typography>
    </li>
  );
}
