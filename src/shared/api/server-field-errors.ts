import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { ApiError } from "./envelope";

/**
 * A server error that names at least one request FIELD — i.e. a 422 whose
 * `errors[]` carry a `field`. These belong INLINE on the matching form input,
 * not in a toast: the point of a validation error is to say *where* to fix it.
 */
export function isFieldValidationError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    Array.isArray(error.errors) &&
    error.errors.some((e) => !!e.field)
  );
}

/**
 * Route each server field error onto its matching form input via React Hook
 * Form's `setError`. The backend `field` is a dotted path that mirrors the
 * request body (`"name"`, `"lines.0.part_variant_id"`), which RHF accepts
 * directly — nested rows included.
 *
 * Returns the field paths that were applied. An empty array means nothing
 * landed (not an ApiError, no field-scoped details, or none matched
 * `knownFields`) — the caller should then fall back to a toast so the failure
 * is never silent. The first applied field is focused by default.
 *
 * Client-side Zod validation stays the first line of defense (§9); this only
 * surfaces rules the server alone can enforce (uniqueness, cross-field,
 * stock/state) and puts them where the user is looking.
 */
export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  options?: { knownFields?: readonly string[]; shouldFocus?: boolean },
): string[] {
  if (!(error instanceof ApiError) || !Array.isArray(error.errors)) return [];
  const applied: string[] = [];
  for (const detail of error.errors) {
    const field = detail.field;
    if (!field) continue;
    // A form may pass the fields it actually renders, so a server field the
    // form has no input for doesn't become an invisible, un-clearable error.
    if (options?.knownFields && !options.knownFields.includes(field)) continue;
    setError(
      field as Path<T>,
      { type: "server", message: detail.message },
      { shouldFocus: (options?.shouldFocus ?? true) && applied.length === 0 },
    );
    applied.push(field);
  }
  return applied;
}
