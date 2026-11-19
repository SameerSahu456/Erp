import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Typography } from "@/components/ui/typography";

/** Icon tile + title/hint (+ optional trailing chip) heading an editor column. */
export function EditorSectionHeader({
  icon,
  iconClassName,
  title,
  hint,
  trailing,
}: {
  icon: ReactNode;
  iconClassName: string;
  title: string;
  hint: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          iconClassName,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <Typography variant="card-title" asChild>
          <span className="block">{title}</span>
        </Typography>
        <Typography variant="helper" tone="muted" asChild>
          <span className="block">{hint}</span>
        </Typography>
      </div>
      {trailing}
    </div>
  );
}
