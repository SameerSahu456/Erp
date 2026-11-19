import { cn } from "@/lib/utils";
import { Typography } from "@/components/ui/typography";
import { isForbidden } from "@/shared/api/envelope";

import { NoAccess } from "./NoAccess";

interface LoadErrorStateProps {
  /** The thrown query error. */
  error: unknown;
  /** Fallback copy when the error carries no message and isn't a 403. */
  fallback: string;
  /** Heading for the 403 "no access" view. Defaults to "Access Denied". */
  noAccessTitle?: string;
  /** Render the compact (inline) layout — for dropdowns / small slots. */
  compact?: boolean;
  className?: string;
}

/**
 * Standard error slot for a data-driven section/list. A 403 renders the
 * friendly `<NoAccess>` permission boundary (so the user doesn't feel
 * something broke) with the backend-named missing permission; any other
 * failure renders the red "something went wrong" box. Centralises the
 * `isForbidden(error) ? … : …` branch so every section behaves the same.
 */
export function LoadErrorState({
  error,
  fallback,
  noAccessTitle,
  compact = false,
  className,
}: LoadErrorStateProps) {
  if (isForbidden(error)) {
    return (
      <NoAccess
        title={noAccessTitle}
        description={error.message}
        compact={compact}
        className={className}
      />
    );
  }

  const message = error instanceof Error ? error.message : fallback;

  if (compact) {
    return (
      <Typography variant="helper" tone="danger" align="center" asChild>
        <div className={cn("px-2 py-6", className)}>{message}</div>
      </Typography>
    );
  }

  return (
    <Typography
      variant="body"
      tone="danger"
      className={cn(
        "rounded-lg border border-destructive/40 bg-destructive/5 p-4",
        className,
      )}
      asChild
    >
      <div>{message}</div>
    </Typography>
  );
}
