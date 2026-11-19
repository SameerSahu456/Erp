// Sentry init sidecar — MUST be the first import in src/main.tsx so the SDK
// instruments everything (fetch, history, errors) before any app code runs.
// https://docs.sentry.io/platforms/javascript/guides/react/
import * as Sentry from "@sentry/react";
import { useEffect } from "react";
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom";

/** Clamp an env-provided sample rate to [0, 1]; anything unparseable → fallback. */
function sampleRate(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback;
}

const dsn = import.meta.env.VITE_SENTRY_DSN;

// No DSN (the .env.example default) → skip init entirely. Every other Sentry
// call in the app (Sentry.logger.*, reactErrorHandler, setUser) is a safe
// no-op without a client, so nothing else needs to be guarded.
if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || "development",
    // Ties events to a deploy (regression detection; required for source-map
    // association once build-time upload lands). Set by CI — e.g. the git SHA.
    // Undefined locally is fine.
    release: import.meta.env.VITE_SENTRY_RELEASE,

    // SDK v10 auto-collection is opt-OUT: with no overrides it ships cookies,
    // request/response headers, query params AND all four HTTP body types.
    // Bodies are the dangerous category in an ERP — a 5xx on POST /auth/login
    // would ship the email+password payload, and any failed create/update
    // ships customer/pricing data. Keep bodies off; headers/query params stay
    // on their defaults, which redact sensitive values (Authorization etc.).
    dataCollection: {
      // Identity is set explicitly via Sentry.setUser() in AuthContext —
      // don't also auto-populate user.* from instrumentation.
      userInfo: false,
      // Never collect request/response bodies (credentials + business data).
      httpBodies: [],
      // Auth is a Bearer header, not cookies — nothing useful to collect.
      cookies: false,
    },

    integrations: [
      // Page-load + route-change transactions named by React Router route
      // (e.g. "/crm/leads"), plus outgoing-fetch spans. Works with v6+ — the
      // versioned reactRouterV7BrowserTracingIntegration is deprecated in SDK 10.
      Sentry.reactRouterBrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      // Failed API calls become Sentry error events even when app code catches
      // them (hooks fetch/XHR below TanStack Query's error handling). 401/403
      // are deliberately excluded — permission-denied is normal app flow here.
      Sentry.httpClientIntegration({
        failedRequestStatusCodes: [404, [500, 599]],
      }),
    ],

    // Tracing volume is env-tunable so UAT/production can dial it without a
    // code change. Default 1.0 while we validate; set
    // VITE_SENTRY_TRACES_SAMPLE_RATE=0.1–0.2 for production volume.
    tracesSampleRate: sampleRate(
      import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE,
      1.0,
    ),

    // tracePropagationTargets is DELIBERATELY not set. The API lives on a
    // different origin in UAT/prod (e.g. erp-uat-api.comprint.co.in); adding
    // it here would attach sentry-trace/baggage headers to API requests, and
    // until the backend's CORS allowlists those headers every request would
    // fail preflight. Enable only together with a backend CORS change.

    // Structured logs via Sentry.logger.* (Explore → Logs in the Sentry UI).
    enableLogs: true,

    // Mirror EVERY captured error event into Sentry Logs, so the Logs stream
    // shows JS crashes, render crashes, and failed API calls alongside app
    // logs. (Logs don't pass through beforeSend, so this cannot recurse.)
    beforeSend(event) {
      const ex = event.exception?.values?.[0];

      // Failed-API events (httpClientIntegration) carry the failing request on
      // event.request, but their title is a generic "HTTP Client Error with
      // status code: NNN". Put the method + endpoint path into the message so
      // the Issue title and the log both say WHICH API broke — and each
      // endpoint groups as its own Issue.
      const isHttpError = ex?.value?.startsWith("HTTP Client Error");
      if (isHttpError && ex && event.request?.url) {
        try {
          const path = new URL(event.request.url).pathname;
          ex.value = `${ex.value} — ${event.request.method ?? "GET"} ${path}`;
        } catch {
          /* leave the generic message if the URL is unparseable */
        }
      }

      const message = ex
        ? `${ex.type ?? "Error"}: ${ex.value ?? "unknown"}`
        : (event.message ?? "Unknown error");
      Sentry.logger.error(message, {
        "error.type": ex?.type ?? "message",
        page: window.location.pathname,
        // For API failures this is the failing endpoint; for crashes, the page.
        "http.url": event.request?.url ?? "",
        "http.method": event.request?.method ?? "",
        "http.status": isHttpError ? (ex?.value?.match(/\d{3}/)?.[0] ?? "") : "",
        event_id: event.event_id ?? "",
      });
      return event;
    },
  });
} else if (import.meta.env.DEV) {
  console.info("[sentry] VITE_SENTRY_DSN not set — Sentry disabled.");
}
