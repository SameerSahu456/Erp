import { PublicClientApplication, type IPublicClientApplication } from "@azure/msal-browser";

import { AUTH, isMicrosoftSsoConfigured } from "@/shared/constants";
import { MICROSOFT_REDIRECT_PATH } from "@shared/auth/authRedirect";

/**
 * MSAL (Microsoft Authentication Library) single-instance bootstrap for the
 * "Sign in with Microsoft" button.
 *
 * This is the browser/SPA half of the flow: MSAL signs the user in against your
 * single-tenant Entra directory and returns an ID token, which the button then
 * POSTs to the backend (`/auth/sso/microsoft`) for verification + ERP-JWT
 * minting — exactly mirroring the Google flow. No client secret lives here (SPA
 * = public client, Authorization Code + PKCE).
 *
 * MSAL v3+ requires `initialize()` before any interactive call, so we expose a
 * lazily-initialised, memoised getter instead of a bare instance.
 */

/** Scopes requested at sign-in — identity only; we don't call Graph. */
export const MICROSOFT_LOGIN_SCOPES = ["openid", "profile", "email"] as const;

let instance: PublicClientApplication | null = null;
let initPromise: Promise<IPublicClientApplication> | null = null;

/**
 * Return the initialised MSAL instance, creating + initialising it on first
 * call. Throws if Microsoft SSO isn't configured — callers gate on
 * `isMicrosoftSsoConfigured()` before rendering the button, so this is a guard
 * against misconfiguration, not a normal path.
 */
export async function getMsalInstance(): Promise<IPublicClientApplication> {
  if (!isMicrosoftSsoConfigured()) {
    throw new Error("Microsoft SSO is not configured");
  }
  if (instance === null) {
    instance = new PublicClientApplication({
      auth: {
        clientId: AUTH.MICROSOFT_CLIENT_ID,
        // Single-tenant authority — only accounts in your directory can sign in.
        authority: `https://login.microsoftonline.com/${AUTH.MICROSOFT_TENANT_ID}`,
        // Extensionless redirect path (see authRedirect.ts). The popup lands here
        // and MSAL (in the opener) reads the "?code=..." from its URL; `main.tsx`
        // skips booting the app on this path so nothing strips the response.
        // Register this exact URL as an SPA redirect URI in Azure
        // (e.g. https://erp-uat.comprint.co.in/auth-redirect).
        redirectUri: `${window.location.origin}${MICROSOFT_REDIRECT_PATH}`,
      },
      cache: {
        // sessionStorage keeps the MSAL cache tab-scoped; the ERP session token
        // is owned separately by AuthContext (localStorage). We only need MSAL
        // long enough to obtain the ID token.
        cacheLocation: "sessionStorage",
      },
    });
  }
  if (initPromise === null) {
    initPromise = instance.initialize().then(() => instance as PublicClientApplication);
  }
  return initPromise;
}
