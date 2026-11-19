import * as Sentry from "@sentry/react";
import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { apiClient, setAccessToken } from "@shared/api/client";
import { endpoints } from "@shared/api/endpoints";

/** SSO providers the backend accepts at `POST /auth/sso/{provider}`. */
export type SsoProvider = "google" | "microsoft";

export interface CurrentUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  // Profile fields — all returned by GET /auth/me (UserMeResponse). Nullable
  // because the backend columns are optional. Surfaced read-only on the
  // Profile tab until a self-service update endpoint exists.
  phone: string | null;
  employee_id: string | null;
  department: string | null;
  designation: string | null;
  location: string | null;
  branch: string | null;
  last_login_at: string | null;
  roles: string[];
  permissions: string[];
  is_active: boolean;
  is_superuser: boolean;
  // 2026-05-25: effective channel-tag scope. `null` = unrestricted (any role
  // with empty channel_tags, or superuser). Used by CRM forms to validate
  // picked users against the selected channel type.
  channel_tags: string[] | null;
  // 2026-10-27: effective record scope across the user's roles. `sales_team`
  // = requests (MI, dispatch, returns, replacements) on the sales orders the
  // user can see only — the warehouse menu is hidden for them. Optional: a
  // session cached before this field existed reads as `all`.
  data_scope?: "all" | "rental_orders" | "sales_team";
}

export function fullName(user: Pick<CurrentUser, "first_name" | "last_name" | "email">): string {
  const parts = [user.first_name, user.last_name].filter(Boolean) as string[];
  return parts.length ? parts.join(" ") : user.email;
}

export interface AuthContextValue {
  user: CurrentUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** Unified SSO login for any provider ("google" | "microsoft"); posts the
   *  provider ID token to `/auth/sso/{provider}` and establishes the session. */
  loginWithSso: (provider: SsoProvider, idToken: string) => Promise<void>;
  /** @deprecated Thin wrapper over `loginWithSso("google", …)`, kept for callers. */
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => void;
  /** Re-fetch /auth/me so role/permission edits land without a logout+login. */
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "erp_access_token";
const USER_KEY = "erp_user";

function loadStoredSession(): { token: string | null; user: CurrentUser | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(USER_KEY);
    const user = raw ? (JSON.parse(raw) as CurrentUser) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = loadStoredSession();

  const [user, setUser] = useState<CurrentUser | null>(stored.user);
  const [token, setTokenState] = useState<string | null>(() => {
    if (stored.token) {
      setAccessToken(stored.token);
    }
    return stored.token;
  });

  // Shared session tail: store the token, then load the current user. Used by
  // both password login and Google SSO — the only difference is which endpoint
  // issues the access token.
  const establishSession = useCallback(async (accessToken: string) => {
    setAccessToken(accessToken);
    setTokenState(accessToken);
    localStorage.setItem(TOKEN_KEY, accessToken);

    const me = await apiClient.get<CurrentUser>(endpoints.auth.me);
    setUser(me);
    localStorage.setItem(USER_KEY, JSON.stringify(me));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokenData = await apiClient.post<{ access_token: string; token_type: string }>(
        endpoints.auth.login,
        { email, password },
      );
      await establishSession(tokenData.access_token);
    },
    [establishSession],
  );

  // Unified SSO tail: any provider hands us its verified ID token; the backend
  // route differs only by the `{provider}` path segment. `establishSession`
  // (shared with password login) does the rest.
  const loginWithSso = useCallback(
    async (provider: SsoProvider, idToken: string) => {
      const tokenData = await apiClient.post<{ access_token: string; token_type: string }>(
        endpoints.auth.sso(provider),
        { id_token: idToken },
      );
      await establishSession(tokenData.access_token);
    },
    [establishSession],
  );

  const loginWithGoogle = useCallback(
    (idToken: string) => loginWithSso("google", idToken),
    [loginWithSso],
  );

  const logout = useCallback(() => {
    setAccessToken(null);
    setTokenState(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  // Mirror the signed-in user into Sentry so Issues and traces are
  // attributable to a person, covering login, restored sessions, and profile
  // refreshes; cleared on logout. This is a deliberate, explicit PII decision
  // for an internal tool — instrumentation-side auto-collection stays off
  // (dataCollection.userInfo: false in src/instrument.ts). Safe no-op when
  // Sentry is disabled (no DSN).
  useEffect(() => {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username:
          [user.first_name, user.last_name].filter(Boolean).join(" ") ||
          undefined,
      });
    } else {
      Sentry.setUser(null);
    }
  }, [user]);

  // Re-fetch /auth/me on demand. In-flight calls are de-duped via the ref so
  // window-focus + interval + manual triggers don't pile up parallel requests.
  // `tokenRef` mirrors the latest token state so `refreshUser` (memoised
  // with empty deps) always reads the current value. Mutating refs during
  // render breaks Compiler / lint rules — do it in an effect instead.
  const refreshingRef = useRef<Promise<void> | null>(null);
  const tokenRef = useRef<string | null>(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!tokenRef.current) return;
    if (refreshingRef.current) return refreshingRef.current;
    const p = (async () => {
      try {
        const me = await apiClient.get<CurrentUser>(endpoints.auth.me);
        setUser(me);
        localStorage.setItem(USER_KEY, JSON.stringify(me));
      } catch {
        // 401 is already handled by the axios interceptor (redirect to /login).
        // Other transient errors are swallowed — the next tick will retry.
      } finally {
        refreshingRef.current = null;
      }
    })();
    refreshingRef.current = p;
    return p;
  }, []);

  // Auto-refresh permissions on every route change. Cheap (one /auth/me per
  // navigation), no background polling. The dedup ref above stops parallel
  // calls if a navigation lands while a refresh is still in flight.
  const { pathname } = useLocation();
  useEffect(() => {
    if (!token) return;
    void refreshUser();
  }, [pathname, token, refreshUser]);

  // Safety net for users sitting on one page without navigating: re-fetch when
  // they return to the tab. Covers the "left dashboard open, admin changed my
  // perms, came back" case without resurrecting the 30s polling loop.
  useEffect(() => {
    if (!token) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshUser();
    };
    const onFocus = () => void refreshUser();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [token, refreshUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken: token,
      isAuthenticated: token != null,
      login,
      loginWithSso,
      loginWithGoogle,
      logout,
      refreshUser,
    }),
    [user, token, login, loginWithSso, loginWithGoogle, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
