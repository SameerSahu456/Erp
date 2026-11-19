import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { BrowserRouter } from "react-router-dom";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "@/components/ui/sonner";
import { API, AUTH, isGoogleSsoConfigured } from "@/shared/constants";

import { AuthProvider } from "@shared/auth/AuthContext";
import { FeatureFlagsProvider } from "@shared/features";

/**
 * Wraps the tree in Google's OAuth context only when Google SSO is fully
 * enabled (master switch + Google toggle + client id). When it's off the
 * provider is skipped entirely, so an email/password or Microsoft-only build
 * never loads Google's script.
 */
function MaybeGoogleProvider({ children }: { children: ReactNode }) {
  if (isGoogleSsoConfigured()) {
    return <GoogleOAuthProvider clientId={AUTH.GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>;
  }
  return <>{children}</>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            ...API.QUERY_DEFAULTS,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <MaybeGoogleProvider>
              <FeatureFlagsProvider>{children}</FeatureFlagsProvider>
              <Toaster />
            </MaybeGoogleProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
