import { Link } from "react-router-dom";
import { ClipboardCheck, ChevronRight, Cpu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import type { MaterialIssueLineResponse, MaterialIssueStage } from "../../api";
import {
  MATERIAL_ISSUE_STAGE_LABELS,
  MATERIAL_ISSUE_STAGE_VARIANT,
} from "../../constants/material-issue-status";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import type { LineLabels } from "./material-issue-detail-helpers";

interface LineCardHeaderProps {
  line: MaterialIssueLineResponse;
  labels: LineLabels;
  hasBody: boolean;
  open: boolean;
  onToggle: () => void;
  qcVisible: boolean;
  onQc: (line: MaterialIssueLineResponse) => void;
}

/** A single accordion row. The identity toggles open/closed; Outward QC sits
 *  alongside as its own control (not nested in the toggle). */
export function LineCardHeader({
  line,
  labels,
  hasBody,
  open,
  onToggle,
  qcVisible,
  onQc,
}: LineCardHeaderProps) {
  const stage = line.stage as MaterialIssueStage;
  const serial = line.stock_item_id ? labels.serial(line.stock_item_id) : "—";
  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-muted/50 px-4 py-3 transition-colors",
        hasBody && "hover:bg-muted/70",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={hasBody ? open : undefined}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <ChevronRight
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            !hasBody && "invisible",
            open && "rotate-90",
          )}
        />
        <span className="min-w-0 flex-1 space-y-0.5">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Typography variant="card-title" truncate asChild>
              <span className="min-w-0">{labels.variantName(line.part_variant_id)}</span>
            </Typography>
            <StatusBadge variant={MATERIAL_ISSUE_STAGE_VARIANT[stage] ?? "neutral"}>
              {MATERIAL_ISSUE_STAGE_LABELS[stage] ?? line.stage}
            </StatusBadge>
            {line.substitution_reason && (
              <SubstituteBadge reason={line.substitution_reason} />
            )}
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <Typography variant="helper" tone="muted" truncate asChild>
              <span className="min-w-0">
                {labels.variantSku(line.part_variant_id)}
              </span>
            </Typography>
            <Typography variant="helper" tone="muted" asChild>
              <span>{S.detail.line.qtyLabel}</span>
            </Typography>
            <Typography variant="mono" tone="muted" truncate asChild>
              <span className="min-w-0">{serial}</span>
            </Typography>
          </span>
          {/* Spell out the substitution in full — the badge alone read as a
              bare "Substitute"; the operator's reason stays in its tooltip. */}
          {line.substitution_reason && (
            <Typography variant="helper" tone="muted" asChild>
              <span className="min-w-0">{S.detail.line.substituteHint}</span>
            </Typography>
          )}
        </span>
      </button>
      {line.stock_item_id && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          render={<Link to={`/wms/devices/${line.stock_item_id}`} />}
        >
          <Cpu className="size-3.5" data-icon="inline-start" />
          {S.detail.actions.viewDevice}
        </Button>
      )}
      {qcVisible && (
        <Button size="sm" onClick={() => onQc(line)} className="shrink-0">
          <ClipboardCheck className="size-3.5" data-icon="inline-start" />
          {stage === "qc_failed" ? S.detail.actions.rerunQc : S.detail.actions.outwardQc}
        </Button>
      )}
    </div>
  );
}

// Styled tooltip, never a native `title=` (§0.14).
function SubstituteBadge({ reason }: { reason: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex cursor-default" />}>
          <StatusBadge variant="warning">{S.detail.line.substitute}</StatusBadge>
        </TooltipTrigger>
        <TooltipContent>{reason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
