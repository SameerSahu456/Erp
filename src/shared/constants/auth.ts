/**
 * Auth / SSO feature flags, sourced from Vite env vars.
 *
 * Each provider has its own toggle (`VITE_USE_GOOGLE_LOGIN`,
 * `VITE_USE_MICROSOFT_LOGIN`) and its own credentials. A provider's button
 * renders only when its toggle AND its credentials are set — so you can enable
 * Google, Microsoft, both, or neither independently. Email/password login is
 * always available.
 */

/** Parse a Vite env string as a boolean — only "true" / "1" count as true. */
function envFlag(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

export const AUTH = {
  /** Per-provider toggle for Google. */
  USE_GOOGLE_LOGIN: envFlag(import.meta.env.VITE_USE_GOOGLE_LOGIN),
  /** Per-provider toggle for Microsoft. */
  USE_MICROSOFT_LOGIN: envFlag(import.meta.env.VITE_USE_MICROSOFT_LOGIN),
  /** Google OAuth 2.0 Web client id — required to show the Google button. */
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "",
  /** Microsoft/Entra app-registration (SPA) client id — required for the MS button. */
  MICROSOFT_CLIENT_ID: import.meta.env.VITE_MICROSOFT_CLIENT_ID ?? "",
  /** Microsoft/Entra single-tenant directory id — pins sign-in to your org. */
  MICROSOFT_TENANT_ID: import.meta.env.VITE_MICROSOFT_TENANT_ID ?? "",
} as const;

/** Google is offered when its toggle is on and its client id is set. */
export function isGoogleSsoConfigured(): boolean {
  return AUTH.USE_GOOGLE_LOGIN && !!AUTH.GOOGLE_CLIENT_ID;
}

/** Microsoft is offered when its toggle is on and client + tenant ids are set. */
export function isMicrosoftSsoConfigured(): boolean {
  return AUTH.USE_MICROSOFT_LOGIN && !!AUTH.MICROSOFT_CLIENT_ID && !!AUTH.MICROSOFT_TENANT_ID;
}

/**
 * True when a provider is toggled ON but its credentials are missing — a
 * misconfiguration worth surfacing on the login page so it isn't silently
 * dropped.
 */
export function isSsoMisconfigured(): boolean {
  const googleBroken = AUTH.USE_GOOGLE_LOGIN && !AUTH.GOOGLE_CLIENT_ID;
  const microsoftBroken =
    AUTH.USE_MICROSOFT_LOGIN && !(AUTH.MICROSOFT_CLIENT_ID && AUTH.MICROSOFT_TENANT_ID);
  return googleBroken || microsoftBroken;
}
