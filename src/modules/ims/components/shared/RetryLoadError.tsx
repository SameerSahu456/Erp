import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isForbidden } from "@shared/api/envelope";
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState";

import { IMS_SHARED_STRINGS } from "./shared.strings";

const S = IMS_SHARED_STRINGS.recordFallback;

/** A load failure with a Retry (§12). A 403 offers no retry — asking again
 *  cannot grant the permission. */
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
          {S.retry}
        </Button>
      )}
    </div>
  );
}
