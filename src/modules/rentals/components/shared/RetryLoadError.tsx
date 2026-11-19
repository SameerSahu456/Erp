import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isForbidden } from "@shared/api/envelope";
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState";

import { RENTALS_COMMON_STRINGS as C } from "./common.strings";

/** A load failure with a Retry (§12). A 403 renders `NoAccess` and offers no
 *  retry — asking again cannot grant the permission. */
export function RetryLoadError({
  error,
  fallback,
  onRetry,
  compact = false,
}: {
  error: unknown;
  fallback: string;
  onRetry: () => void;
  compact?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-3">
      <LoadErrorState error={error} fallback={fallback} compact={compact} className="w-full" />
      {isForbidden(error) ? null : (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="size-4" data-icon="inline-start" />
          {C.retry}
        </Button>
      )}
    </div>
  );
}
