import { ShieldOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Typography } from "@/components/ui/typography";
import { formatMissingPermissions } from "@/shared/rbac/permission-labels";

interface NoAccessProps {
  /** Heading. Defaults to "Access Denied". */
  title?: string;
  /**
   * Explanation line. Defaults to the generic sentence. Pass a 403
   * `error.message` here to surface the named missing permission(s) the
   * backend reported (e.g. "…Missing permission: crm:account_read").
   */
  description?: string;
  /**
   * The permission code(s) the client-side gate required but the user lacks.
   * Accepts a single OR-bundle (`string[]`, from `usePermission().missing`) or
   * a list of unmet OR-bundles (`string[][]`, from `usePermission().missingAll`
   * — e.g. the multi-step Closed Won gate). Rendered as a "Requires…" block
   * naming each missing permission, so the user (or an admin) knows exactly
   * which grant is needed.
   */
  missingPermissions?: readonly string[] | readonly (readonly string[])[];
  /**
   * Tighter layout (smaller icon, no large title) for inline slots like a
   * dropdown popover or a card section, where the full-page panel is too big.
   */
  compact?: boolean;
  className?: string;
}

const DEFAULT_TITLE = "Access Denied";
const DEFAULT_DESCRIPTION = "You don't have permission to view this content.";

export function NoAccess({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  missingPermissions,
  compact = false,
  className,
}: NoAccessProps) {
  const requirement = formatMissingPermissions(missingPermissions);

  if (compact) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex flex-col items-center justify-center gap-1.5 px-3 py-6 text-center",
          className,
        )}
      >
        <ShieldOff
          className="h-5 w-5 text-muted-foreground"
          aria-hidden="true"
        />
        <Typography variant="helper" tone="muted">
          {description}
        </Typography>
        {requirement ? (
          <div className="mt-1 flex flex-col items-center gap-0.5">
            <Typography variant="helper" tone="muted">
              {requirement.header}
            </Typography>
            {requirement.lines.map((line) => (
              <Typography key={line} variant="helper" tone="default">
                {line}
              </Typography>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-10 text-center",
        className,
      )}
    >
      <ShieldOff className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <Typography variant="subsection-title">{title}</Typography>
      <Typography variant="body" tone="muted">
        {description}
      </Typography>
      {requirement ? (
        <div className="mt-1 flex flex-col items-center gap-1">
          <Typography variant="helper" tone="muted">
            {requirement.header}
          </Typography>
          <ul className="flex flex-col items-center gap-0.5">
            {requirement.lines.map((line) => (
              <li key={line}>
                <Typography variant="body-strong" tone="default">
                  {line}
                </Typography>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
