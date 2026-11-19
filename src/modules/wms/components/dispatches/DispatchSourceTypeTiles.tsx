import { Fragment } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Typography } from "@/components/ui/typography";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DISPATCH_CREATE_STRINGS as S } from "./dispatch-create.strings";
import { SOURCE_TYPES } from "./dispatch-create-helpers";

type SourceTypeMeta = (typeof SOURCE_TYPES)[number];

function SourceTypeTile({
  t,
  selected,
  onSelect,
}: {
  t: SourceTypeMeta;
  selected: boolean;
  onSelect: (key: string) => void;
}) {
  const Icon = t.icon;
  return (
    <button
      type="button"
      disabled={!t.wired}
      aria-pressed={selected}
      onClick={() => onSelect(t.key)}
      className={cn(
        "relative flex h-full w-full flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border hover:border-primary/40 hover:bg-muted/40",
        !t.wired &&
          "cursor-not-allowed opacity-50 hover:border-border hover:bg-transparent",
      )}
    >
      <div className="flex w-full items-center justify-between">
        <Icon
          className={cn(
            "size-4",
            selected ? "text-primary" : "text-muted-foreground",
          )}
        />
        {selected && <Check className="size-3.5 text-primary" />}
      </div>
      <div className="min-w-0">
        <Typography
          variant="body-strong"
          className={selected ? "text-primary" : undefined}
        >
          {t.label}
        </Typography>
        <Typography variant="helper" tone="muted" className="mt-0.5 leading-snug">
          {t.description}
        </Typography>
      </div>
    </button>
  );
}

export function DispatchSourceTypeTiles({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {SOURCE_TYPES.map((t) => {
        const tile = (
          <SourceTypeTile t={t} selected={t.key === value} onSelect={onSelect} />
        );
        // An unwired source type has no backend flow yet — keep it
        // visible but disabled, with a why-tooltip (§0.14).
        return t.wired ? (
          <Fragment key={t.key}>{tile}</Fragment>
        ) : (
          <Tooltip key={t.key}>
            <TooltipTrigger render={<span className="block h-full w-full" />}>
              {tile}
            </TooltipTrigger>
            <TooltipContent>{S.comingSoon}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
