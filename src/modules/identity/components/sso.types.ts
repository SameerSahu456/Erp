/**
 * Sign-in status an SSO button reports UP to {@link LoginPage}.
 *
 * The buttons don't render their own status/error line. If they did, the
 * message would appear wherever that button happens to sit — Google's errors
 * surfaced *between* the Google and Microsoft buttons, splitting the pair. The
 * page owns one status region below both buttons instead, so a message always
 * reads as belonging to the sign-in block rather than to whichever button
 * produced it.
 *
 * Both fields carry the provider's own copy (not a flag) so per-provider
 * wording in `login.strings.ts` survives the lift.
 */
export interface SsoStatus {
  /** In-flight message while a sign-in is running, else `null`. */
  pending: string | null;
  /** Failure message from the last attempt, else `null`. */
  error: string | null;
}

export const SSO_STATUS_IDLE: SsoStatus = { pending: null, error: null };

/** Props shared by every SSO button. */
export interface SsoButtonProps {
  redirectTo: string;
  /** True while EITHER provider is mid-sign-in — only one runs at a time. */
  busy: boolean;
  onStatusChange: (status: SsoStatus) => void;
}
