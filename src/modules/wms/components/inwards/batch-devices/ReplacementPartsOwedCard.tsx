import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";

import type {
  ExpectedReturnLine,
  GrnBatchResponse,
  GrnDraftLine,
} from "../../../api";
import { useUpdateGrnBatchDraft } from "../../../hooks/inwards/useInwards";
import { INWARDS_STRINGS } from "../inwards.strings";
import { OwedPartsList } from "../replacement-parts/OwedPartsList";
import {
  partsStillLoose,
  withPartStaged,
  withoutPart,
} from "../replacement-parts/replacement-part-lines";

const S = INWARDS_STRINGS.replacementParts;

const stagedLinesOf = (batch: GrnBatchResponse): GrnDraftLine[] =>
  ((batch.metadata ?? null) as { _atomic_lines?: GrnDraftLine[] } | null)
    ?._atomic_lines ?? [];

/** The faulty part of each component swap that comes back loose, still owed on this
 *  replacement return, staged onto the draft next to its device lines. */
export function ReplacementPartsOwedCard({
  batch,
  isOpen,
}: {
  batch: GrnBatchResponse;
  isOpen: boolean;
}) {
  const update = useUpdateGrnBatchDraft();
  const lines = stagedLinesOf(batch);
  // A device staged on this batch brings its parts inside it, so they are not
  // owed on their own any more (spec D15 — the device wins).
  const owed = partsStillLoose(
    batch.expected_replacement_parts ?? [],
    (batch.expected_lines ?? []) as ExpectedReturnLine[],
    lines,
  );
  if (owed.length === 0) return null;

  // PATCH lines is a full replace: the helpers keep every other staged line as it is.
  const save = (next: GrnDraftLine[]) =>
    update.mutate({ id: batch.id, body: { lines: next } });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{S.title}</CardTitle>
        <Typography variant="helper" tone="muted">
          {S.description}
        </Typography>
      </CardHeader>
      <CardContent>
        <OwedPartsList
          parts={owed}
          stagedLines={lines}
          editable={isOpen}
          busy={update.isPending}
          onStage={(part, variantId) =>
            save(withPartStaged(lines, part, variantId))
          }
          onUnstage={(part) => save(withoutPart(lines, part))}
        />
      </CardContent>
    </Card>
  );
}
