import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// CategoryPicker + Select primitives + useOEMOptions below are consumed
// by the table FILTER ROW (`renderFilter`), not by the dialog form —
// the dialog's controls all live inside `PMAssignmentFormBody` now.
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryPicker } from "@/components/common/pickers/CategoryPicker";
import { useOEMOptions } from "../../hooks/oems/useOEMs";
import { ListPageShell } from "@/components/page-shells";
import {
  useClearFiltersOnReload,
  useDebounce,
  useDialogDirtyGuard,
  useFilterParams,
  usePageSizeParam,
} from "@/shared/hooks";
import { UI } from "@/shared/constants";
import { DiscardChangesAlertDialog } from "@/shared/components/DiscardChangesAlertDialog";
import {
  BusinessMetricsTable,
  type CellFormatter,
  type TabConfig,
} from "@/components/common/tables/BusinessMetricsTable";

import {
  AsyncSelect,
  type AsyncSelectOption,
} from "@/components/ui/async-select";

import {
  useCreatePMAssignment,
  usePMAssignmentsPage,
  usePMUserOptions,
  useReplacePMAssignment,
  useRevokePMAssignment,
} from "../../hooks/pm-assignments/usePMAssignments";
import type { PMAssignment, PMAssignmentStatusFilter } from "../../api";
import { DeleteWithPreconditionsDialog } from "../../components/shared/DeleteWithPreconditionsDialog";
import { PMAssignmentFormBody } from "../../components/PMAssignmentFormBody";
import { IMS_PAGE_SIZE } from "../../constants";
import { resolveEnumParam, resolveUuidParam } from "../../lib/list-params";
import { useAuth } from "@shared/auth/use-auth";
import { usePermission } from "@shared/rbac";
import { imsCan } from "../../permissions";
import {
  createPMAssignmentSchema,
  editPMAssignmentSchema,
  type CreatePMAssignmentInput,
} from "../../schemas";
import { PM_ASSIGNMENTS_STRINGS } from "./pm-assignments.strings";
import { PMStatusBadge } from "./PMStatusBadge";
import {
  CONDITION_LABEL,
  formatDateOnly,
  type PMRow,
} from "./pm-assignments-helpers";


export function PMAssignmentsBody() {
  // Refresh = "start over" for filters: on browser reload we drop every
  // URL param so the user lands on the unfiltered first page. SPA-nav
  // (back from a detail page, sidebar link) is unaffected.
  useClearFiltersOnReload();

  const navigate = useNavigate();
  // Backend restricts non-superusers to their own assignments. Surface that
  // in the page header so a sparse list doesn't read as a backend bug.
  const { user } = useAuth();
  const isSuperuser = !!user?.is_superuser;
  const create = useCreatePMAssignment();
  const revoke = useRevokePMAssignment();
  // Edit-mode id: when set, onSubmit routes through Replace instead of
  // Create. Backend has no PATCH; Replace = atomic revoke + new-row create
  // with the full payload as the new row.
  const [editingId, setEditingId] = useState<string | null>(null);
  const replace = useReplacePMAssignment(editingId ?? "");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<PMAssignment | null>(null);

  // RBAC: read-only users see assignments but cannot create / edit /
  // revoke them.
  const { can } = usePermission();
  const canWrite = can([...imsCan.write]);
  // UI-only state: OEM and PM (user) AsyncSelects use option objects for
  // their label rendering. The category nested-dropdown drives
  // `category_id` directly on the form via its `onChange`.
  const [oemOption, setOemOption] = useState<AsyncSelectOption | null>(null);
  const [pmOption, setPmOption] = useState<AsyncSelectOption | null>(null);

  // The "no backdated dates" rule applies on create only — on edit the
  // assignment's `effective_from` was today-or-future the day it was
  // saved, but reaching for the form 2-3 days later would otherwise
  // reject the unchanged value. We swap schemas based on whether
  // `editingId` is set. RHF reads `resolver` once at mount, so the
  // resolver is a stable function that consults a ref instead of
  // closing over `editingId` directly — that way create→edit transitions
  // pick the right schema without re-mounting the form.
  const editingIdRef = useRef<string | null>(null);
  useEffect(() => {
    editingIdRef.current = editingId;
  }, [editingId]);
  const pmResolver = useCallback<Resolver<CreatePMAssignmentInput>>(
    (values, context, options) => {
      const schema = editingIdRef.current
        ? editPMAssignmentSchema
        : createPMAssignmentSchema;
      return zodResolver(schema)(values, context, options);
    },
    [],
  );

  // Backend permission_type is a strict hierarchy ("manage" implies "view"),
  // so a radio reads cleaner than two coupled checkboxes — and matches the
  // stored value 1:1 instead of forcing UI logic to keep them aligned.
  const form = useForm<CreatePMAssignmentInput>({
    resolver: pmResolver,
    defaultValues: {
      user_id: "",
      // null = global PM (backend accepts this); the form's category picker
      // renders "All categories" in that state.
      category_id: null,
      oem_id: null,
      condition: null,
      permission_type: "view",
      effective_from: null,
      effective_until: null,
      notes: null,
    },
  });
  const { control, formState, handleSubmit, reset, setError, watch } =
    form;
  const errors = formState.errors;
  // Filters drive backend query params — every change refetches via
  // `usePMAssignmentsPage`. Simple ID-based filters live in the URL so a
  // back-nav from a detail page restores the same listing. The OEM
  // AsyncSelect filter holds `{id, label}` locally for label hydration
  // (a bare URL id wouldn't surface a readable Brand/OEM name otherwise).
  //
  // PM scoping is driven by the top-of-table search box: the typed text
  // resolves to the first matching PM's user_id (see `pmSearch` below).
  const { get, set, setMany, clear: clearUrlFilters } = useFilterParams();
  // PM search lives in the URL so back-nav restores the same filtered
  // listing. The raw input value is debounced before being resolved to a
  // user_id; clearing it drops the `user_id=` query param.
  const pmSearch = get("pm_search");
  const setPmSearch = (v: string) =>
    setMany({ pm_search: v.trim() ? v : null, page: null });
  const debouncedPmSearch = useDebounce(pmSearch.trim(), UI.DEBOUNCE_SEARCH_MS);
  // Single nested-dropdown picker handles both L1 + L2. Leaf id wins;
  // picking "All [parent]" inside a submenu returns the parent id.
  // Validate every filter read from the URL (§11.1): the write path already
  // guards these in handleTableFiltersChange, but a crafted/bookmarked
  // `?status=banana` / `?category_id=not-a-uuid` bypasses that and 422s the
  // list. Drop anything off the allowlist (enum) or malformed (uuid).
  const filterCategoryId = resolveUuidParam(get("category_id")) ?? "";
  // `setFilterCategoryId` is intentionally not exposed — the table filter
  // path goes through handleTableFiltersChange → setMany so multiple
  // filter updates land in a single setSearchParams call.
  const [filterOemOption, setFilterOemOption] = useState<AsyncSelectOption | null>(null);
  // Row-state filter — mirrors the 5-value backend enum exactly. Default
  // `all` returns every non-revoked row (active + scheduled + expired).
  const filterStatus = resolveEnumParam(
    get("status", "all"),
    ["all", "active", "scheduled", "expired", "revoked"] as const,
    "all",
  ) as PMAssignmentStatusFilter;
  // setFilterStatus isn't exposed — status flips go through
  // handleTableFiltersChange → setMany so we batch URL writes.
  // Backend `?condition=` filter — inclusive: passing `new` returns rows
  // tagged `new` plus rows with `condition IS NULL` (covers all). "all"
  // means don't send the param.
  const filterCondition = resolveEnumParam(
    get("condition", "all"),
    ["all", "new", "refurbished", "new_pull"] as const,
    "all",
  );
  // setFilterCondition isn't exposed — condition flips go through
  // handleTableFiltersChange → setMany so we batch URL writes.
  const page = Math.max(1, Number(get("page", "1")) || 1);
  const setPage = (n: number) => set("page", n > 1 ? String(n) : null);
  const [pageSize, setPageSize] = usePageSizeParam({
    defaultSize: IMS_PAGE_SIZE,
  });
  const sortRaw = get("sort");
  const sortColumnKey = sortRaw.replace(/^-/, "");
  const sortDirection: "asc" | "desc" | null =
    sortRaw === "" ? null : sortRaw.startsWith("-") ? "desc" : "asc";
  // BMT key → backend sort field. Both `condition` and `updated_at`
  // match the backend allowlist directly (no remap needed).
  //
  // Revoked-status default: when the user picks "Revoked" from the
  // status filter and hasn't picked an explicit column sort, fall back
  // to `-updated_at` so the most-recently-revoked rows surface first.
  // The backend doesn't expose `revoked_at` as a sortable field, but
  // `updated_at` equals the revoke time for revoked rows (revoke is
  // the last mutation a row receives), so it's effectively the same
  // ordering. An explicit click on any sort header overrides this.
  const sortParam =
    sortRaw === ""
      ? filterStatus === "revoked"
        ? "-updated_at"
        : undefined
      : sortRaw;

  const filterOemId = filterOemOption?.id ?? "";

  // Resolve the typed PM search to a concrete user_id. `usePMUserOptions`
  // now searches distinct PMs SERVER-side (GET
  // /ims/pm-assignments/product-managers), so the match isn't capped at a
  // client-side fetch. The filter needs a single user_id, so we take the first
  // match. Duplicate-name PMs are rare in practice; if they become common,
  // this is where to add disambiguation UI.
  //
  // Nil-UUID sentinel: when the user has typed something but no PM
  // matches, send the all-zeros UUID the backend will treat as a valid
  // user_id query (it parses cleanly) but no row has, so the table
  // renders its empty state instead of falling back to "all PMs".
  const NO_PM_MATCH_UUID = "00000000-0000-0000-0000-000000000000";
  const pmOptionsQuery = usePMUserOptions(debouncedPmSearch);
  const resolvedPmOptions = pmOptionsQuery.data?.pages[0]?.items ?? [];
  const filterUserId = debouncedPmSearch.length === 0
    ? ""
    : resolvedPmOptions.length > 0
      ? resolvedPmOptions[0]!.id
      : NO_PM_MATCH_UUID;

  // Single backend round-trip per change — pagination, filters, and sort all
  // ride this query. No client-side fetch-then-slice (Coding-guideline §16.7).
  const pageQuery = usePMAssignmentsPage({
    page,
    page_size: pageSize,
    user_id: filterUserId || undefined,
    category_id: filterCategoryId || undefined,
    oem_id: filterOemId || undefined,
    condition: filterCondition === "all" ? undefined : filterCondition,
    status: filterStatus === "all" ? undefined : filterStatus,
    sort: sortParam,
  });
  const visible = (pageQuery.data?.items ?? []) as PMRow[];
  const total = pageQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const hasActiveFilter =
    !!pmSearch ||
    !!filterCategoryId ||
    !!filterOemId ||
    filterCondition !== "all" ||
    filterStatus !== "all";

  function resetForm() {
    reset();
    setOemOption(null);
    setPmOption(null);
    setEditingId(null);
  }

  // Discard-changes guard for the Create / Edit dialog. The wrapped
  // onChange resets local picker state after a confirmed close, matching
  // the old in-place onOpenChange callback.
  const pmGuard = useDialogDirtyGuard(formState.isDirty, (open) => {
    if (!open) resetForm();
    setDialogOpen(open);
  });

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(a: PMRow) {
    setEditingId(a.id);
    // Hydrate the form with the current row. Replace takes a FULL new
    // payload — the operator is editing a snapshot, not a diff.
    reset({
      user_id: a.user_id,
      category_id: a.category_id ?? null,
      oem_id: a.oem_id ?? null,
      condition: (a.condition as "new" | "refurbished" | "new_pull" | null) ?? null,
      permission_type: (a.permission_type as "view" | "manage") ?? "view",
      effective_from: a.effective_from ?? null,
      effective_until: a.effective_until ?? null,
      notes: a.notes ?? null,
    });
    // Hydrate the OEM + PM AsyncSelect display labels so the triggers
    // render the current names instead of falling back to placeholders.
    if (a.oem_id) {
      setOemOption({ id: a.oem_id, label: a.oem_name ?? "Selected Brand/OEM" });
    } else {
      setOemOption(null);
    }
    setPmOption({
      id: a.user_id,
      label: a.user_name ?? "Selected PM",
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: CreatePMAssignmentInput) {
    // Start/End date fields are hidden in the UI per product request.
    // Force `effective_from` to today and `effective_until` to null on
    // every create + edit, regardless of what the form holds. Backend's
    // `_with_effective_from_default` accepts this directly; no extra
    // validation kicks in. See PMAssignmentFormBody.tsx for the
    // commented-out fields.
    const todayIso = new Date().toISOString().slice(0, 10);
    const payload: CreatePMAssignmentInput = {
      ...values,
      effective_from: todayIso,
      effective_until: null,
    };
    try {
      if (editingId) {
        await replace.mutateAsync(payload);
      } else {
        await create.mutateAsync(payload);
      }
      setDialogOpen(false);
      resetForm();
    } catch (e) {
      // Service-layer errors (EFFECTIVE_FROM_IN_PAST, duplicate scope, etc.)
      // surface here. Attach to the relevant field when possible so the
      // user sees the message inline; fall back to user_id otherwise.
      const message =
        e instanceof Error ? e.message : "Failed to create assignment.";
      const target =
        /past|effective_from/i.test(message) ? "effective_from"
        : /effective_until|end date/i.test(message) ? "effective_until"
        : /duplicate|exists/i.test(message) ? "category_id"
        : "user_id";
      setError(target, { type: "server", message });
    }
  }

  function handleRevoke(a: PMAssignment) {
    setPendingRevoke(a);
  }

  // ── Table config (BMT) ───────────────────────────────────────────────────
  // Mirror PartsPage's pattern so the filter row sits inside the table card
  // and shares the toolbar styling. State is owned by this page (filterUser*,
  // filterCategoryId, filterOemOption, filterStatus); BMT's toolbar is a
  // controlled view via `serverPagination.filters` + `onFiltersChange`.
  const rows = visible.map((a) => ({
    pm: a.user_name ?? "—",
    email: a.user_email ?? "—",
    category: a.category_name ?? "All Categories",
    oem: a.oem_name ?? "All",
    condition: a.condition ?? "",
    status: a.status ?? "active",
    updated_at: a.updated_at ?? "",
    actions: a.id,
    _id: a.id,
    _row: a,
  }));

  const tab: TabConfig = {
    id: "pm-assignments",
    label: `Assignments (${total})`,
    // Sortable only on backend-allowed fields (created_at, updated_at,
    // effective_from, effective_until, permission_type, condition). The
    // table doesn't expose effective_* or permission_type columns yet.
    columns: [
      // PM column is no longer column-filterable — the top-of-table search
      // box is the single PM-scoping affordance now. Name-only filter, with
      // the typed text resolved to a user_id by `usePMUserOptions`.
      { key: "pm", label: "Assigned PM", width: "160px" },
      { key: "email", label: "PM Email", width: "200px" },
      { key: "category", label: "Category", filterable: true, width: "160px" },
      { key: "oem", label: "Brand/OEM", filterable: true, width: "200px" },
      // Plain text per product request (no badge). 120px matches the
      // other text columns ("Status", "Last Updated"); "Refurbished" —
      // the longest value — fits comfortably without the badge's dot +
      // padding overhead.
      { key: "condition", label: "Condition", sortable: true, filterable: true, width: "120px" },
      { key: "status", label: "Status", filterable: true, width: "120px" },
      // "Last Updated" — date-only (no time). Sortable: the backend
      // already accepts `?sort=updated_at`. 140px fits "29 May 2026"
      // comfortably with the column header.
      { key: "updated_at", label: "Last Updated", sortable: true, width: "140px" },
      // Actions only for write-enabled users — read-only viewers see the
      // assignment data without trailing pencil/revoke icons.
      ...(canWrite
        ? [
            {
              key: "actions",
              label: "Actions",
              align: "right" as const,
              width: "100px",
            },
          ]
        : []),
    ],
    data: rows,
  };

  // Translate typed state ⇄ BMT's string-map filters. IDs travel as the
  // filter value (column-keyed) so we don't need to round-trip through
  // display labels.
  const tableFilters: Record<string, string> = {};
  if (filterUserId) tableFilters.pm = filterUserId;
  if (filterCategoryId) tableFilters.category = filterCategoryId;
  if (filterOemId) tableFilters.oem = filterOemId;
  if (filterCondition !== "all") tableFilters.condition = filterCondition;
  if (filterStatus !== "all") tableFilters.status = filterStatus;

  const handleTableFiltersChange = (next: Record<string, string>) => {
    // OEM — sync the local AsyncSelect option state so the trigger keeps
    // the picked label visible across renders. PM is no longer a column
    // filter (the top-of-table search box drives PM scoping now), so no
    // setFilterUserOption is needed; the old stub here was throwing a
    // ReferenceError that crashed every other filter update too.
    const oemId = next.oem ?? "";
    if (oemId) {
      setFilterOemOption((prev) =>
        prev?.id === oemId
          ? prev
          : { id: oemId, label: prev?.label ?? "Selected Brand/OEM" },
      );
    } else {
      setFilterOemOption(null);
    }

    const nextCondition = (next.condition ?? "all") as
      | "all"
      | "new"
      | "refurbished"
      | "new_pull";
    const condValid = ["all", "new", "refurbished", "new_pull"].includes(
      nextCondition,
    )
      ? nextCondition
      : "all";

    const nextStatus = (next.status ?? "all") as PMAssignmentStatusFilter;
    const statusValid = [
      "all",
      "active",
      "scheduled",
      "expired",
      "revoked",
    ].includes(nextStatus)
      ? nextStatus
      : "all";

    // Single setSearchParams call — sequential `set()` calls would each
    // see the same `prev` URL and stomp each other, leaving only the
    // last update applied (so the API never sees the new filters).
    // (OEM stays in local state, not URL — see filterOemOption above.)
    setMany({
      category_id: next.category || null,
      condition: condValid === "all" ? null : condValid,
      status: statusValid === "all" ? null : statusValid,
      page: null,
    });
  };

  const cellFormatter: CellFormatter = (value, key, row) => {
    const a = row._row as PMRow;
    if (key === "pm") {
      return {
        display: <span className="font-medium">{String(value)}</span>,
      };
    }
    if (key === "email") {
      return {
        display: (
          <Typography variant="helper" tone="muted">{String(value)}</Typography>
        ),
      };
    }
    if (key === "category") {
      return a.category_name ? (
        { display: <span className="font-medium">{a.category_name}</span> }
      ) : (
        { display: <span className="text-muted-foreground">{PM_ASSIGNMENTS_STRINGS.list.allCategories}</span> }
      );
    }
    if (key === "oem") {
      return a.oem_name
        ? { display: <span>{a.oem_name}</span> }
        : { display: <span className="text-muted-foreground">{PM_ASSIGNMENTS_STRINGS.list.allOem}</span> };
    }
    if (key === "condition") {
      // Plain text per product request — same shape as the "Assigned
      // PM" column (no badge / pill). Null condition is the "any
      // condition" wildcard, surfaced here as "All" to mirror how the
      // Subcategory / Brand-OEM cells read on the detail page.
      return {
        display: (
          <span>
            {a.condition ? (CONDITION_LABEL[a.condition] ?? a.condition) : PM_ASSIGNMENTS_STRINGS.list.allCondition}
          </span>
        ),
      };
    }
    if (key === "status") {
      return { display: <PMStatusBadge status={a.status} /> };
    }
    if (key === "updated_at") {
      // Date-only — `formatDateOnly` returns "29 May 2026" (no time).
      return {
        display: (
          <Typography variant="helper" tone="muted">
            {formatDateOnly(a.updated_at)}
          </Typography>
        ),
      };
    }
    if (key === "actions") {
      const isRevoked = a.status === "revoked";
      return {
        display: (
          <div
            className="inline-flex items-center justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => openEditDialog(a)}
              disabled={isRevoked}
              aria-label={PM_ASSIGNMENTS_STRINGS.list.editAssignmentFor(a.user_name ?? "PM")}
              title={
                isRevoked
                  ? PM_ASSIGNMENTS_STRINGS.list.editDisabledTitle
                  : PM_ASSIGNMENTS_STRINGS.list.editAssignmentFor(a.user_name ?? "PM")
              }
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => handleRevoke(a)}
              disabled={isRevoked || revoke.isPending}
              aria-label={PM_ASSIGNMENTS_STRINGS.list.revokeAssignmentFor(a.user_name ?? "PM")}
              title={
                isRevoked
                  ? PM_ASSIGNMENTS_STRINGS.list.revokeDisabledTitle
                  : PM_ASSIGNMENTS_STRINGS.list.revokeAssignmentFor(a.user_name ?? "PM")
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      };
    }
    return null;
  };

  return (
    <ListPageShell
      title={PM_ASSIGNMENTS_STRINGS.list.title}
      subtitle={
        isSuperuser
          ? PM_ASSIGNMENTS_STRINGS.list.subtitleSuperuser
          : PM_ASSIGNMENTS_STRINGS.list.subtitleLimited
      }
      actions={
        canWrite ? (
          <Button onClick={openCreateDialog}>
            <Plus className="mr-1.5 h-4 w-4" />
            {PM_ASSIGNMENTS_STRINGS.list.addAssignment}
          </Button>
        ) : undefined
      }
    >
      <BusinessMetricsTable
        className="ims-bmt-compact-filters"
        useAsyncFilterDropdowns
        showIndex
        tabs={[tab]}
        cellFormatter={cellFormatter}
        searchable
        searchValue={pmSearch}
        searchPlaceholder="Search PM by name…"
        onSearchChange={setPmSearch}
        renderFilter={({ column, value, onChange }) => {
          if (column.key === "category") {
            return (
              <div className="w-44 shrink-0">
                {/* Filter dropdown — inactive categories filtered out so
                    the operator only sees categories that are currently
                    assignable. Matches the OEM AsyncSelect below which
                    already passes is_active via useOEMOptions. */}
                <Typography asChild variant="body-sm">
                  <CategoryPicker
                    value={value ?? ""}
                    onChange={(id) => onChange(id || "__all__")}
                    placeholder={PM_ASSIGNMENTS_STRINGS.list.filters.allCategory}
                    allowAll
                    shape="short"
                    isActive
                    className="h-9 w-full rounded-[7px] border-input bg-card px-[10px] shadow-xs"
                  />
                </Typography>
              </div>
            );
          }
          if (column.key === "oem") {
            return (
              <div className="w-40 shrink-0">
                <Typography asChild variant="body-sm">
                  <AsyncSelect
                    value={
                      value && filterOemOption?.id === value
                        ? filterOemOption
                        : null
                    }
                    onValueChange={(v) => {
                      setFilterOemOption(v);
                      onChange(v?.id || "__all__");
                    }}
                    useOptions={useOEMOptions}
                    toLabel={(o) => o.name}
                    placeholder={PM_ASSIGNMENTS_STRINGS.list.filters.allBrandOem}
                    allOption="All Brand/OEM"
                    searchPlaceholder="Search Brand/OEMs…"
                    className="h-9 w-full rounded-[7px] border-input bg-card px-[10px] shadow-xs"
                    chevron="down"
                  />
                </Typography>
              </div>
            );
          }
          if (column.key === "condition") {
            const condLabel: Record<string, string> = {
              all: "All Conditions",
              new: "New",
              refurbished: "Refurbished",
              new_pull: "New Pull",
            };
            const current = (value && value !== "__all__" ? value : "all") as string;
            const hasValue = current !== "all";
            return (
              <Select
                value={current}
                onValueChange={(v) =>
                  onChange((v ?? "all") === "all" ? "__all__" : (v as string))
                }
              >
                <Typography asChild variant="body-sm">
                <SelectTrigger
                  className="h-9 rounded-[7px] border-input bg-card px-[10px] shadow-xs"
                  clearable={hasValue}
                  onClear={() => onChange("__all__")}
                >
                  <SelectValue placeholder={PM_ASSIGNMENTS_STRINGS.list.filters.allConditions}>
                    {condLabel[current] ?? "All Conditions"}
                  </SelectValue>
                </SelectTrigger>
                </Typography>
                <SelectContent>
                  <SelectItem value="all">All Conditions</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="refurbished">Refurbished</SelectItem>
                  <SelectItem value="new_pull">New Pull</SelectItem>
                </SelectContent>
              </Select>
            );
          }
          if (column.key === "status") {
            // Force-label the trigger by rendering SelectValue's children
            // explicitly. Base UI Select's auto-render would otherwise echo
            // the raw enum (`"all"`) when no match heuristic kicks in.
            const statusLabel: Record<string, string> = {
              all: "All Status",
              active: "Active",
              scheduled: "Scheduled",
              expired: "Expired",
              revoked: "Revoked",
            };
            const current = (value && value !== "__all__" ? value : "all") as string;
            const hasValue = current !== "all";
            return (
              <Select
                value={current}
                onValueChange={(v) =>
                  onChange((v ?? "all") === "all" ? "__all__" : (v as string))
                }
              >
                <Typography asChild variant="body-sm">
                <SelectTrigger
                  className="h-9 rounded-[7px] border-input bg-card px-[10px] shadow-xs"
                  clearable={hasValue}
                  onClear={() => onChange("__all__")}
                >
                  <SelectValue placeholder={PM_ASSIGNMENTS_STRINGS.list.filters.allStatus}>
                    {statusLabel[current] ?? "All Status"}
                  </SelectValue>
                </SelectTrigger>
                </Typography>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
            );
          }
          return null;
        }}
        persistKey="ims-pm-assignments"
        serverPagination={{
          page: safePage,
          pageSize,
          total,
          isFetching: pageQuery.isFetching,
          onPageChange: setPage,
          // setPageSize atomically resets the page key via usePageSizeParam.
          onPageSizeChange: setPageSize,
          // Show the implicit revoked-status default sort in the header
          // (Last Updated, desc) so the row order is self-explanatory.
          // Clicking the sort header still takes precedence — the click
          // sets `?sort=` in the URL, which falls into the first branch.
          sort: sortDirection
            ? { column: sortColumnKey, direction: sortDirection }
            : filterStatus === "revoked"
              ? { column: "updated_at", direction: "desc" as const }
              : { column: null, direction: null },
          onSortChange: (col, dir) => {
            if (!col || !dir) {
              setMany({ sort: null, page: null });
              return;
            }
            const prefix = dir === "desc" ? "-" : "";
            setMany({ sort: `${prefix}${col}`, page: null });
          },
          filters: tableFilters,
          onFiltersChange: handleTableFiltersChange,
          filterOptions: {
            category: [],
            oem: [],
            condition: ["all", "new", "refurbished", "new_pull"],
            status: ["all", "active", "scheduled", "expired", "revoked"],
          },
        }}
        onRowClick={(row) => navigate(`/ims/pm-assignments/${row._id}`)}
        error={
          pageQuery.isError
            ? {
                title: PM_ASSIGNMENTS_STRINGS.list.error.title,
                description: PM_ASSIGNMENTS_STRINGS.list.error.description,
                onRetry: () => void pageQuery.refetch(),
              }
            : undefined
        }
        emptyState={{
          title: hasActiveFilter
            ? "No assignments match the filters"
            : "No PM assignments yet",
          description: hasActiveFilter
            ? "Adjust the filters or clear them to see more rows."
            : "Assign a product manager to a category to grant view or manage access.",
          // Empty-state CTA hidden for read-only users + when filters
          // are active (clearing the filter is the real next action).
          action:
            hasActiveFilter || !canWrite
              ? undefined
              : { label: "Add first assignment", onClick: openCreateDialog },
        }}
        onClearFilters={() => {
          // Wipe URL-backed filters AND the local AsyncSelect option
          // state so the OEM trigger label resets along with everything
          // else. `clearUrlFilters` also drops `pm_search`.
          clearUrlFilters();
          setFilterOemOption(null);
        }}
        externalFiltersActive={hasActiveFilter}
      />

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={pmGuard.guardedOnOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="pb-3">
            <Typography asChild variant="subsection-title" className="leading-snug tracking-[-0.005em]">
              <DialogTitle>
                {editingId ? PM_ASSIGNMENTS_STRINGS.list.dialogTitleEdit : PM_ASSIGNMENTS_STRINGS.list.dialogTitleCreate}
              </DialogTitle>
            </Typography>
            {editingId && (
              <Typography asChild variant="helper" tone="muted">
                <p>{PM_ASSIGNMENTS_STRINGS.list.dialogEditSubtitle}</p>
              </Typography>
            )}
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <PMAssignmentFormBody
              control={control}
              errors={errors}
              watch={watch}
              isEdit={!!editingId}
              oemOption={oemOption}
              setOemOption={setOemOption}
              pmOption={pmOption}
              setPmOption={setPmOption}
            />

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => pmGuard.guardedOnOpenChange(false)}
              >
                {PM_ASSIGNMENTS_STRINGS.list.dialogCancel}
              </Button>
              <Button
                type="submit"
                disabled={create.isPending || replace.isPending}
                throttleMs={500}
              >
                {(editingId ? replace.isPending : create.isPending)
                  ? PM_ASSIGNMENTS_STRINGS.list.dialogSaving
                  : PM_ASSIGNMENTS_STRINGS.list.dialogSave}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DiscardChangesAlertDialog
        open={pmGuard.confirmOpen}
        onConfirm={pmGuard.confirmDiscard}
        onCancel={pmGuard.cancelDiscard}
      />

      {/* Revoke PM assignment — backend `pm_service.revoke()` has no
          guards, so no preconditions block. The dialog still uses the
          shared component for visual consistency with the other delete
          modals across IMS. */}
      <DeleteWithPreconditionsDialog
        open={pendingRevoke != null}
        onOpenChange={(o) => !o && setPendingRevoke(null)}
        title={PM_ASSIGNMENTS_STRINGS.list.revokeDialogTitle}
        entityName={pendingRevoke?.user_name ?? "PM"}
        description={PM_ASSIGNMENTS_STRINGS.list.revokeDialogDescription}
        preconditions={[]}
        isPending={revoke.isPending}
        confirmLabel={PM_ASSIGNMENTS_STRINGS.list.revokeConfirmLabel}
        pendingLabel={PM_ASSIGNMENTS_STRINGS.list.revokePendingLabel}
        onConfirm={() => {
          if (!pendingRevoke) return;
          revoke.mutate(pendingRevoke.id, {
            onSuccess: () => setPendingRevoke(null),
          });
        }}
      />
    </ListPageShell>
  );
}

