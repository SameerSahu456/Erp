import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AsyncSelect } from "@/components/ui/async-select";
import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import {
  useVariantsListInfinite,
  type VariantListItem,
  partOptionDescription,
} from "@modules/ims";

import type { GrnDraftLine } from "../../../api";
import { INWARDS_STRINGS } from "../inwards.strings";
import { isLineForPart, type OwedPart } from "./replacement-part-lines";

const S = INWARDS_STRINGS.replacementParts;

const partName = (part: OwedPart) =>
  part.part_name || part.description || S.describedFallback;

/** The faulty parts owed back on a replacement return, each with a stage /
 *  remove action. Where the staged lines live is the caller's business: the
 *  new-inward form keeps them in state, the batch page saves them. */
export function OwedPartsList({
  parts,
  stagedLines,
  editable,
  busy,
  onStage,
  onUnstage,
}: {
  parts: OwedPart[];
  stagedLines: GrnDraftLine[];
  editable: boolean;
  busy: boolean;
  onStage: (part: OwedPart, variantId: string | null) => void;
  onUnstage: (part: OwedPart) => void;
}) {
  return (
    <div className="divide-y divide-border">
      {parts.map((part) => (
        <OwedPartRow
          key={part.replacement_request_item_id}
          part={part}
          staged={stagedLines.some((l) => isLineForPart(l, part))}
          editable={editable}
          busy={busy}
          onStage={(variantId) => onStage(part, variantId)}
          onUnstage={() => onUnstage(part)}
        />
      ))}
    </div>
  );
}

/** Where the part was swapped, and what was planned to come in (spec D15). */
function whereLabel(part: OwedPart): string {
  if (part.swap_location !== "in_house") return S.onSite;
  return part.in_house_return === "part"
    ? S.inHousePartOnly
    : S.inHouseDevicePlanned;
}

function OwedPartRow({
  part,
  staged,
  editable,
  busy,
  onStage,
  onUnstage,
}: {
  part: OwedPart;
  staged: boolean;
  editable: boolean;
  busy: boolean;
  onStage: (variantId: string | null) => void;
  onUnstage: () => void;
}) {
  const [variant, setVariant] = useState<{ id: string; label: string } | null>(
    null,
  );
  // A part we track is received by its own unit; a described one by the IMS
  // part the store picks for it.
  const tracked = !!part.expected_stock_item_id;
  const name = partName(part);

  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <TruncatedText value={name} className="block max-w-full font-medium" />
        <Typography
          variant="helper"
          tone="muted"
          className="block truncate font-mono"
        >
          {part.internal_serial ||
            part.manufacturer_serial ||
            part.part_number ||
            S.noSerial}
        </Typography>
        <Typography variant="caption" tone="muted" className="block">
          {whereLabel(part)}
        </Typography>
        {!tracked && !staged && (
          <Typography variant="caption" tone="muted" className="block">
            {S.describedHelp}
          </Typography>
        )}
      </div>
      {!tracked && !staged && editable && (
        <AsyncSelect<VariantListItem>
          value={variant}
          onValueChange={(next) =>
            setVariant(next ? { id: next.id, label: next.label } : null)
          }
          useOptions={useVariantsListInfinite}
          toLabel={(v) => v.display_title}
          getDescription={partOptionDescription}
          placeholder={S.pickPart}
          searchPlaceholder={S.pickPart}
          searchable
          className="w-full sm:max-w-md"
          aria-label={S.pickPartAria}
        />
      )}
      <OwedRowAction
        staged={staged}
        editable={editable}
        busy={busy}
        canStage={tracked || !!variant}
        onStage={() => onStage(tracked ? null : (variant?.id ?? null))}
        onUnstage={onUnstage}
      />
    </div>
  );
}

/** Staged → badge (+ remove while editable); else the stage button while editable. */
function OwedRowAction({
  staged,
  editable,
  busy,
  canStage,
  onStage,
  onUnstage,
}: {
  staged: boolean;
  editable: boolean;
  busy: boolean;
  canStage: boolean;
  onStage: () => void;
  onUnstage: () => void;
}) {
  if (staged) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge variant="success">{S.staged}</StatusBadge>
        {editable && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={onUnstage}
          >
            {S.remove}
          </Button>
        )}
      </div>
    );
  }
  if (!editable) return null;
  return (
    <Button
      size="sm"
      className="shrink-0"
      disabled={busy || !canStage}
      onClick={onStage}
    >
      {busy ? S.staging : S.stage}
    </Button>
  );
}
