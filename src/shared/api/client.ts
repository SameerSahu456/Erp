import * as Sentry from "@sentry/react";
import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import { API } from "@shared/constants";
import { ApiError, type Envelope } from "./envelope";

// ─── Sentry reporting for EVERY failed API call ──────────────────────────────
// httpClientIntegration (instrument.ts) only sees requests that complete with
// a status code — CORS/offline/timeout failures (status 0) and app-handled
// errors are invisible to it. This interceptor-level hook logs every failure
// to Sentry Logs with searchable attributes, and raises network errors
// (no response at all) as real Sentry Issues too.
function reportApiFailure(opts: {
  method?: string;
  url?: string;
  status: number;
  message: string;
  code?: string;
}): void {
  const method = (opts.method ?? "GET").toUpperCase();
  const url = opts.url ?? "";
  const kind = opts.status === 0 ? "network-error" : String(opts.status);
  const attrs = {
    "http.method": method,
    "http.url": url,
    "http.status": opts.status,
    "api.code": opts.code ?? "",
    page: window.location.pathname,
  };
  const label = `API ${kind} — ${method} ${url}: ${opts.message}`;
  if (opts.status === 0 || opts.status >= 500) {
    Sentry.logger.error(label, attrs);
  } else {
    // 4xx (incl. 401/403/404/422) — warn level so real failures stay loud.
    Sentry.logger.warn(label, attrs);
  }
}

/** Resolve the request's full URL — don't prepend baseURL onto an already
 *  absolute url (axios ignores baseURL for those). */
function fullUrlOf(config?: { baseURL?: string; url?: string }): string {
  const raw = config?.url ?? "";
  return /^https?:\/\//.test(raw) ? raw : (config?.baseURL ?? "") + raw;
}

/** Path-only version for Issue titles, so each endpoint groups as one Issue
 *  regardless of host/query. */
function pathOf(url: string): string {
  try {
    return new URL(url, window.location.origin).pathname;
  } catch {
    return url;
  }
}

// ─── No-response failures — classify WHO is at fault before reporting ────────
// `!err.response` covers wildly different situations. Name each one so the
// Sentry entry says whether it's a frontend condition or a server problem:
//   ERR_CANCELED   → frontend aborted (TanStack Query cancels on unmount /
//                    refetch / route change). Normal — debug log, no Issue.
//   ECONNABORTED   → the configured timeout (API.TIMEOUT_MS) fired: backend
//                    reachable but too slow,
//                    or the network path stalled. Error log + Issue.
//   navigator.onLine === false → the USER's device is offline. Frontend-side
//                    condition — warn log, no Issue (not a backend fault).
//   anything else  → browser online but no response: server down, DNS failure,
//                    connection refused, or CORS-blocked (the browser cannot
//                    distinguish CORS from server-down). Error log + Issue.
function reportNoResponseFailure(method: string, url: string, err: AxiosError): void {
  const attrs = {
    "http.method": method,
    "http.url": url,
    "axios.code": err.code ?? "",
    "axios.message": err.message,
    page: window.location.pathname,
  };

  if (err.code === "ERR_CANCELED") {
    Sentry.logger.debug(`API canceled by frontend (abort/unmount) — ${method} ${url}`, attrs);
    return;
  }
  if (err.code === "ECONNABORTED") {
    const secs = (err.config?.timeout ?? 0) / 1000 || "?";
    Sentry.logger.error(`API timeout after ${secs}s (backend slow or stalled) — ${method} ${url}`, attrs);
    Sentry.captureException(
      new Error(`API timeout (backend slow or stalled) — ${method} ${pathOf(url)}`),
      { extra: attrs },
    );
    return;
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    Sentry.logger.warn(`API failed: user device offline (frontend network) — ${method} ${url}`, attrs);
    return;
  }
  Sentry.logger.error(`API unreachable: server down or CORS-blocked — ${method} ${url}`, attrs);
  Sentry.captureException(
    new Error(`API unreachable (server down or CORS) — ${method} ${pathOf(url)}`),
    { extra: attrs },
  );
}

// ─── Single axios instance ────────────────────────────────────────────────────
// Empty / unset → relative base, so requests go to the current origin and the
// Vite dev proxy (vite.config.ts → server.proxy['/api']) forwards them to the
// backend. This keeps the app working from any LAN client without baking the
// host's IP into the bundle. Prod sets VITE_API_BASE_URL to the absolute API.
const API_URL = import.meta.env.VITE_API_BASE_URL;
export const http = axios.create({
  // Strip any trailing slash so a misconfigured VITE_API_BASE_URL ending in
  // "/" can't produce a double-slash request path (".../"+"/api/v1/..." →
  // "...//api/v1/..."). The app must be immune to the env's trailing slash.
  baseURL: (API_URL || "").replace(/\/+$/, ""),
  timeout: API.TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
    // Without an explicit Accept header, browsers send `text/html,*/*` —
    // the Vite dev proxy then falls through to the SPA fallback on GETs
    // that nominally match `/api`, returning index.html. Axios receives
    // HTML, the envelope check fails silently, and every list page
    // renders empty. Forcing JSON keeps the dev proxy honest and is a
    // no-op in prod.
    Accept: "application/json",
  },
  // FastAPI parses repeated query keys (`?role_names=a&role_names=b`) as a
  // list[str]. Axios's default array serializer emits `role_names[]=...` which
  // FastAPI does NOT recognize. `indexes: null` switches axios to repeated-key
  // form so multi-value query filters reach the backend intact.
  paramsSerializer: { indexes: null },
});

// ─── Token storage ────────────────────────────────────────────────────────────

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

// ─── Request interceptor — inject Bearer token ───────────────────────────────

http.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ─── Response interceptor — unwrap envelope, handle auth errors ───────────────

http.interceptors.response.use(
  (response) => {
    const data = response.data as unknown;
    if (isEnvelope(data)) {
      // `success: false` is a real error. `data: null` is NOT — DELETE
      // and other no-content endpoints legitimately return ApiResponse[None].
      // Treating null-data as an error broke delete/reset flows because
      // mutation `onSuccess` never fired, leaving the cache stale.
      if (!data.success) {
        // HTTP 2xx but business failure (success: false envelope).
        reportApiFailure({
          method: response.config.method,
          url: fullUrlOf(response.config),
          status: response.status,
          message: data.message,
          code: String(data.code),
        });
        return Promise.reject(
          new ApiError(response.status, data.message, data.errors, String(data.code), data.data),
        );
      }
      return { ...response, data: data.data };
    }
    return response;
  },
  async (err: AxiosError<Envelope<unknown>>) => {
    // Blob requests get their error body as a Blob; decode it so the message survives.
    await decodeBlobErrorBody(err);
    const status = err.response?.status;
    const env = err.response?.data;
    const fullUrl = fullUrlOf(err.config);
    const method = (err.config?.method ?? "GET").toUpperCase();

    if (err.response) {
      // Backend responded with an error status (4xx / 5xx) — a real API
      // failure with the backend's own message attached.
      reportApiFailure({
        method,
        url: fullUrl,
        status: status ?? 0,
        message:
          env && isEnvelope(env) ? env.message : (err.message || "request failed"),
        code: env && isEnvelope(env) ? String(env.code) : err.code,
      });
    } else {
      // No response at all — classify (canceled / timeout / offline /
      // unreachable) so the report names the actual cause, not a generic
      // "network error".
      reportNoResponseFailure(method, fullUrl, err);
    }

    // 401 on a login endpoint (password, Google, or unified /auth/sso/{provider})
    // is "bad credentials / not authorised" — surface it in-form. Redirecting
    // would reload /login and hide the error message. Only redirect when an
    // authenticated session expires mid-app.
    const reqUrl = err.config?.url ?? "";
    const isLoginRequest =
      reqUrl.endsWith("/auth/login") ||
      reqUrl.endsWith("/auth/google") ||
      reqUrl.includes("/auth/sso/");

    if (status === 401 && !isLoginRequest) {
      setAccessToken(null);
      localStorage.removeItem("erp_access_token");
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
    }

    if (env && isEnvelope(env)) {
      return Promise.reject(
        new ApiError(status ?? 0, env.message, env.errors, String(env.code), env.data),
      );
    }
    if (!err.response) {
      return Promise.reject(
        new ApiError(0, "Network error — check your connection", null),
      );
    }

    return Promise.reject(
      new ApiError(status ?? 0, err.message, null),
    );
  },
);

// ─── Typed convenience wrapper ─────────────────────────────────────────────────
// Mirrors the old `apiClient` shape so all existing call-sites stay unchanged.

export interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  params?: Record<string, unknown>;
  /** Overrides `API.TIMEOUT_MS` for a request known to run long. */
  timeoutMs?: number;
}

async function req<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const config: AxiosRequestConfig = {
    method,
    url: path,
    headers: options.headers,
    signal: options.signal,
    params: options.params,
  };
  if (options.timeoutMs !== undefined) config.timeout = options.timeoutMs;
  if (body !== undefined) config.data = body;
  const response = await http.request<T>(config);
  return response.data;
}

/** A binary response plus the headers that describe it. */
export interface BlobResponse {
  blob: Blob;
  headers: Record<string, string>;
}

/**
 * POST returning a binary body — currently the label PDFs.
 *
 * Why this lives here and not in a module: §6.1, every call goes through the
 * shared client. And why the caller cannot just `window.open()` the URL — the
 * auth token is an Authorization HEADER, not a cookie, so a bare navigation
 * arrives unauthenticated and renders a 401. The blob has to be fetched
 * through this instance, which carries the interceptor.
 *
 * Headers come back with the blob because the label endpoints report how many
 * devices they SKIPPED (already-labelled) in `x-labels-skipped`. A silent skip
 * is the failure the guard exists to prevent, so the count has to reach the UI.
 */
async function reqBlob(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<BlobResponse> {
  const response = await http.request<Blob>({
    method,
    url: path,
    headers: options.headers,
    signal: options.signal,
    params: options.params,
    data: body,
    responseType: "blob",
  });
  return { blob: response.data, headers: flattenHeaders(response.headers) };
}

/** Axios headers → a plain string map (multi-value headers joined). */
function flattenHeaders(headers: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof headers !== "object" || headers === null) return out;
  for (const [key, value] of Object.entries(headers)) {
    if (value == null) continue;
    out[key.toLowerCase()] = Array.isArray(value) ? value.join(", ") : String(value);
  }
  return out;
}

/** Parse a Blob error body into its JSON envelope, in place; non-JSON is left alone. */
async function decodeBlobErrorBody(err: AxiosError): Promise<void> {
  const data: unknown = err.response?.data;
  if (!(data instanceof Blob) || !err.response) return;
  try {
    (err.response as { data: unknown }).data = JSON.parse(await data.text());
  } catch {
    /* not JSON — keep the blob; the generic status message applies */
  }
}

/** Drop empty query params so `key=` never fails a backend check. Arrays become repeated keys. */
export function compactParams(params: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out;
}

export const apiClient = {
  get:    <T,>(path: string, options?: RequestOptions) =>
    req<T>("GET", path, undefined, options),
  post:   <T,>(path: string, body?: unknown, options?: RequestOptions) =>
    req<T>("POST", path, body, options),
  patch:  <T,>(path: string, body?: unknown, options?: RequestOptions) =>
    req<T>("PATCH", path, body, options),
  put:    <T,>(path: string, body?: unknown, options?: RequestOptions) =>
    req<T>("PUT", path, body, options),
  // `body` is optional — some DELETE endpoints carry a payload (e.g. a
  // mandatory `reason` on soft-deletes). Existing `delete(path)` calls are
  // unaffected (body defaults to undefined, same as before).
  delete: <T,>(path: string, body?: unknown, options?: RequestOptions) =>
    req<T>("DELETE", path, body, options),
  postBlob: (path: string, body?: unknown, options?: RequestOptions) =>
    reqBlob("POST", path, body, options),
  // GET returning a binary body — the rentals invoice export. Same reason
  // as `postBlob`: the token is an Authorization header, so a plain
  // `window.open()` of the URL would arrive unauthenticated and 401.
  getBlob: (path: string, options?: RequestOptions) =>
    reqBlob("GET", path, undefined, options),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isEnvelope(value: unknown): value is Envelope<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    "code" in value &&
    "data" in value
  );
}
