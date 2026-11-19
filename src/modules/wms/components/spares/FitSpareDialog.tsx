import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";

import { useFitSpare, type FitSubject } from "../../hooks/spares/useFitSpare";
import { OperationDialog } from "../shared/OperationDialog";
import { SPARES_STRINGS as S } from "./spares.strings";

export type { FitSubject } from "../../hooks/spares/useFitSpare";

const F = S.fitDialog;

function Helper({ tone = "muted", children }: { tone?: "muted" | "danger"; children: ReactNode }) {
  return (
    <Typography variant="helper" tone={tone} asChild>
      <p>{children}</p>
    </Typography>
  );
}

/** Record fulfilled spares as components of the device they went into
 *  (consumed → installed). Optional, and done by whoever fitted them — the
 *  store fulfils, but only the engineer knows the part went in. */
export function FitSpareDialog({ request, onClose }: { request: FitSubject | null; onClose: () => void }) {
  // Keyed per request so the selection starts clean each time it opens.
  return <FitSpareDialogBody key={request?.id ?? "closed"} request={request} onClose={onClose} />;
}

function FitSpareDialogBody({ request, onClose }: { request: FitSubject | null; onClose: () => void }) {
  const f = useFitSpare(request, onClose);

  function renderBody() {
    if (f.isLoading) return <Helper>{F.unitsHeading}…</Helper>;
    if (f.isError) return <Helper tone="danger">{F.loadError}</Helper>;
    if (f.fittableIds.length === 0) {
      return (
        <div className="space-y-1">
          <Typography variant="body-strong" asChild>
            <p>{F.emptyTitle}</p>
          </Typography>
          <Helper>{F.emptyDescription}</Helper>
        </div>
      );
    }
    return (
      <>
        <div className="space-y-2">
          <Label>{F.unitsHeading}</Label>
          <div className="max-h-80 space-y-1 overflow-y-auto rounded-md border p-2">
            {f.fittableIds.map((unitId) => {
              const identity = f.unitById.get(unitId);
              return (
                <label key={unitId} className="flex min-w-0 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5">
                  <Checkbox checked={f.selected.has(unitId)} onCheckedChange={() => f.toggle(unitId)} />
                  <span className="min-w-0 flex-1">
                    <Typography variant="body" asChild>
                      <span className="block truncate font-mono">{identity?.serial ?? F.unitSerialFallback}</span>
                    </Typography>
                    <Typography variant="helper" tone="muted" asChild>
                      <span className="block truncate">{identity?.part ?? unitId}</span>
                    </Typography>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="spare-fit-position">{F.positionLabel}</Label>
          <Input
            id="spare-fit-position"
            maxLength={50}
            value={f.position}
            placeholder={F.positionPlaceholder}
            onChange={(e) => f.setPosition(e.target.value)}
          />
        </div>
      </>
    );
  }

  return (
    <OperationDialog
      open={f.open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={F.title}
      isDirty={f.dirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose}>
            {F.cancel}
          </Button>
          <Button onClick={f.submit} disabled={f.blockReason !== null || f.pending}>
            {f.pending && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
            {f.pending ? F.submitting : F.submit}
          </Button>
        </>
      )}
    >
      {request && (
        <div className="min-w-0 space-y-4">
          <div className="min-w-0 space-y-1">
            <Typography variant="body-strong" truncate className="min-w-0">
              {request.partLabel}
            </Typography>
            <Helper>{F.description}</Helper>
          </div>
          {renderBody()}
        </div>
      )}
    </OperationDialog>
  );
}
