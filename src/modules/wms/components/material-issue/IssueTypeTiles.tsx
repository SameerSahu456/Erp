import { Fragment } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WiredIssueType } from "../../api";
import { ISSUE_TYPE_OPTIONS } from "../../constants/material-issue-status";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import { ISSUE_TYPE_ICON } from "./material-issue-form-helpers";

type IssueTypeMeta = (typeof ISSUE_TYPE_OPTIONS)[number];

interface IssueTypeTileProps {
  meta: IssueTypeMeta;
  selected: boolean;
  locked: boolean;
  onSelect: (next: WiredIssueType) => void;
}

function IssueTypeTile({ meta, selected, locked, onSelect }: IssueTypeTileProps) {
  const Icon = ISSUE_TYPE_ICON[meta.value];
  return (
    <button
      type="button"
      disabled={!meta.wired || locked}
      aria-pressed={selected}
      onClick={() => onSelect(meta.value as WiredIssueType)}
      className={cn(
        "flex h-full w-full flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border hover:border-primary/40 hover:bg-muted/40",
        !meta.wired &&
          "cursor-not-allowed opacity-50 hover:border-border hover:bg-transparent",
      )}
    >
      <div className="flex w-full items-center justify-between">
        {Icon && (
          <Icon
            className={cn(
              "size-4",
              selected ? "text-primary" : "text-muted-foreground",
            )}
          />
        )}
        {selected && <Check className="size-3.5 text-primary" />}
      </div>
      <Typography
        variant="body-strong"
        tone={selected ? "primary" : "default"}
        asChild
      >
        <span className="leading-tight">{meta.label}</span>
      </Typography>
      <Typography variant="helper" tone="muted" asChild>
        <span className="leading-snug">{meta.description}</span>
      </Typography>
    </button>
  );
}

interface IssueTypeTilesProps {
  value: WiredIssueType;
  locked: boolean;
  onSelect: (next: WiredIssueType) => void;
}

export function IssueTypeTiles({ value, locked, onSelect }: IssueTypeTilesProps) {
  return (
    <div className="space-y-2">
      <Label>{S.form.header.issueType}</Label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {ISSUE_TYPE_OPTIONS.map((meta) => {
          const tile = (
            <IssueTypeTile
              meta={meta}
              selected={value === meta.value}
              locked={locked}
              onSelect={onSelect}
            />
          );
          // An unwired issue type has no backend flow yet — keep it
          // visible but disabled, with a why-tooltip (§0.14).
          return meta.wired ? (
            <Fragment key={meta.value}>{tile}</Fragment>
          ) : (
            <Tooltip key={meta.value}>
              <TooltipTrigger
                render={<span className="block h-full w-full" />}
              >
                {tile}
              </TooltipTrigger>
              <TooltipContent>{S.form.header.comingSoon}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
