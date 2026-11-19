import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState";
import type { DispatchCreateSourceState } from "../../hooks/dispatches/useDispatchCreateSource";
import { SectionHeader } from "../shared/section-primitives";
import { DISPATCH_CREATE_STRINGS as S } from "./dispatch-create.strings";
import { ReadyUnitsTable } from "./ReadyUnitsTable";

function ReadyUnitsContent({ src }: { src: DispatchCreateSourceState }) {
  const { readyQ, units } = src;
  if (readyQ.isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (readyQ.isError) return <LoadErrorState error={readyQ.error} fallback={S.errorBody} />;
  if (units.length === 0) return <EmptyState title={S.emptyTitle} description={S.emptyBody} />;
  return (
    <ReadyUnitsTable
      units={units}
      selectedIds={src.selected}
      onToggle={src.toggle}
      onToggleAll={src.toggleAll}
    />
  );
}

/** Step 1 · 1 — Ready for dispatch: numbered section card. The selection count
 *  lives in the table's own selection toolbar, next to Select-all. */
export function DispatchReadyUnitsCard({ src }: { src: DispatchCreateSourceState }) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader step={1} title={S.readyHeading} description={S.readyDesc} />
      </CardHeader>
      <CardContent>
        <ReadyUnitsContent src={src} />
      </CardContent>
    </Card>
  );
}
