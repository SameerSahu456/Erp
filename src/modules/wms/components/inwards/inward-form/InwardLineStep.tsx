import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { cn } from "@/lib/utils";

import { SectionHeader } from "./FormPrimitives";
import type { InwardForm } from "./useInwardForm";
import { InwardLineItems } from "../InwardLineItems";
import { ReturnLineItems } from "../ReturnLineItems";
import { ReplacementReturnLines } from "./ReplacementReturnLines";
import { RentalReturnLines } from "./RentalReturnLines";
import { ManualReceiveLines } from "../ManualReceiveLines";
import { INWARDS_STRINGS } from "../inwards.strings";

// The Step-2 editor body — manual capture, return units, or PO line items.
// Early returns instead of a nested ternary (§14 #5).
function LineStepContent({ f }: { f: InwardForm }) {
  const {
    isManual,
    manualState,
    setManualState,
    detailQuery,
    isReturn,
    returnLines,
    returnState,
    setReturnState,
    receivableLines,
    lines,
    setLines,
    origin,
    flaggedSerials,
    inwardType,
  } = f;

  if (isManual)
    return <ManualReceiveLines value={manualState} onChange={setManualState} />;
  if (detailQuery.isLoading)
    return <div className="h-32 w-full animate-pulse rounded-md bg-muted" />;
  // Migrated units are ticked here; dispatched units are scanned on their own
  // screen once the batch exists, each checked against the units on rent.
  if (inwardType === "rental_return") return <RentalReturnLines f={f} />;
  if (inwardType === "replacement_return") return <ReplacementReturnLines f={f} />;
  if (isReturn)
    return (
      <ReturnLineItems
        lines={returnLines}
        value={returnState}
        onChange={setReturnState}
      />
    );
  if (receivableLines.length === 0)
    return (
      <EmptyState
        title={INWARDS_STRINGS.lineStep.emptyTitle}
        description={INWARDS_STRINGS.lineStep.emptyDescription}
      />
    );
  return (
    <InwardLineItems
      pendingLines={receivableLines}
      value={lines}
      onChange={setLines}
      condition={origin}
      flaggedSerials={flaggedSerials}
    />
  );
}

/** Step 2: the line-items / returning-units editor with a staged-count chip. */
export function InwardLineStep({ f }: { f: InwardForm }) {
  const { isReturn, stagedCount } = f;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <SectionHeader
            step={1}
            title={
              isReturn
                ? INWARDS_STRINGS.lineStep.returningUnitsTitle
                : INWARDS_STRINGS.lineItems.sectionTitle
            }
            description={
              isReturn
                ? INWARDS_STRINGS.lineStep.returningUnitsDescription
                : INWARDS_STRINGS.lineStep.lineItemsDescription
            }
          />
          <span
            className={cn(
              "inline-flex shrink-0 items-baseline gap-1 rounded-full px-2.5 py-0.5",
              stagedCount > 0 ? "bg-primary/10" : "bg-muted",
            )}
          >
            <Typography
              variant="body-strong"
              numeric
              tone={stagedCount > 0 ? "primary" : "muted"}
            >
              {stagedCount}
            </Typography>
            <Typography
              variant="caption"
              tone={stagedCount > 0 ? "primary" : "muted"}
            >
              {isReturn
                ? INWARDS_STRINGS.lineStep.returningChip
                : INWARDS_STRINGS.lineStep.stagedChip}
            </Typography>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <LineStepContent f={f} />
      </CardContent>
    </Card>
  );
}
