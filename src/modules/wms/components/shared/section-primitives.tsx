import { type ReactNode } from "react";
import { Check, type LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

/**
 * Shared building blocks that give every WMS form + detail page the same
 * considered rhythm as the Inward page: a numbered step header on each card,
 * one segmented-choice control, and one read-only fact cell. Consolidated here
 * (out of `inward-form/` and the per-feature `OptionTile` / `Fact` / `Detail`
 * copies) so Sales Return, Replacement, and future modules share one grammar.
 */

/** Numbered section header — a step circle + title + one muted description
 *  line, with an optional right-aligned action/summary slot (e.g. a count
 *  chip or a bulk button). */
export function SectionHeader({
  step,
  title,
  description,
  action,
}: {
  step?: number;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex w-full items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {step != null && (
          <Typography variant="body-strong" tone="primary" asChild>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
              {step}
            </span>
          </Typography>
        )}
        <div className="min-w-0">
          <Typography variant="card-title">{title}</Typography>
          {description && (
            <Typography variant="helper" tone="muted" className="mt-0.5 block">
              {description}
            </Typography>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** A numbered step Card: `SectionHeader` in the header, children in the body.
 *  The single spacing scale — card gap-6 (owned by the page), CardContent
 *  space-y-6 — lives here so no page re-invents it. */
export function SectionCard({
  step,
  title,
  description,
  action,
  children,
  contentClassName,
}: {
  step?: number;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          step={step}
          title={title}
          description={description}
          action={action}
        />
      </CardHeader>
      <CardContent className={cn("space-y-6", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
  icon?: LucideIcon;
  /** Shown but not selectable; say why in `hint`. */
  disabled?: boolean;
}

/** One segmented-choice control for a small set of named options (2–4) where
 *  each carries a label and optional one-line hint — a row of tiles rather than
 *  a dropdown. Replaces the per-feature `OptionTile` and hand-rolled radio
 *  tiles. `columns` controls the grid; the caller owns the wrapper width. */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onSelect,
  columns = 2,
  className,
}: {
  options: SegmentedOption<T>[];
  value: T | null;
  onSelect: (next: T) => void;
  columns?: 2 | 3;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-2",
        columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
        className,
      )}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            disabled={opt.disabled}
            onClick={() => {
              if (opt.value !== value) onSelect(opt.value);
            }}
            className={cn(
              "flex items-start justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors",
              selected
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-card hover:bg-muted/60",
              opt.disabled && "cursor-not-allowed opacity-60 hover:bg-card",
            )}
          >
            <span className="flex min-w-0 items-start gap-2">
              {Icon && <Icon className="mt-0.5 size-4 shrink-0" />}
              <span className="min-w-0">
                <Typography variant="body-strong">{opt.label}</Typography>
                {opt.hint && (
                  <Typography
                    variant="helper"
                    tone="muted"
                    className="leading-snug"
                  >
                    {opt.hint}
                  </Typography>
                )}
              </span>
            </span>
            {selected && <Check className="mt-0.5 size-4 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

/** One read-only fact (icon, label, value); em dash when empty, `min-w-0` so long values wrap (§8.7). */
export function DetailFact({
  icon: Icon,
  label,
  value,
  children,
  className,
}: {
  icon?: LucideIcon;
  label: string;
  /** Plain value; use `children` instead for a badge / link / custom node. */
  value?: ReactNode;
  children?: ReactNode;
  /** Layout one-offs only (e.g. a `col-span-*` in the parent grid). */
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-start gap-2", className)}>
      {Icon && (
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0">
        <Typography variant="helper" tone="muted" className="block">
          {label}
        </Typography>
        {children ? (
          <div className="mt-0.5">{children}</div>
        ) : (
          <Typography variant="body-strong" className="break-words">
            {value == null || value === "" ? "—" : value}
          </Typography>
        )}
      </div>
    </div>
  );
}

/** The standard 2/3/4-up fact grid for a detail card's overview block. */
export function FactGrid({
  children,
  className,
}: {
  children: ReactNode;
  /** Override the column classes (e.g. `lg:grid-cols-5`) so a fact count that
   *  doesn't divide by 4 still fills its rows evenly. */
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
