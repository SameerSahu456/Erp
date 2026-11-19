/**
 * Path the Microsoft sign-in popup is redirected to after authentication.
 *
 * Must match the SPA redirect URI registered in Azure (the app origin + this
 * path, e.g. https://erp-uat.comprint.co.in/auth-redirect).
 *
 * Deliberately EXTENSIONLESS (no ".html"): some servers 301-redirect
 * "/foo.html" → "/foo" and drop the query string on that redirect, which would
 * strip MSAL's "?code=..." response and cause `hash_empty_error`. An
 * extensionless path is served directly (SPA fallback → index.html) with the
 * query intact.
 *
 * `main.tsx` checks this path on boot and, when matched, does NOT mount the
 * React app — the popup only needs to hold the "?code=..." in its URL long
 * enough for MSAL in the opener window to read it. Booting the router would
 * rewrite the URL and drop the code.
 */
export const MICROSOFT_REDIRECT_PATH = "/auth-redirect";
