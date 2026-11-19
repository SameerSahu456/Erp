import "./instrument"; // Sentry — MUST stay the first import (see src/instrument.ts)

import { reactErrorHandler } from "@sentry/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import { MICROSOFT_REDIRECT_PATH } from "./shared/auth/authRedirect";
import "./styles/index.css";

// ─── crypto.randomUUID polyfill (non-secure contexts) ──────────────────
// `crypto.randomUUID()` is only defined in a *secure context* — HTTPS or
// localhost. When the app is served over plain HTTP on a LAN IP
// (e.g. http://192.168.1.83:5173 for cross-machine testing), it's missing
// and every `crypto.randomUUID()` call throws "not a function".
// `crypto.getRandomValues` IS available in non-secure contexts, so we build
// a spec-compliant v4 UUID from it. No-op when the native API exists.
;(() => {
  const c = globalThis.crypto as Crypto | undefined
  if (c && typeof c.randomUUID !== "function" && typeof c.getRandomValues === "function") {
    ;(c as { randomUUID: () => string }).randomUUID = () => {
      const b = c.getRandomValues(new Uint8Array(16))
      b[6] = (b[6] & 0x0f) | 0x40 // version 4
      b[8] = (b[8] & 0x3f) | 0x80 // variant 10xx
      const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"))
      return (
        h.slice(0, 4).join("") +
        "-" +
        h.slice(4, 6).join("") +
        "-" +
        h.slice(6, 8).join("") +
        "-" +
        h.slice(8, 10).join("") +
        "-" +
        h.slice(10, 16).join("")
      )
    }
  }
})()

// ─── Stale-deployment chunk-load handler ───────────────────────────────
// Vite generates chunk filenames with content hashes (e.g. `Page-aBcDef.js`).
// When a new build is deployed, old chunks are removed from the server.
// If the user had the app open in the background and navigates (via sidebar),
// the browser tries to load a stale chunk URL, the server returns `index.html`
// (SPA fallback), and the dynamic import fails with a MIME-type error.
// This handler detects that case and auto-reloads so the user gets the
// latest deployment without manually refreshing.
//
// We register the handler *before* React renders so it's active from the
// very first chunk-load attempt.
;(() => {
  /** How long (ms) to wait before reloading. Gives the browser a moment to
   *  settle and avoids reload loops if multiple chunks fail simultaneously. */
  const RELOAD_DELAY = 300
  let reloading = false

  // Catches the `error` event fired on <script type="module"> elements when
  // the server returns something other than valid JS (e.g. index.html for a
  // stale chunk URL).
  window.addEventListener(
    "error",
    (event) => {
      if (reloading) return

      const target = event.target as HTMLElement | null
      if (
        target?.tagName === "SCRIPT" &&
        target.getAttribute("type") === "module" &&
        /\/assets\/[\w-]+\.[a-zA-Z0-9]{8}\.(?:js|js\.map)/.test(target.getAttribute("src") ?? "")
      ) {
        reloading = true
        console.warn(
          "[ChunkLoad] Stale deployment chunk detected, reloading...",
          target.getAttribute("src"),
        )
        setTimeout(() => window.location.reload(), RELOAD_DELAY)
      }
    },
    // Use capture phase so we see the event before it potentially gets
    // stopped by React's synthetic-event system.
    { capture: true },
  )

  // Fallback: catch unhandled promise rejections from dynamic import().
  // This catches cases where the error propagates via Promise instead of
  // the script-element error event.
  window.addEventListener("unhandledrejection", (event) => {
    if (reloading) return

    const msg =
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason ?? "")

    if (msg.includes("Failed to fetch dynamically imported module")) {
      reloading = true
      console.warn("[ChunkLoad] Stale chunk (promise rejection), reloading...")
      setTimeout(() => window.location.reload(), RELOAD_DELAY)
    }
  })
})()

// ─── MSAL popup redirect landing — do NOT boot the app ──────────────────
// The Microsoft sign-in popup is redirected to MICROSOFT_REDIRECT_PATH with the
// auth response ("?code=...") in the URL. MSAL running in the opener window
// polls this popup's URL to read that response, then closes it. If we mounted
// the React app here, the router would rewrite the URL and drop the code,
// causing BrowserAuthError "hash_empty_error". So on this path we render a
// minimal inert page and stop — no router, no navigation.
//
// Sentry still initialises on this path: `./instrument` is imported at the top
// of this file, before the branch, so a failure inside the popup handoff is
// still reported.
if (window.location.pathname === MICROSOFT_REDIRECT_PATH) {
  const root = document.getElementById("root");
  if (root) root.textContent = "Completing sign-in…";
} else {
  // ─── React render ──────────────────────────────────────────────────────
  // React 19 error-handling pattern: reactErrorHandler reports render errors
  // to Sentry from all three channels — uncaught, caught by an ErrorBoundary
  // (onCaughtError), and recoverable (hydration/retry) — so class boundaries
  // like shared/errors/ErrorBoundary.tsx don't need their own captureException.
  createRoot(document.getElementById("root")!, {
    onUncaughtError: reactErrorHandler(),
    onCaughtError: reactErrorHandler(),
    onRecoverableError: reactErrorHandler(),
  }).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
