import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { ApiError } from "@shared/api/envelope";
import { useAuth } from "@shared/auth/use-auth";

import { LOGIN_STRINGS } from "./login.strings";
import type { SsoButtonProps } from "./sso.types";

/**
 * Official Google "G" mark. Brand asset — the fixed brand hex values live in
 * the SVG `fill` attributes (not `className` tokens), the same documented
 * design-system exception {@link MicrosoftSignInButton}'s logo uses.
 */
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

/**
 * "Sign in with Google" button — shown when Google SSO is enabled.
 *
 * Google returns a signed ID token (`credential`); we hand it to the backend
 * (`POST /auth/sso/google`), which verifies it and issues the ERP access token.
 *
 * ## Why the button is rendered twice
 *
 * Google Identity Services will only mint an ID token from ITS OWN rendered
 * widget, and that widget can't be restyled — it ships Google's Roboto face, a
 * fixed 40px height, its own corner radius, and a hard 400px width cap. Sitting
 * next to {@link MicrosoftSignInButton} (our `<Button>`: 36px, 13px/550,
 * `rounded-[7px]`, full 412px content width) the two looked like controls from
 * two different apps.
 *
 * So we render OUR `<Button>` for the user to see, and lay the real GIS widget
 * over it at `opacity-0` to take the click. Identical component, size,
 * typography and width to the Microsoft button, with the ID-token flow intact —
 * no backend change, unlike switching to `useGoogleLogin` (which yields an
 * access token, not the ID token the backend verifies).
 *
 * The overlay is stretched to fill by CSS rather than by measuring: it is
 * invisible, so distorting it costs nothing visually and buys an exact hit area
 * even past GIS's 400px cap. Doing it in CSS (not inline styles) means it
 * survives GIS re-rendering its own subtree.
 *
 * Status and errors are reported up via `onStatusChange` — the page renders
 * them once below BOTH buttons. See {@link SsoStatus}.
 */
export function GoogleSignInButton({ redirectTo, busy, onStatusChange }: SsoButtonProps) {
  const { loginWithSso } = useAuth();
  const navigate = useNavigate();

  async function handleSuccess(response: CredentialResponse) {
    if (!response.credential) {
      onStatusChange({ pending: null, error: LOGIN_STRINGS.googleButton.errorNoCredential });
      return;
    }
    onStatusChange({ pending: LOGIN_STRINGS.googleButton.signingIn, error: null });
    try {
      await loginWithSso("google", response.credential);
      // Success navigates away, so there is no idle state to restore here.
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message || LOGIN_STRINGS.googleButton.errorSignInFailed
          : LOGIN_STRINGS.googleButton.errorBackendUnreachable;
      onStatusChange({ pending: null, error: message });
    }
  }

  return (
    <div className="relative w-full">
      {/* Presentation only — the GIS overlay below owns the click and the
          accessible name, so this is hidden from assistive tech and taken
          out of the tab order to avoid announcing the control twice. */}
      <Button
        type="button"
        variant="outline"
        className="w-full cursor-pointer"
        disabled={busy}
        tabIndex={-1}
        aria-hidden
      >
        <GoogleLogo />
        {LOGIN_STRINGS.googleButton.label}
      </Button>
      {/* The real widget: invisible, exactly covering the button above.
          `opacity-0` (not `hidden`/`display:none`) keeps it rendered,
          hit-testable and reachable by screen readers. */}
      <div
        className={`absolute inset-0 overflow-hidden opacity-0 [&_iframe]:!h-full [&_iframe]:!w-full [&>div]:!h-full [&>div]:!w-full ${
          busy ? "pointer-events-none" : ""
        }`}
      >
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() =>
            onStatusChange({
              pending: null,
              error: LOGIN_STRINGS.googleButton.errorCancelledOrFailed,
            })
          }
          size="large"
          text="signin_with"
          shape="rectangular"
          logo_alignment="center"
          width="400"
        />
      </div>
    </div>
  );
}
