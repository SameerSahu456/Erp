import { useState } from "react";
import { useLocation } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import {
  isGoogleSsoConfigured,
  isMicrosoftSsoConfigured,
  isSsoMisconfigured,
} from "@/shared/constants";

import { LOGIN_STRINGS } from "../components/login.strings";

import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { MicrosoftSignInButton } from "../components/MicrosoftSignInButton";
import { PasswordLoginForm } from "../components/PasswordLoginForm";
import { SSO_STATUS_IDLE, type SsoStatus } from "../components/sso.types";

/**
 * Login page. Always renders the email/password form; when a provider is
 * enabled (its `VITE_USE_*_LOGIN` toggle on + its credentials set), an "OR"
 * divider and that provider's sign-in button appear underneath as a second
 * sign-in option.
 */
export function LoginPage() {
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  const googleConfigured = isGoogleSsoConfigured();
  const microsoftConfigured = isMicrosoftSsoConfigured();
  const ssoConfigured = googleConfigured || microsoftConfigured;
  // A provider is toggled on but its credentials are missing.
  const ssoMisconfigured = isSsoMisconfigured();

  // Sign-in status is owned HERE, not per button, so the message renders once
  // below both buttons. `ssoBusy` also disables the other provider mid-flight —
  // two concurrent sign-ins were never meaningful.
  const [ssoStatus, setSsoStatus] = useState<SsoStatus>(SSO_STATUS_IDLE);
  const ssoBusy = ssoStatus.pending !== null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{LOGIN_STRINGS.page.cardTitle}</CardTitle>
          <CardDescription>{LOGIN_STRINGS.page.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Resolved merge: kept the "both methods" layout from dev (PR
              #91 — password form + OR + Google button when configured)
              and adopted feat/typography-component's `<Typography>` wrap
              for the misconfigured-SSO error. */}
          <PasswordLoginForm redirectTo={redirectTo} />

          {ssoConfigured && (
            <>
              {/* OR divider — thin rules either side of a centred label, the
                  standard auth-page pattern for offering an alternative. */}
              <div className="flex items-center gap-3" aria-hidden>
                <div className="h-px flex-1 bg-border" />
                <Typography variant="helper" tone="muted" asChild>
                  <span className="uppercase tracking-[0.12em]">OR</span>
                </Typography>
                <div className="h-px flex-1 bg-border" />
              </div>
              {googleConfigured && (
                <GoogleSignInButton
                  redirectTo={redirectTo}
                  busy={ssoBusy}
                  onStatusChange={setSsoStatus}
                />
              )}
              {microsoftConfigured && (
                <MicrosoftSignInButton
                  redirectTo={redirectTo}
                  busy={ssoBusy}
                  onStatusChange={setSsoStatus}
                />
              )}
              {/* ONE status region for both providers, rendered after both
                  buttons. Previously each button owned its own line, so a
                  Google error appeared between the two buttons and split the
                  pair apart. */}
              {ssoStatus.pending && (
                <Typography tone="muted" role="status" align="center">
                  {ssoStatus.pending}
                </Typography>
              )}
              {ssoStatus.error && (
                <Typography tone="danger" role="alert" align="center">
                  {ssoStatus.error}
                </Typography>
              )}
            </>
          )}

          {ssoMisconfigured && (
            <Typography tone="danger" role="alert">
              {LOGIN_STRINGS.page.ssoMisconfiguredBefore}
              <code>{LOGIN_STRINGS.page.ssoEnvVarClientId}</code>
              {LOGIN_STRINGS.page.ssoMisconfiguredMiddle}
              <code>{LOGIN_STRINGS.page.ssoEnvVarDisable}</code>
              {LOGIN_STRINGS.page.ssoMisconfiguredAfter}
            </Typography>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
