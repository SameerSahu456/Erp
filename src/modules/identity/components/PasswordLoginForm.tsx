import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";

import { ApiError } from "@shared/api/envelope";
import { useAuth } from "@shared/auth/use-auth";

import { LOGIN_STRINGS } from "./login.strings";

/** Email + password login form — the default when Google SSO is disabled. */
export function PasswordLoginForm({ redirectTo }: { redirectTo: string }) {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || LOGIN_STRINGS.passwordForm.errorLoginFailed);
      } else {
        setError(LOGIN_STRINGS.passwordForm.errorBackendUnreachable);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{LOGIN_STRINGS.passwordForm.emailLabel}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{LOGIN_STRINGS.passwordForm.passwordLabel}</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPassword ? LOGIN_STRINGS.passwordForm.hidePassword : LOGIN_STRINGS.passwordForm.showPassword}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      {error && (
        <Typography tone="danger" role="alert">
          {error}
        </Typography>
      )}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? LOGIN_STRINGS.passwordForm.submitSigningIn : LOGIN_STRINGS.passwordForm.submitSignIn}
      </Button>
    </form>
  );
}
