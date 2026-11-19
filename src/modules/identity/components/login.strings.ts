// User-facing copy for the identity › login sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, error/loading text, and aria-labels live here as one
// typed `as const` object instead of being hardcoded ("naked") in JSX.
// Components import this file via a relative path.
export const LOGIN_STRINGS = {
  // LoginPage — Card header chrome.
  page: {
    cardTitle: "Sign in to Comprint ERP",
    cardDescription: "Use your company credentials.",
    // SSO misconfigured warning — text segments and the env-var literals shown
    // inside <code> nodes. Keeping them here so the error message stays in one
    // place even though the env-var names are technical identifiers.
    ssoMisconfiguredBefore: "A sign-in provider is enabled but its credentials are missing. Set ",
    ssoMisconfiguredMiddle:
      " (or the Microsoft equivalents VITE_MICROSOFT_CLIENT_ID + VITE_MICROSOFT_TENANT_ID), or turn the provider off with ",
    ssoMisconfiguredAfter: " to use email/password login.",
    ssoEnvVarClientId: "VITE_GOOGLE_CLIENT_ID",
    ssoEnvVarDisable: "VITE_USE_GOOGLE_LOGIN=false",
  },
  // PasswordLoginForm — field labels, aria-labels, button copy, inline errors.
  passwordForm: {
    emailLabel: "Email",
    passwordLabel: "Password",
    hidePassword: "Hide password",
    showPassword: "Show password",
    submitSigningIn: "Signing in…",
    submitSignIn: "Sign in",
    errorLoginFailed: "Login failed",
    errorBackendUnreachable: "Backend unreachable",
  },
  // GoogleSignInButton — label, status text and error strings.
  googleButton: {
    label: "Sign in with Google",
    signingIn: "Signing you in…",
    errorNoCredential: "Google did not return a credential. Please try again.",
    errorSignInFailed: "Google sign-in failed",
    errorBackendUnreachable: "Backend unreachable",
    errorCancelledOrFailed: "Google sign-in was cancelled or failed.",
  },
  // MicrosoftSignInButton — label, status text and error strings.
  microsoftButton: {
    label: "Sign in with Microsoft",
    signingIn: "Signing you in…",
    errorNoToken: "Microsoft did not return an ID token. Please try again.",
    errorSignInFailed: "Microsoft sign-in failed",
    errorBackendUnreachable: "Backend unreachable",
    errorCancelledOrFailed: "Microsoft sign-in was cancelled or failed.",
  },
} as const
