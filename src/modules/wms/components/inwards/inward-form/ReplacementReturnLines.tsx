import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";

import type { InwardForm } from "./useInwardForm";
import { LegacyReturnUnits } from "../LegacyReturnUnits";
import { ReturnLineItems } from "../ReturnLineItems";
import { OwedPartsList } from "../replacement-parts/OwedPartsList";
import {
  fallbackDeviceLineIds,
  fallbackStockIds,
  partsInsideComingDevice,
  partsStillLoose,
  withPartStaged,
  withoutPart,
  withoutPartLinesFor,
} from "../replacement-parts/replacement-part-lines";
import {
  buildReturnLines,
  type ReturnState,
} from "../return-line-items-helpers";
import { INWARDS_STRINGS } from "../inwards.strings";

const S = INWARDS_STRINGS.lineStep;

/** Replacement return, step 2: the faulty parts coming back on their own lead.
 *  A device whose parts were raised to come in alone is only a fallback, kept
 *  behind "Whole device came in instead?" — inward still decides (spec D15). */
export function ReplacementReturnLines({ f }: { f: InwardForm }) {
  const {
    returnLines,
    returnState,
    setReturnState,
    expectedParts,
    legacyUnits,
    partLines,
    setPartLines,
  } = f;
  const [deviceAsked, setDeviceAsked] = useState(false);

  const fallbackLines = fallbackDeviceLineIds(expectedParts);
  const fallbackUnits = fallbackStockIds(returnLines, fallbackLines);
  const primaryLines = returnLines.filter(
    (l) => !fallbackLines.has(l.dispatch_request_item_id),
  );
  // A draft that already holds a fallback device keeps it on screen.
  const showFallback =
    deviceAsked ||
    returnState.some(
      (l) => !!l.stockItemId && fallbackUnits.has(l.stockItemId),
    );
  const deviceLines = showFallback ? returnLines : primaryLines;

  // The whole device wins (spec D15): its parts arrive inside it, so they are
  // not offered on their own, and any already staged loose are dropped.
  const insideFor = (state: ReturnState) =>
    partsInsideComingDevice(
      expectedParts,
      returnLines,
      buildReturnLines(state),
    );
  const looseParts = partsStillLoose(
    expectedParts,
    returnLines,
    buildReturnLines(returnState),
  );
  const changeDevices = (next: ReturnState) => {
    setReturnState(next);
    const inside = insideFor(next);
    if (inside.size > 0) setPartLines(withoutPartLinesFor(partLines, inside));
  };

  return (
    <div className="space-y-6">
      {looseParts.length > 0 && (
        <section className="space-y-2">
          <Typography variant="subsection-title">
            {S.partsComingInTitle}
          </Typography>
          <Typography variant="helper" tone="muted">
            {S.partsComingInDescription}
          </Typography>
          <OwedPartsList
            parts={looseParts}
            stagedLines={partLines}
            editable
            busy={false}
            onStage={(part, variantId) =>
              setPartLines(withPartStaged(partLines, part, variantId))
            }
            onUnstage={(part) => setPartLines(withoutPart(partLines, part))}
          />
        </section>
      )}
      {deviceLines.length > 0 && (
        <section className="space-y-2">
          {looseParts.length > 0 && (
            <Typography variant="subsection-title">{S.devicesTitle}</Typography>
          )}
          {showFallback && fallbackLines.size > 0 && (
            <Typography variant="helper" tone="muted">
              {S.deviceInsteadHelp}
            </Typography>
          )}
          <ReturnLineItems
            lines={deviceLines}
            value={returnState}
            onChange={changeDevices}
          />
        </section>
      )}
      {/* Migrated rental units owed back: no dispatch record, so ticked by
          serial rather than picked as a part. */}
      {legacyUnits.length > 0 && (
        <LegacyReturnUnits
          units={legacyUnits}
          value={returnState}
          onChange={setReturnState}
        />
      )}
      {!showFallback && fallbackLines.size > 0 && (
        <Button
          variant="link"
          className="h-auto self-start px-0 text-primary"
          onClick={() => setDeviceAsked(true)}
        >
          {S.deviceInstead}
        </Button>
      )}
    </div>
  );
}
