import { describeFieldError } from "./describe-field-error";
import { friendlyApiMessage } from "./error-messages";

export interface ErrorDetail {
  code: string;
  message: string;
  field?: string | null;
}

export interface Envelope<T> {
  success: boolean;
  code: string;
  message: string;
  data: T | null;
  errors: ErrorDetail[] | null;
}

// Canonical wording for a permission-denied (403) failure — kept here so EVERY
// `error.message` render site shows the same standard sentence without any
// per-callsite wiring.
export const PERMISSION_DENIED_MESSAGE =
  "You don't have permission to perform this action";

// Pull the required permission code(s) the backend named on a 403. The gate
// (`require_permission`) returns them as `errors.required_permissions` (a
// free-form dict) or, defensively, under the failure `data`. Returns [] when
// the backend didn't include them.
function readRequiredPermissions(
  errors: ErrorDetail[] | Record<string, unknown> | null,
  failureData: unknown,
): string[] {
  const fromErrors = (errors as Record<string, unknown> | null)
    ?.required_permissions;
  const fromData = (failureData as Record<string, unknown> | null)
    ?.required_permissions;
  const raw = Array.isArray(fromErrors)
    ? fromErrors
    : Array.isArray(fromData)
      ? fromData
      : [];
  return raw.filter((c): c is string => typeof c === "string");
}

/**
 * Standard 403 message. Names the missing permission(s) when the backend
 * supplied them (or when a caller passes a known bundle), otherwise the bare
 * sentence. Centralised so the interceptor bakes it into `error.message` and
 * every render site is consistent for free.
 */
export function buildForbiddenMessage(
  errors: ErrorDetail[] | Record<string, unknown> | null,
  failureData: unknown = null,
  knownRequired?: readonly string[],
): string {
  const named = readRequiredPermissions(errors, failureData);
  const codes = named.length > 0 ? named : (knownRequired ?? []);
  return codes.length > 0
    ? `${PERMISSION_DENIED_MESSAGE}. Missing permission: ${codes.join(" or ")}`
    : `${PERMISSION_DENIED_MESSAGE}.`;
}

// Shape the user-facing message from the structured errors array. When the
// backend supplies one, it's almost always more actionable than the generic
// envelope `message` ("Validation failed"). Show only the first entry — per
// product call, multiple errors get squashed to the top one. A 403 is special-
// cased to the standard permission-denied sentence (+ the missing code).
function formatPrimaryError(
  statusCode: number,
  envMessage: string,
  errors: ErrorDetail[] | null,
  failureData: unknown,
  businessCode: string,
): string {
  if (statusCode === 403) return buildForbiddenMessage(errors, failureData);
  // A curated friendly override for specific business codes (generic 500 /
  // constraint failures, etc.). Only codes in the catalog are touched; every
  // other message falls through to the backend's own (already id-scrubbed)
  // wording. See error-messages.ts for why this stays small.
  const friendly = friendlyApiMessage(businessCode);
  if (friendly) return friendly;
  const first = Array.isArray(errors) ? errors[0] : undefined;
  if (!first) return envMessage;
  return describeFieldError(first);
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly businessCode: string;
  readonly envMessage: string;
  readonly errors: ErrorDetail[] | null;
  // Some failure responses carry a structured payload in `data` (e.g.,
  // 409 CONTACT_EMAIL_EXISTS returns {existing_contact_id, existing_contact_name}
  // so the FE can deep-link to the duplicate). Preserve it here so callers
  // can pull deep-link details out without a follow-up API hit.
  readonly failureData: unknown;

  constructor(
    statusCode: number,
    envMessage: string,
    errors: ErrorDetail[] | null,
    businessCode = "",
    failureData: unknown = null,
  ) {
    // `Error.message` (i.e. what `e instanceof Error ? e.message : ...` reads)
    // is the surface most catch sites display. Bake in the first error so
    // generic toasts get the actionable text without per-callsite wiring. A
    // 403 becomes the standard permission-denied sentence here, so every render
    // site that shows `error.message` is consistent with no extra wiring.
    super(formatPrimaryError(statusCode, envMessage, errors, failureData, businessCode));
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.businessCode = businessCode;
    this.envMessage = envMessage;
    this.errors = errors;
    this.failureData = failureData;
  }

  hasErrorCode(code: string): boolean {
    return this.errors?.some((e) => e.code === code) ?? false;
  }

  errorForField(field: string): ErrorDetail | undefined {
    return this.errors?.find((e) => e.field === field);
  }

  /** First entry of `errors`, or undefined when the backend didn't supply any. */
  get firstError(): ErrorDetail | undefined {
    return this.errors?.[0];
  }
}

/**
 * True when `error` is a 403 permission denial. Use this to branch a load
 * failure into a friendly "no access" view (a permission boundary the user
 * hit) instead of a red "something broke" error box.
 */
export function isForbidden(error: unknown): error is ApiError {
  return error instanceof ApiError && error.statusCode === 403;
}

/** True on a 404. Network / 5xx errors don't mean the record is missing. */
export function isNotFound(error: unknown): error is ApiError {
  return error instanceof ApiError && error.statusCode === 404;
}

/**
 * True when `error` is a 422 request-validation rejection — the params we sent
 * were not acceptable, as opposed to the request being denied (403) or the
 * server failing (5xx).
 *
 * Use it to branch on WHOSE problem it is. A 422 is almost always a bad SLICE
 * (a malformed filter or date window applied to the whole screen), so it wants
 * ONE page-level explanation, not the same message repeated by every widget
 * that shares those params. It also means the backend's validator text
 * ("end must be greater than or equal to start") is about to reach a user, so
 * the render site should substitute its own copy.
 */
export function isValidationError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.statusCode === 422;
}

export function unwrap<T>(env: Envelope<T>): T {
  if (!env.success || env.data == null) {
    throw new ApiError(0, env.message, env.errors, env.code);
  }
  return env.data;
}
