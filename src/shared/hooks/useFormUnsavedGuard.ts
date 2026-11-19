import { useMemo } from "react";
import { useWatch, type FieldValues, type UseFormReturn } from "react-hook-form";

import { deepEqual } from "@/lib/deep-equal";
import {
  useUnsavedChangesGuard,
  type UnsavedChangesGuard,
} from "@/hooks/use-unsaved-changes-guard";

// RHF's `UseFormReturn` carries three generics (`TFieldValues`,
// `TContext`, `TTransformedValues`). Forms that pass a Zod `.transform()`
// resolver instantiate the third — accepting only the 1-generic form
// rejects them. Allow any context / transform here; only TFieldValues
// matters for the dirty-compare path.
type AnyForm<T extends FieldValues> = UseFormReturn<T, unknown, FieldValues>;

/**
 * Unified unsaved-changes guard for React Hook Form pages.
 *
 * Combines two fixes the IMS forms were missing:
 *
 *   1. **Accurate dirty detection.** RHF's `formState.isDirty` can be
 *      falsely `true` on an untouched form when any controlled component
 *      (HsnAsyncSelect, CategoryPicker, etc.) fires a hydration
 *      `setValue(…, { shouldDirty: true })` during its first render.
 *      The user sees "Discard changes?" after just opening the form,
 *      which is wrong. Here we sidestep RHF's dirty flag entirely and
 *      do a deep-compare of `formState.defaultValues` against the live
 *      `useWatch()` snapshot — the form is dirty only when at least one
 *      value actually differs from its default.
 *
 *   2. **SPA navigation interception.** The old
 *      `useUnsavedChangesWarning` only fired the native `beforeunload`
 *      prompt — clicking a sidebar `<Link>` from inside a dirty form
 *      slipped through silently. `useUnsavedChangesGuard` intercepts
 *      `<a href="/…">` clicks, browser back/forward, and detail-tab
 *      switches in addition to `beforeunload`, all routed through the
 *      same dialog state.
 *
 * Usage:
 *
 *   const guard = useFormUnsavedGuard(form);
 *
 *   // Cancel / Back buttons:
 *   <Button onClick={() => guard.attempt(() => navigate(-1))}>Cancel</Button>
 *
 *   // Dialog (drives off the guard's state — DON'T wire it to local
 *   // state any more):
 *   <DiscardChangesAlertDialog
 *     open={guard.dialogOpen}
 *     onConfirm={guard.onConfirmDiscard}
 *     onCancel={() => guard.onDialogOpenChange(false)}
 *   />
 *
 * After a successful save, call `form.reset(values)` as usual — the
 * deep compare immediately reports the form as clean again because the
 * new defaults equal the new values, no second navigation guard fires.
 */
export function useFormUnsavedGuard<T extends FieldValues>(
  form: AnyForm<T>,
  options: {
    /**
     * Extra dirty signal OR-ed into the form's own dirty state. Use for
     * out-of-form state that should also block leaving (staged file
     * uploads, in-page editors, etc.). Defaults to `false`.
     */
    extraDirty?: boolean;
  } = {},
): UnsavedChangesGuard {
  // `useWatch({ control })` re-emits on every field change; subscribing
  // here is the only way to get a live values snapshot that we can
  // compare to defaults each render.
  const liveValues = useWatch({ control: form.control });
  // `formState.defaultValues` reflects the *current* defaults — they
  // change after `form.reset(loadedRow)` on edit-mode hydration, so
  // comparing against them gives accurate "modified since last reset"
  // semantics.
  const defaults = form.formState.defaultValues;

  const isDirty = useMemo(
    () => !deepEqual(defaults, liveValues) || !!options.extraDirty,
    [defaults, liveValues, options.extraDirty],
  );

  return useUnsavedChangesGuard({ isDirty });
}
