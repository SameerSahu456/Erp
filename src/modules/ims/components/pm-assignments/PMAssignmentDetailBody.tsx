import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarDays, Eye, Mail, Pencil, ShieldCheck, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { EntityHeader } from "@/components/page-shells/EntityHeader";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type AsyncSelectOption } from "@/components/ui/async-select";
import { useDialogDirtyGuard } from "@/shared/hooks";
import { DiscardChangesAlertDialog } from "@/shared/components/DiscardChangesAlertDialog";
import { usePermission } from "@shared/rbac";
import { getUserDisplayName, useUser } from "@modules/users";

import { DeleteWithPreconditionsDialog } from "../../components/shared/DeleteWithPreconditionsDialog";
import { PMAssignmentFormBody } from "../../components/PMAssignmentFormBody";
import {
  useReplacePMAssignment,
  useRevokePMAssignment,
  usePMAssignment,
} from "../../hooks/pm-assignments/usePMAssignments";
import { useCategory } from "../../hooks/categories/useCategories";
import { editPMAssignmentSchema, type CreatePMAssignmentInput } from "../../schemas";
import { imsCan } from "../../permissions";
import { PM_ASSIGNMENTS_STRINGS } from "./pm-assignments.strings";
import {
  CONDITION_LABEL,
  formatDate,
  STATUS_BADGE_VARIANT,
  STATUS_LABEL,
  type PMAssignmentDenorm,
} from "./pm-assignment-detail-helpers";


export function PMAssignmentDetailBody() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // RBAC: read-only users see assignment details without Edit / Revoke.
  const { can } = usePermission();
  const canWrite = can([...imsCan.write]);
  const [searchParams] = useSearchParams();
  // `?include_revoked=true` lets admin / history nav arrive on a revoked
  // row's detail page. Default false matches the backend behavior (revoked
  // rows 404 unless explicitly requested).
  const includeRevoked = searchParams.get("include_revoked") === "true";

  const { data: pm, isLoading, isError } = usePMAssignment(id, {
    include_revoked: includeRevoked,
  });
  // Lazy fetch the scoped category so we can tell L1 from L2 — the
  // PMAssignmentResponse only denorms `category_name`, not the parent
  // chain. `useCategory` is gated on a truthy id, so this is a no-op
  // for global-PM rows (category_id null) where there's nothing to
  // distinguish.
  const { data: scopeCategory } = useCategory(pm?.category_id ?? "");
  const revoke = useRevokePMAssignment();
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  // ── Edit-as-modal (per product feedback) ────────────────────────────────
  // The PM edit form opens as a Dialog on this detail page — same shape /
  // pattern as the create dialog on the list page (PMAssignmentsPage). The
  // dedicated /:id/edit route was deleted; the form body is the shared
  // `PMAssignmentFormBody` component so create and edit can't drift.
  //
  // After save, Replace = revoke + create-new returns the NEW assignment;
  // we `navigate` to its detail page with `replace: true` so the OLD
  // (now-revoked) URL is wiped from history — back-button on the new
  // detail then goes straight to the list, no breadcrumb of revoked rows.
  const replace = useReplacePMAssignment(id);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [oemOption, setOemOption] = useState<AsyncSelectOption | null>(null);
  const [pmOption, setPmOption] = useState<AsyncSelectOption | null>(null);
  const form = useForm<CreatePMAssignmentInput>({
    resolver: zodResolver(editPMAssignmentSchema),
    defaultValues: {
      user_id: "",
      category_id: null,
      oem_id: null,
      condition: null,
      permission_type: "view",
      effective_from: null,
      effective_until: null,
      notes: null,
    },
  });
  const { control, formState, handleSubmit, reset, setError, watch } = form;
  const formErrors = formState.errors;

  // Denorm joins live on PMAssignmentResponse. When user_name is missing
  // (older row, deleted user) fall back to fetching the user so the header
  // never shows a raw UUID. Hooks run on every render — keep this above the
  // early returns.
  const denormEarly = pm as (typeof pm & PMAssignmentDenorm) | undefined;
  const needsUserFallback =
    !!pm && (!denormEarly?.user_name || !String(denormEarly.user_name).trim());
  const fallbackUser = useUser(needsUserFallback ? pm!.user_id : "");

  // Hydrate the form + picker labels each time the dialog opens. Keying
  // on `editDialogOpen` so a cancelled-and-reopened dialog restarts from
  // the loaded snapshot rather than holding stale draft values.
  useEffect(() => {
    if (!editDialogOpen || !pm) return;
    const d = pm as typeof pm & PMAssignmentDenorm;
    reset({
      user_id: pm.user_id,
      category_id: pm.category_id ?? null,
      oem_id: pm.oem_id ?? null,
      condition:
        (pm.condition as "new" | "refurbished" | "new_pull" | null) ?? null,
      permission_type: (pm.permission_type as "view" | "manage") ?? "view",
      effective_from: pm.effective_from ?? null,
      effective_until: pm.effective_until ?? null,
      notes: pm.notes ?? null,
    });
    setOemOption(
      pm.oem_id
        ? { id: pm.oem_id, label: d.oem_name ?? "Selected Brand/OEM" }
        : null,
    );
    setPmOption({
      id: pm.user_id,
      label: d.user_name ?? "Selected PM",
    });
  }, [editDialogOpen, pm, reset]);

  // Discard-changes guard — same hook the list-page dialog uses.
  const editGuard = useDialogDirtyGuard(formState.isDirty, (open) => {
    setEditDialogOpen(open);
    if (!open) {
      // Reset picker labels alongside form state so a cancelled edit
      // doesn't leak labels into a future open.
      setOemOption(null);
      setPmOption(null);
    }
  });

  async function onEditSubmit(values: CreatePMAssignmentInput) {
    try {
      const next = await replace.mutateAsync(values);
      // Close the dialog without re-prompting the discard guard — the
      // save IS the discard.
      form.reset(values);
      setEditDialogOpen(false);
      // Replace creates a new row; navigate to its detail with
      // `replace: true` so the OLD (now-revoked) URL is wiped from
      // history. Back from the new detail then goes to the list — no
      // crumb of revoked rows on the stack.
      navigate(`/ims/pm-assignments/${next.id}`, { replace: true });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to save assignment.";
      const target = /past|effective_from/i.test(message)
        ? "effective_from"
        : /effective_until|end date/i.test(message)
          ? "effective_until"
          : /duplicate|exists/i.test(message)
            ? "category_id"
            : null;
      if (target) {
        setError(target, { type: "server", message });
      } else {
        toast.error(message);
      }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !pm) {
    return <Navigate to="/ims/pm-assignments" replace />;
  }

  const denorm = pm as typeof pm & PMAssignmentDenorm;
  // The fallback fetches the user when the denorm join is missing. If it
  // *also* fails (deleted user / permission denied), surface a labelled
  // "Unavailable" string so support can tell the difference between a
  // missing join and a broken lookup.
  const fallbackErrored = needsUserFallback && fallbackUser.isError;
  const userName =
    denorm.user_name ||
    (fallbackUser.data
      ? getUserDisplayName(fallbackUser.data)
      : fallbackUser.isLoading
        ? "Loading…"
        : fallbackErrored
          ? "Unavailable"
          : "Unknown PM");
  const userEmail = denorm.user_email || fallbackUser.data?.email || "—";
  const userNameTooltip = fallbackErrored
    ? `Could not load this PM (id ${pm.user_id}). They may have been deleted or your role lacks access.`
    : undefined;
  // `pm.category_id === null` is the backend's "global PM" / all-categories
  // sentinel; in that case `denorm.category_name` is null too. Render the
  // sentinel as plain text instead of coercing the null into the UI (used
  // to flash literal "null" in the title + the linked-category row).
  const isGlobalCategory = pm.category_id == null;
  const categoryName = isGlobalCategory
    ? "All categories"
    : (denorm.category_name ?? pm.category_id);

  // L1 vs L2: an L2 (subcategory) has a non-null `parent_id` on its
  // category row. When the assignment is scoped to an L2 we want the
  // parent L1 to surface as "Category" and the L2 to surface as
  // "Subcategory" — otherwise both rows agreed on the same value and
  // the "Subcategory" row was a hardcoded "All subcategories".
  const isSubcategoryScope = !isGlobalCategory && !!scopeCategory?.parent_id;
  const parentCategoryId = scopeCategory?.parent_id ?? null;
  const parentCategoryName = scopeCategory?.parent_name ?? null;
  const oemName = denorm.oem_name ?? null;
  const conditionLabel = pm.condition
    ? (CONDITION_LABEL[pm.condition] ?? pm.condition)
    : null;
  const effFrom = denorm.effective_from ?? null;
  const effUntil = denorm.effective_until ?? null;
  const status = denorm.status ?? "active";
  const isRevoked = status === "revoked";
  const revokedAt = denorm.revoked_at ?? null;
  const notes = denorm.notes ?? null;

  // Backend has a single permission_type (`view` | `manage`); the source UI
  // surfaces two pills. `manage` implies view + edit; `view` is read-only.
  const canView = true;
  const canEdit = pm.permission_type === "manage";

  const conditionPillVariant: "success" | "info" | "warning" | "neutral" =
    pm.condition === "new"
      ? "success"
      : pm.condition === "refurbished"
        ? "info"
        : pm.condition === "new_pull"
          ? "warning"
          : "neutral";

  // Header subtitle. When the scope is an L2, surface the parent L1 in
  // the "Category" slot and the L2 in the "Subcategory" slot — matches
  // the Scope card below. Global / L1 keep the existing shape.
  const scopeLabel = [
    isSubcategoryScope ? (parentCategoryName ?? categoryName) : categoryName,
    isSubcategoryScope ? categoryName : "All subcategories",
    oemName ?? "All Brand/OEMs",
    conditionLabel ? `${conditionLabel} only` : "All conditions",
  ].join(" · ");

  return (
    <div className="space-y-6">
      <EntityHeader
        // Title drops the category suffix when the assignment is global
        // (no specific category) — otherwise the header reads
        // "Jane — null" or, after the null-fix, "Jane — All categories"
        // both of which add visual noise. The scope subtitle below
        // already conveys the "All categories" context.
        title={
          isGlobalCategory ? userName : `${userName} — ${categoryName}`
        }
        subtitle={scopeLabel}
        status={{
          label: STATUS_LABEL[status] ?? status,
          variant: STATUS_BADGE_VARIANT[status] ?? "neutral",
        }}
        backHref="/ims/pm-assignments"
        actions={
          canWrite ? (
            <>
              <Button
                variant="outline"
                disabled={isRevoked}
                title={isRevoked ? PM_ASSIGNMENTS_STRINGS.detail.editButtonDisabledTitle : undefined}
                // Opens an in-page modal (the previous dedicated /edit
                // page was removed per product feedback — edit should
                // feel like the create dialog on the list page, not a
                // route change).
                onClick={() => setEditDialogOpen(true)}
              >
                <Pencil className="mr-1.5 size-4" />
                {PM_ASSIGNMENTS_STRINGS.detail.editButton}
              </Button>
              <Button
                variant="outline"
                disabled={isRevoked || revoke.isPending}
                onClick={() => setConfirmRevoke(true)}
                className="text-destructive hover:text-destructive"
                title={isRevoked ? PM_ASSIGNMENTS_STRINGS.detail.revokeButtonDisabledTitle : undefined}
              >
                <Trash2 className="mr-1.5 size-4" />
                {revoke.isPending ? PM_ASSIGNMENTS_STRINGS.detail.revokeButtonPending : PM_ASSIGNMENTS_STRINGS.detail.revokeButton}
              </Button>
            </>
          ) : undefined
        }
      />

      {isRevoked && revokedAt && (
        <Typography asChild variant="body" tone="danger">
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
            {PM_ASSIGNMENTS_STRINGS.detail.revokedBanner(formatDate(revokedAt))}
          </div>
        </Typography>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <Typography asChild variant="helper" tone="muted" className="flex items-center gap-2">
            <div>
              <ShieldCheck className="size-3.5" />
              {PM_ASSIGNMENTS_STRINGS.detail.permissionsCard}
            </div>
          </Typography>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusBadge variant={canView ? "success" : "neutral"}>
              {canView ? PM_ASSIGNMENTS_STRINGS.detail.viewYes : PM_ASSIGNMENTS_STRINGS.detail.viewNo}
            </StatusBadge>
            <StatusBadge variant={canEdit ? "success" : "neutral"}>
              {canEdit ? PM_ASSIGNMENTS_STRINGS.detail.editYes : PM_ASSIGNMENTS_STRINGS.detail.editNo}
            </StatusBadge>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <Typography asChild variant="helper" tone="muted" className="flex items-center gap-2">
            <div>
              <CalendarDays className="size-3.5" />
              {PM_ASSIGNMENTS_STRINGS.detail.validityCard}
            </div>
          </Typography>
          <Typography variant="body-strong" className="mt-1.5">
            {effFrom ? formatDate(effFrom) : "—"}
            <span className="mx-1.5 text-muted-foreground">→</span>
            {effUntil ? formatDate(effUntil) : "—"}
          </Typography>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <Typography asChild variant="helper" tone="muted" className="flex items-center gap-2">
            <div>
              <Eye className="size-3.5" />
              {PM_ASSIGNMENTS_STRINGS.detail.conditionCard}
            </div>
          </Typography>
          <div className="mt-2">
            {conditionLabel ? (
              <StatusBadge variant={conditionPillVariant}>
                {conditionLabel}
              </StatusBadge>
            ) : (
              <Typography asChild variant="body" tone="muted">
                <span>{PM_ASSIGNMENTS_STRINGS.detail.allConditions}</span>
              </Typography>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{PM_ASSIGNMENTS_STRINGS.detail.pmCardTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <Typography asChild variant="body">
            <dl className="divide-y">
              <div className="flex items-start justify-between gap-4 py-2 first:pt-0">
                <dt className="text-muted-foreground">{PM_ASSIGNMENTS_STRINGS.detail.pmNameLabel}</dt>
                {userNameTooltip ? (
                  <TooltipProvider delay={120}>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <dd className="cursor-default font-medium text-destructive">
                            {userName}
                          </dd>
                        }
                      />
                      <TooltipContent className="max-w-[320px] whitespace-normal break-words text-left leading-relaxed [&]:items-start">
                        {userNameTooltip}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <dd className="font-medium">{userName}</dd>
                )}
              </div>
              <div className="flex items-start justify-between gap-4 py-2">
                <dt className="text-muted-foreground">{PM_ASSIGNMENTS_STRINGS.detail.pmEmailLabel}</dt>
                <dd>
                  {userEmail !== "—" ? (
                    <a
                      href={`mailto:${userEmail}`}
                      className="inline-flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <Mail className="size-3.5" />
                      {userEmail}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
            </dl>
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{PM_ASSIGNMENTS_STRINGS.detail.scopeCardTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <Typography asChild variant="body">
            <dl className="divide-y">
              <div className="flex items-start justify-between gap-4 py-2 first:pt-0">
                <dt className="text-muted-foreground">{PM_ASSIGNMENTS_STRINGS.detail.categoryLabel}</dt>
                <dd>
                  {/* Three states:
                      - global (no category_id): muted "All categories"
                        sentinel, same shape as the OEM row's "All
                        Brand/OEMs".
                      - L1 scope: the assignment's category IS the L1,
                        link to its detail page.
                      - L2 scope: the assignment's category is a sub-
                        category; surface the PARENT L1 here so the
                        Subcategory row below can show the L2. Falls
                        back to the L2 itself while the lazy
                        `useCategory` is still resolving. */}
                  {isGlobalCategory ? (
                    <span className="text-muted-foreground">
                      {PM_ASSIGNMENTS_STRINGS.detail.allCategories}
                    </span>
                  ) : isSubcategoryScope && parentCategoryId ? (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/ims/categories/${parentCategoryId}`)
                      }
                      className="text-primary hover:underline"
                    >
                      {parentCategoryName ?? "—"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/ims/categories/${pm.category_id}`)
                      }
                      className="text-primary hover:underline"
                    >
                      {categoryName}
                    </button>
                  )}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-2">
                <dt className="text-muted-foreground">{PM_ASSIGNMENTS_STRINGS.detail.subcategoryLabel}</dt>
                <dd>
                  {/* L2 scope → render the assignment's category here
                      (the L2). L1 / global → "All subcategories"
                      sentinel, mirroring the rest of the card's
                      "All …" treatment. */}
                  {isSubcategoryScope ? (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/ims/categories/${pm.category_id}`)
                      }
                      className="text-primary hover:underline"
                    >
                      {categoryName}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">
                      {PM_ASSIGNMENTS_STRINGS.detail.allSubcategories}
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-2 last:pb-0">
                <dt className="text-muted-foreground">{PM_ASSIGNMENTS_STRINGS.detail.oemLabel}</dt>
                <dd>
                  {pm.oem_id ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/ims/oems/${pm.oem_id}`)}
                      className="text-primary hover:underline"
                    >
                      {oemName ?? pm.oem_id}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">{PM_ASSIGNMENTS_STRINGS.detail.allOems}</span>
                  )}
                </dd>
              </div>
            </dl>
            </Typography>
          </CardContent>
        </Card>
      </div>

      {notes && (
        <Card>
          <CardHeader>
            <CardTitle>{PM_ASSIGNMENTS_STRINGS.detail.notesCardTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <Typography
              variant="body"
              tone="muted"
              className="whitespace-pre-wrap"
            >
              {notes}
            </Typography>
          </CardContent>
        </Card>
      )}

      <Typography asChild variant="helper">
        <p>
          {PM_ASSIGNMENTS_STRINGS.detail.createdPrefix} {formatDate(pm.created_at)}{PM_ASSIGNMENTS_STRINGS.detail.lastUpdatedInfix}{" "}
          {formatDate(pm.updated_at)}
        </p>
      </Typography>

      {/* Revoke PM assignment — backend `pm_service.revoke()` has no
          guards. The assignment row stays in history; admins can fetch
          revoked rows via `?include_revoked=true`. */}
      <DeleteWithPreconditionsDialog
        open={confirmRevoke}
        onOpenChange={(o) => !o && setConfirmRevoke(false)}
        title={PM_ASSIGNMENTS_STRINGS.detail.revokeDialogTitle}
        entityName={userName}
        description={PM_ASSIGNMENTS_STRINGS.detail.revokeDialogDescription}
        preconditions={[]}
        isPending={revoke.isPending}
        confirmLabel={PM_ASSIGNMENTS_STRINGS.detail.revokeConfirmLabel}
        pendingLabel={PM_ASSIGNMENTS_STRINGS.detail.revokePendingLabel}
        onConfirm={() =>
          revoke.mutate(pm.id, {
            onSuccess: () => {
              // No removeQueries here: it would trigger the still-
              // mounted usePMAssignment(id) observer to re-fetch and
              // 404 (without ?include_revoked=true). useRevokePMAssignment's
              // predicate-skip handles the invalidate cleanly; the
              // cache entry stays put until this page unmounts on
              // navigate below.
              setConfirmRevoke(false);
              navigate("/ims/pm-assignments");
            },
          })
        }
      />

      {/* Edit dialog — shape mirrors the create/edit dialog on
          PMAssignmentsPage. Body is the shared `PMAssignmentFormBody` so
          both surfaces stay in lockstep. Saving Replaces the assignment
          (revoke + create-new) and navigates to the new row's detail
          page with `replace: true` — see comment on `onEditSubmit`. */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={editGuard.guardedOnOpenChange}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="pb-3">
            <Typography asChild variant="subsection-title" className="leading-snug tracking-[-0.005em]">
              <DialogTitle>{PM_ASSIGNMENTS_STRINGS.detail.editDialogTitle}</DialogTitle>
            </Typography>
            <Typography asChild variant="helper" tone="muted">
              <p>{PM_ASSIGNMENTS_STRINGS.detail.editDialogSubtitle}</p>
            </Typography>
          </DialogHeader>

          <form onSubmit={handleSubmit(onEditSubmit)} noValidate>
            <PMAssignmentFormBody
              control={control}
              errors={formErrors}
              watch={watch}
              isEdit
              oemOption={oemOption}
              setOemOption={setOemOption}
              pmOption={pmOption}
              setPmOption={setPmOption}
            />

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => editGuard.guardedOnOpenChange(false)}
              >
                {PM_ASSIGNMENTS_STRINGS.detail.editDialogCancel}
              </Button>
              <Button
                type="submit"
                disabled={replace.isPending}
                throttleMs={500}
              >
                {replace.isPending ? PM_ASSIGNMENTS_STRINGS.detail.editDialogSaving : PM_ASSIGNMENTS_STRINGS.detail.editDialogSave}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DiscardChangesAlertDialog
        open={editGuard.confirmOpen}
        onConfirm={editGuard.confirmDiscard}
        onCancel={editGuard.cancelDiscard}
      />
    </div>
  );
}

