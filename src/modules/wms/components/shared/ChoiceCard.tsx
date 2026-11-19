import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

export function ChoiceCard({
  selected,
  onClick,
  title,
  subtitle,
  disabled,
  compact,
  radio,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  disabled?: boolean;
  compact?: boolean;
  /** Show a radio dot beside the text, for a one-of-two choice. */
  radio?: boolean;
}) {
  const selectedStyle = radio
    ? "border-info bg-info/5 ring-1 ring-info/30"
    : "border-primary bg-primary/5 ring-1 ring-primary/30";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3 text-left transition",
        compact ? "py-2" : "py-2.5",
        selected ? selectedStyle : "border-border hover:bg-muted/40",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      )}
    >
      {radio && (
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border",
            selected ? "border-info bg-info" : "border-input bg-card",
          )}
        >
          {selected && <span className="size-2 rounded-full bg-info-foreground" />}
        </span>
      )}
      <span className="flex min-w-0 flex-col items-start gap-0.5">
        <Typography variant="body-strong" asChild>
          <span>{title}</span>
        </Typography>
        {subtitle && (
          <Typography variant="helper" tone="muted" asChild>
            <span>{subtitle}</span>
          </Typography>
        )}
      </span>
    </button>
  );
}
