import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { ApiError } from "@shared/api/envelope";
import { useAuth } from "@shared/auth/use-auth";
import { getMsalInstance, MICROSOFT_LOGIN_SCOPES } from "@shared/auth/msal";

import { LOGIN_STRINGS } from "./login.strings";
import type { SsoButtonProps } from "./sso.types";

/**
 * Official Microsoft logo (four brand squares). This is a brand asset — the
 * same category as the Google widget rendering Google's own colours — so the
 * fixed brand hex values live in the SVG `fill` attributes (not `className`
 * tokens), mirroring the design-system exceptions for logos/brand marks.
 */
function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden focusable="false">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

/**
 * "Sign in with Microsoft" button — shown when Microsoft SSO is enabled.
 *
 * MSAL (SPA flow) signs the user in against your single-tenant Entra directory
 * and returns an ID token; we hand it to the backend (`POST /auth/sso/microsoft`)
 * via the unified `loginWithSso`, which verifies it and issues the ERP access
 * token. Mirrors {@link GoogleSignInButton}, including reporting status and
 * errors up via `onStatusChange` so the page renders them once below BOTH
 * buttons rather than between them.
 */
export function MicrosoftSignInButton({ redirectTo, busy, onStatusChange }: SsoButtonProps) {
  const { loginWithSso } = useAuth();
  const navigate = useNavigate();

  async function handleClick() {
    onStatusChange({ pending: LOGIN_STRINGS.microsoftButton.signingIn, error: null });
    try {
      const msal = await getMsalInstance();
      const result = await msal.loginPopup({ scopes: [...MICROSOFT_LOGIN_SCOPES], prompt: "select_account" });
      if (!result.idToken) {
        onStatusChange({ pending: null, error: LOGIN_STRINGS.microsoftButton.errorNoToken });
        return;
      }
      await loginWithSso("microsoft", result.idToken);
      // Success navigates away, so there is no idle state to restore here.
      navigate(redirectTo, { replace: true });
    } catch (err) {
      // Always log the raw error — the on-screen message is intentionally
      // short, but the console carries the AADSTS code / MSAL detail needed
      // to diagnose redirect-URI mismatches, popup blocks, etc.
      console.error("[MicrosoftSignInButton] sign-in failed:", err);
      onStatusChange({ pending: null, error: resolveErrorMessage(err) });
    }
  }

  return (
    // Wrapper mirrors GoogleSignInButton's exactly so the two buttons share a
    // width and stack with identical spacing.
    <div className="w-full">
      <Button
        type="button"
        variant="outline"
        className="w-full cursor-pointer"
        onClick={handleClick}
        disabled={busy}
      >
        <MicrosoftLogo />
        {LOGIN_STRINGS.microsoftButton.label}
      </Button>
    </div>
  );
}

/**
 * Turn any thrown error into the clearest user-facing message we can:
 *  - a structured backend `ApiError` (e.g. "…not configured", "…not authorised")
 *    → its own message, which is already user-appropriate;
 *  - an MSAL popup error → its `errorMessage` (carries the AADSTS reason such as
 *    a redirect-URI mismatch or blocked popup), so the user isn't misled into
 *    thinking the backend is down;
 *  - a user cancellation → a soft "cancelled" message;
 *  - anything else (genuine network failure) → the generic fallback.
 */
function resolveErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message || LOGIN_STRINGS.microsoftButton.errorSignInFailed;
  }
  if (isUserCancellation(err)) {
    return LOGIN_STRINGS.microsoftButton.errorCancelledOrFailed;
  }
  const msal = err as { errorCode?: string; errorMessage?: string } | null;
  if (msal?.errorMessage) {
    // e.g. "AADSTS50011: The redirect URI … does not match …"
    return `${LOGIN_STRINGS.microsoftButton.errorSignInFailed}: ${msal.errorMessage}`;
  }
  return LOGIN_STRINGS.microsoftButton.errorBackendUnreachable;
}

/**
 * MSAL raises a `BrowserAuthError` with code `user_cancelled` (or closes the
 * popup) when the user backs out — treat that as a soft cancel, not a failure.
 */
function isUserCancellation(err: unknown): boolean {
  const code = (err as { errorCode?: string } | null)?.errorCode;
  return (
    code === "user_cancelled" ||
    code === "popup_window_error" ||
    code === "interaction_in_progress"
  );
}
