import { useCallback, useEffect } from "react";

// Warn the user before they leave a form with unsaved edits.
//
// Coverage:
//   - Tab close / refresh / external URL — browser's native
//     "Reload site? Changes you made may not be saved." dialog via
//     `beforeunload`.
//
// NOT covered:
//   - Browser Back / Forward — intercepting these via a `pushState`
//     sentinel was tried and caused a double-click bug: the in-page
//     Cancel/Back/Discard buttons would call `navigate(-1)` which only
//     popped the sentinel (same URL → no visible change), forcing the
//     user to click twice. Without a data-router migration to
//     `useBlocker`, there's no clean way to prompt on browser back
//     without breaking the in-page flow, so we don't prompt there.
//   - In-app `<Link>` clicks / programmatic `navigate(...)` elsewhere.
//
// For Cancel buttons inside a form and for Dialog close attempts (Esc /
// outside click), use `useDialogDirtyGuard` + `<DiscardChangesAlertDialog>`
// to render the in-app confirm — those entry points are fully under the
// component's control.
//
// Returns `{ bypassOnce }` — kept as a no-op for backwards
// compatibility with the previous sentinel-based design. Callers can
// keep invoking it before programmatic navigation; it does nothing now.
export function useUnsavedChangesWarning(isDirty: boolean) {
  const bypassOnce = useCallback(() => {
    // No-op. Kept for callers that still invoke it before navigate(-1).
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      // Chromium needs both — Safari only honors preventDefault, Firefox
      // only honors returnValue. Setting both covers all engines.
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [isDirty]);

  return { bypassOnce };
}
