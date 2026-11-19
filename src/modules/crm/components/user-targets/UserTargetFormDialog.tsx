import { useEffect, useMemo, useState } from "react"
import { Controller, useForm, useWatch, type DefaultValues } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { cn } from "@/lib/utils"
import { useAuth } from "@shared/auth/use-auth"
import { usePermission } from "@shared/rbac"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover } from "@/components/ui/popover"
import { PopoverSelectTrigger } from "@/components/ui/popover-select-trigger"
import { Typography } from "@/components/ui/typography"
import { FieldError } from "@/components/common/forms/FieldError"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useDebounce } from "@/shared/hooks"
import {
  getUserDisplayName,
  useUserOptions,
  type UserListItem,
} from "@modules/users"

import type {
  UserSalesTarget,
  UserSalesTargetCreatePayload,
  UserSalesTargetUpdatePayload,
} from "../../api"
import { InfiniteScrollPickerContent } from "../shared/InfiniteScrollPickerContent"
import {
  useCreateUserTarget,
  useReplaceUserTargetLines,
  useUpdateUserTarget,
} from "../../hooks/user-targets/useUserTargets"
import {
  BifurcationEditor,
  type BifurcationEditorState,
} from "./BifurcationEditor"
import { USER_TARGETS_STRINGS as S } from "./user-targets.strings"

// ─── Mode discriminator ────────────────────────────────────────────────
//
// Single dialog, three modes — DRY the ~70% of code shared between create
// and edit (same quarterly inputs, same annual readout, same validation).
// Amend is semantically "edit on an Approved current-FY row" — the backend
// routes to `_admin_amend` automatically; the FE just needs to show an
// "amendment" banner and change the title.
export type UserTargetFormMode = "create" | "edit" | "amend"

interface Props {
  open: boolean
  mode: UserTargetFormMode
  // For edit/amend: the row being edited. For create: null.
  target?: UserSalesTarget | null
  // When set, pre-selects the user picker and disables it (opening the
  // dialog from a specific row's "set target" button). Only applies to
  // mode='create'.
  lockedUserId?: string | null
  // Open the Bifurcation accordion by default. Set by the row-action
  // "Bifurcation" button so clicking it jumps straight into the breakdown
  // editor instead of forcing the user to expand the section first.
  // Ignored on create mode (no target id yet to load lines from).
  defaultExpandBifurcation?: boolean
  // View-only mode. Set by the parent when the current viewer can't change
  // this target at its status (e.g. a non-admin opening Approved or Pending,
  // or anyone opening prior-FY). Disables every form input, locks the
  // bifurcation editor, and hides the Save button so the dialog becomes a
  // clean "look but don't touch" surface.
  isViewOnly?: boolean
  // Called with the fresh row after a successful save. Parent typically
  // closes the dialog + refreshes its own list.
  onSaved: (row: UserSalesTarget) => void
  onClose: () => void
}

// ─── Form schema ───────────────────────────────────────────────────────
//
// Quarters are strings on input (same as `<Input type="number">` value) and
// get coerced into non-negative numbers for validation. We send decimal
// strings to the backend to preserve paisa precision — see api wrapper.
const quarterSchema = z
  .string()
  .refine((v) => v !== "" && !Number.isNaN(Number(v)), {
    message: "Enter a number",
  })
  .refine((v) => Number(v) >= 0, { message: "Must be ≥ 0" })

const formSchema = z.object({
  user_id: z.uuid({ message: "Pick a user" }),
  fy_start_year: z
    .number()
    .int()
    .min(2000)
    .max(2100),
  q1_target: quarterSchema,
  q2_target: quarterSchema,
  q3_target: quarterSchema,
  q4_target: quarterSchema,
})

type FormValues = z.infer<typeof formSchema>

// ─── Helpers ───────────────────────────────────────────────────────────

function currentFyStartYear(): number {
  // India FY: Apr 1 → Mar 31. Apr-Dec of calendar year Y → FY starts in Y;
  // Jan-Mar of year Y → FY started in Y-1. Mirrors the backend fy_of helper.
  const now = new Date()
  const month = now.getUTCMonth() + 1 // 1-12
  const year = now.getUTCFullYear()
  return month >= 4 ? year : year - 1
}

function formatFyLabel(fyStartYear: number): string {
  // Matches the backend's stored fy_label column (full years, dash).
  return `${fyStartYear}-${fyStartYear + 1}`
}

function toDisplayAmount(value: string): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return "0"
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 })
}

function initialValues(
  mode: UserTargetFormMode,
  target: UserSalesTarget | null | undefined,
  lockedUserId: string | null | undefined,
): DefaultValues<FormValues> {
  if (target && mode !== "create") {
    return {
      user_id: target.user.id,
      fy_start_year: target.fy_start_year,
      q1_target: target.q1_target,
      q2_target: target.q2_target,
      q3_target: target.q3_target,
      q4_target: target.q4_target,
    }
  }
  return {
    user_id: lockedUserId ?? "",
    fy_start_year: currentFyStartYear(),
    q1_target: "0",
    q2_target: "0",
    q3_target: "0",
    q4_target: "0",
  }
}

// ─── Component ─────────────────────────────────────────────────────────

export function UserTargetFormDialog({
  open,
  mode,
  target,
  lockedUserId,
  defaultExpandBifurcation = false,
  isViewOnly = false,
  onSaved,
  onClose,
}: Props) {
  const createMutation = useCreateUserTarget()
  const updateMutation = useUpdateUserTarget()
  const replaceLines = useReplaceUserTargetLines()
  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    replaceLines.isPending

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues(mode, target, lockedUserId),
  })

  // Reset the form whenever the dialog opens with a different row (edit mode
  // re-uses the same component for different rows across the list page).
  useEffect(() => {
    if (open) form.reset(initialValues(mode, target, lockedUserId))
  }, [open, mode, target, lockedUserId, form])

  const quarters = useWatch({
    control: form.control,
    name: ["q1_target", "q2_target", "q3_target", "q4_target"],
  })
  const fyWatched = useWatch({ control: form.control, name: "fy_start_year" })
  const annual = useMemo(
    () => quarters.reduce((sum, v) => sum + (Number(v) || 0), 0),
    [quarters],
  )

  // ── Bifurcation accordion state ────────────────────────────────────
  //
  // The editor reports its own dirty flag + current line set. We only PUT
  // ``/lines`` after save when ``dirty`` — a plain header-only save (which
  // semantically represents an "All / All / All" catch-all target) doesn't
  // touch the lines endpoint. Expand by default when the row-action
  // Expanded by default so the seed ``(All, All, All)`` catch-all row is
  // visible from first paint — the user shouldn't have to click to see
  // what the implicit breakdown looks like. The ``defaultExpandBifurcation``
  // prop is kept for callers that may want to force-collapse in the future,
  // but today every entry point wants the accordion open.
  const [bifurcationExpanded, setBifurcationExpanded] = useState<string[]>(
    ["bifurcation"],
  )
  // Silence the unused-prop lint hint — kept for future callers that may
  // want to override the "always open" default.
  void defaultExpandBifurcation
  const [bifurcation, setBifurcation] = useState<BifurcationEditorState>({
    dirty: false,
    lines: [],
    hasMismatch: false,
    hasOverlap: false,
  })

  // Save is blocked if the user has interacted with the bifurcation editor
  // and the result is invalid (overlap OR mismatch). Keeps the one-click
  // header-only flow working.
  const bifurcationBlocksSave =
    bifurcation.dirty && (bifurcation.hasOverlap || bifurcation.hasMismatch)

  const onSubmit = form.handleSubmit(async (values) => {
    // ── Leg 1: header POST / PATCH ──────────────────────────────────
    //
    // ``mutateAsync`` rejects on backend errors (e.g. 409 duplicate FY,
    // 403 outside hierarchy); the hook's ``onError`` surfaces the red
    // toast. Keep the dialog open on failure so the user can fix and
    // retry — losing their typed values to a transient error is worse
    // than a stuck dialog.
    let savedRow: UserSalesTarget
    try {
      if (mode === "create") {
        const payload: UserSalesTargetCreatePayload = values
        savedRow = await createMutation.mutateAsync(payload)
      } else {
        if (!target) return
        const payload: UserSalesTargetUpdatePayload = {
          q1_target: values.q1_target,
          q2_target: values.q2_target,
          q3_target: values.q3_target,
          q4_target: values.q4_target,
        }
        savedRow = await updateMutation.mutateAsync({
          id: target.id,
          payload,
        })
      }
    } catch {
      /* header save failed — stay open, toast already shown. */
      return
    }

    // ── Leg 2: optional lines PUT ───────────────────────────────────
    //
    // Only fired if the user actually touched the breakdown. A failure
    // here leaves the (already-saved) header intact — close the dialog
    // either way so the user isn't stuck in a half-saved state. If the
    // lines were rejected the hook's toast tells them, and they can
    // re-open via the row-action "Bifurcation" button to try again.
    if (bifurcation.dirty) {
      try {
        await replaceLines.mutateAsync({
          id: savedRow.id,
          payload: { lines: bifurcation.lines },
        })
      } catch {
        /* lines PUT failed — toast fired, header is still saved. */
      }
    }

    onSaved(savedRow)
  })

  const title = isViewOnly
    ? S.dialog.view.title
    : mode === "create"
      ? S.dialog.create.title
      : mode === "amend"
        ? S.dialog.amend.title
        : S.dialog.edit.title

  const userIsLocked = mode !== "create" || Boolean(lockedUserId)

  // Scoped read-only styling. The shared Input / PopoverSelectTrigger
  // primitives use `disabled:opacity-{50,60}`, which washes out BOTH the
  // border and the value text — making a view-only dialog hard to actually
  // read. In this view-only context we neutralise the opacity and switch to
  // a muted gray fill so fields clearly read as "not editable" while the
  // value stays fully legible. Only applied to controls that are disabled
  // because the dialog is view-only — fields disabled for other reasons
  // (e.g. FY is always disabled on edit) still get the global dim treatment.
  const readOnlyFieldClass = isViewOnly
    ? "disabled:opacity-100 disabled:bg-muted disabled:text-foreground disabled:border-input"
    : undefined

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      {/* Always render at the wide size so the quarterly inputs + the
          Bifurcation accordion share the same breathing room — users
          shouldn't see the dialog resize mid-edit when they expand the
          breakdown. Cap at 1200px / 90vh so ultrawides don't stretch past
          readable width and tall viewports keep the footer visible. */}
      <DialogContent className="w-[90vw] max-w-[1200px] sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {/* ``DialogTitle`` already renders an <h2>; wrapping it with
              another <h2> (via Typography variant="section-title") caused a
              hydration warning. Pass the title text directly instead. */}
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {mode === "amend" ? (
            <div className="rounded-md border border-warning-soft bg-warning-soft/50 p-3">
              <Typography variant="helper" tone="warning">
                {S.dialog.amend.banner}
              </Typography>
            </div>
          ) : (
            <Typography variant="helper" tone="muted">
              {S.dialog.create.subtitle}
            </Typography>
          )}

          {/* Target user */}
          <div className="flex flex-col gap-1">
            <Label>{S.dialog.form.targetUser.label}</Label>
            <Controller
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <TargetUserPicker
                  value={field.value}
                  onChange={field.onChange}
                  disabled={userIsLocked || isViewOnly}
                  initialDisplayName={target?.user.name}
                  className={readOnlyFieldClass}
                />
              )}
            />
            <FieldError message={form.formState.errors.user_id?.message} />
          </div>

          {/* FY */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="fy_start_year">{S.dialog.form.fy.label}</Label>
            <Controller
              control={form.control}
              name="fy_start_year"
              render={({ field }) => (
                <Input
                  id="fy_start_year"
                  type="number"
                  min={2000}
                  max={2100}
                  disabled={mode !== "create" || isViewOnly}
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className={readOnlyFieldClass}
                />
              )}
            />
            <Typography variant="helper" tone="muted">
              {S.dialog.form.fy.helper}
            </Typography>
            <Typography variant="helper" tone="label">
              FY {formatFyLabel(fyWatched)}
            </Typography>
            <FieldError message={form.formState.errors.fy_start_year?.message} />
          </div>

          {/* Quarters */}
          <div className="grid grid-cols-2 gap-3">
            <QuarterField
              name="q1_target"
              label={S.dialog.form.quarters.q1}
              control={form.control}
              error={form.formState.errors.q1_target?.message}
              disabled={isViewOnly}
              className={readOnlyFieldClass}
            />
            <QuarterField
              name="q2_target"
              label={S.dialog.form.quarters.q2}
              control={form.control}
              error={form.formState.errors.q2_target?.message}
              disabled={isViewOnly}
              className={readOnlyFieldClass}
            />
            <QuarterField
              name="q3_target"
              label={S.dialog.form.quarters.q3}
              control={form.control}
              error={form.formState.errors.q3_target?.message}
              disabled={isViewOnly}
              className={readOnlyFieldClass}
            />
            <QuarterField
              name="q4_target"
              label={S.dialog.form.quarters.q4}
              control={form.control}
              error={form.formState.errors.q4_target?.message}
              disabled={isViewOnly}
              className={readOnlyFieldClass}
            />
          </div>

          {/* Annual readout */}
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 p-3">
            <Typography variant="body" tone="muted">
              {S.dialog.form.annual}
            </Typography>
            <Typography variant="card-title">
              ₹ {toDisplayAmount(String(annual))}
            </Typography>
          </div>
          <Typography variant="helper" tone="muted">
            {S.dialog.form.monthlyHint}
          </Typography>

          {/* Bifurcation accordion — the single entry point for breaking a
              target down by (category, OEM, condition). On create we have
              no header id yet, so lazy GET is skipped and the editor starts
              empty; on edit we hydrate from the existing lines. Untouched =
              implicit "All / All / All" catch-all target. */}
          <Accordion
            value={bifurcationExpanded}
            onValueChange={(next) =>
              setBifurcationExpanded(
                Array.isArray(next) ? next : next ? [next] : [],
              )
            }
          >
            <AccordionItem value="bifurcation">
              <AccordionTrigger>
                {S.page.cta.bifurcate}
                {bifurcation.lines.length > 0 ? (
                  <span className="ml-2 rounded bg-muted px-1.5 text-xs text-muted-foreground">
                    {bifurcation.lines.length}
                  </span>
                ) : null}
              </AccordionTrigger>
              <AccordionContent>
                <BifurcationEditor
                  targetId={target?.id ?? null}
                  headerQuarters={{
                    q1: String(quarters[0] ?? "0"),
                    q2: String(quarters[1] ?? "0"),
                    q3: String(quarters[2] ?? "0"),
                    q4: String(quarters[3] ?? "0"),
                  }}
                  enabled={bifurcationExpanded.includes("bifurcation")}
                  onChange={setBifurcation}
                  readOnly={isViewOnly}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <DialogFooter>
            <Button
              type="button"
              variant={isViewOnly ? "default" : "outline"}
              onClick={onClose}
              disabled={isSaving}
            >
              {isViewOnly
                ? S.dialog.actions.close
                : S.dialog.actions.cancel}
            </Button>
            {isViewOnly ? null : (
              <Button
                type="submit"
                disabled={isSaving || bifurcationBlocksSave}
              >
                {mode === "amend"
                  ? S.dialog.actions.saveAmendment
                  : S.dialog.actions.save}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Quarter input (DRY the 4 identical rows) ─────────────────────────

interface QuarterFieldProps {
  name: "q1_target" | "q2_target" | "q3_target" | "q4_target"
  label: string
  // Minimal control-side typing — React Hook Form's Control<T> inference is
  // already enforced upstream via `form.control`.
  control: ReturnType<typeof useForm<FormValues>>["control"]
  error: string | undefined
  disabled?: boolean
  className?: string
}

function QuarterField({
  name,
  label,
  control,
  error,
  disabled,
  className,
}: QuarterFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={name}>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Input
            id={name}
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            disabled={disabled}
            className={className}
            {...field}
          />
        )}
      />
      <FieldError message={error} />
    </div>
  )
}

// ─── Target user picker (reuses the shared infinite-scroll dropdown) ─

interface TargetUserPickerProps {
  value: string
  onChange: (userId: string) => void
  disabled?: boolean
  initialDisplayName?: string | null
  className?: string
}

function TargetUserPicker({
  value,
  onChange,
  disabled,
  initialDisplayName,
  className,
}: TargetUserPickerProps) {
  const [open, setOpen] = useState(false)
  const [rawSearch, setRawSearch] = useState("")
  const debouncedSearch = useDebounce(rawSearch, 300)

  // Hierarchy scope: non-admin viewers only see their reporting subtree
  // (and themselves — the subtree query excludes the manager, so we
  // prepend the actor as a synthetic "self" row below). Admin / superadmin
  // see the full directory, matching the backend's write-authority rules.
  const { user: actor } = useAuth()
  const { isSuperuser, isAdminRole } = usePermission()
  const isAdminLike = isSuperuser || isAdminRole
  const scopeManagerId =
    !isAdminLike && actor?.id ? actor.id : undefined

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useUserOptions(
    debouncedSearch,
    scopeManagerId ? { manager_id: scopeManagerId } : {},
  )

  const flatItems = useMemo<UserListItem[]>(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data?.pages],
  )

  // Prepend "self" to the dropdown for non-admin viewers. The backend's
  // ``?manager_id=`` subtree filter excludes the manager themselves — so
  // a Sales Manager setting their OWN target would otherwise see an empty
  // row for themselves. Only shown when the raw-search prefix matches the
  // actor's name / email (or search is empty) so filtering stays sane.
  const selfEntry = useMemo<UserListItem | null>(() => {
    if (isAdminLike || !actor) return null
    const q = debouncedSearch.trim().toLowerCase()
    if (q) {
      const label = `${actor.first_name ?? ""} ${actor.last_name ?? ""} ${actor.email ?? ""}`.toLowerCase()
      if (!label.includes(q)) return null
    }
    return {
      id: actor.id,
      email: actor.email ?? "",
      first_name: actor.first_name ?? "",
      last_name: actor.last_name ?? null,
      is_active: true,
      is_superuser: Boolean(actor.is_superuser),
      last_login_at: null,
      manager_ids: [],
      managers: [],
      roles: actor.roles ?? [],
      channel_tags: null,
      current_target: null,
      previous_target: null,
    } as UserListItem
  }, [actor, debouncedSearch, isAdminLike])

  // De-duplicate: if the subtree ever returns the actor (defensive), the
  // synthetic self row wins so the "self (You)" affordance renders once.
  const items = useMemo<UserListItem[]>(() => {
    if (!selfEntry) return flatItems
    const withoutSelf = flatItems.filter((u) => u.id !== selfEntry.id)
    return [selfEntry, ...withoutSelf]
  }, [flatItems, selfEntry])

  // Prefer the live hit from the picker page; fall back to the row embed
  // the parent handed us so edit mode doesn't require an extra fetch.
  const selectedLabel = useMemo(() => {
    const hit = items.find((u) => u.id === value)
    if (hit) return getUserDisplayName(hit)
    return initialDisplayName ?? ""
  }, [items, initialDisplayName, value])

  function pick(id: string) {
    onChange(id)
    setOpen(false)
    setRawSearch("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverSelectTrigger
        hasValue={Boolean(value)}
        disabled={disabled}
        className={className}
      >
        {selectedLabel || S.dialog.form.targetUser.placeholder}
      </PopoverSelectTrigger>
      <InfiniteScrollPickerContent<UserListItem>
        search={{
          value: rawSearch,
          onChange: setRawSearch,
          placeholder: S.dialog.form.targetUser.placeholder,
        }}
        query={{
          isLoading,
          isError,
          error,
          hasNextPage,
          isFetchingNextPage,
          fetchNextPage,
        }}
        items={items}
        renderItem={(item) => {
          const isSelf = actor?.id === item.id
          return (
            <button
              type="button"
              onClick={() => pick(item.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left",
                "hover:bg-accent",
                value === item.id && "bg-accent/50",
              )}
            >
              <span className="min-w-0 flex-1 truncate">
                {getUserDisplayName(item)}
                {isSelf ? (
                  <span className="ml-1 text-muted-foreground">(You)</span>
                ) : null}
              </span>
              {item.email ? (
                <span className="shrink-0 text-muted-foreground">
                  {item.email}
                </span>
              ) : null}
            </button>
          )
        }}
      />
    </Popover>
  )
}
