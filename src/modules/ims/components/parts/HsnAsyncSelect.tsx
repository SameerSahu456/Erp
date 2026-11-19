import { AsyncSelect } from "@/components/ui/async-select";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";

import { useHSNCode, useHSNCodeOptions } from "../../hooks/parts/useHSN";
import { formatPercent } from "../../lib/format";
import { PARTS_STRINGS } from "./parts.strings";

const S = PARTS_STRINGS.hsn;

/**
 * Shared HSN code dropdown for IMS forms (Parts, Variants, etc.).
 *
 * Renders as TWO side-by-side labelled fields:
 *   ┌─────────────┐  ┌─────┐
 *   │ HSN Code *  │  │ GST │     ← labels
 *   ├─────────────┤  ├─────┤
 *   │ [picker  ▾] │  │ 18% │     ← inputs
 *   └─────────────┘  └─────┘
 *
 * The labels live inside this component (not on the parent form) so the
 * "GST" caption sits at the exact same y-position as "HSN Code", giving
 * the pair a single coherent label row. The GST field is read-only —
 * its rate is a property of the selected HSN row, not an editable form
 * value — and fills in as soon as the user picks a code so they can
 * verify the rate without re-opening the picker.
 *
 * One canonical wrapper around `AsyncSelect` so every form (Parts,
 * Variant page, Variant dialog) picks up the same UX.
 */
export interface HsnAsyncSelectProps {
  /** The HSN code id. Empty string = nothing selected. */
  value: string;
  /** Fires with the new id (or `null` when cleared). */
  onChange: (id: string | null) => void;
  /** Label above the HSN picker. Defaults to "HSN Code". */
  label?: string;
  /** Render an asterisk after the label. */
  required?: boolean;
  /** Placeholder when nothing is picked. */
  placeholder?: string;
  /** Forward to `<label htmlFor>` and the dropdown's id. */
  id?: string;
  /** Disable the picker entirely. */
  disabled?: boolean;
}

export function HsnAsyncSelect({
  value,
  onChange,
  label = S.defaultLabel,
  required = false,
  placeholder = S.defaultPlaceholder,
  id,
  disabled = false,
}: HsnAsyncSelectProps) {
  // Hydrate the full HSN row so the GST box fills in as soon as a value
  // is set (even on edit-mode hydration, before the dropdown is opened).
  // One small extra GET per form, but it lands in the same TanStack
  // Query cache as the dropdown options hook below.
  const { data: selected } = useHSNCode(value);

  return (
    <div className="flex items-end gap-2">
      {/* HSN side — label + dropdown stacked. `flex-1` so it claims
          whatever width the parent gives it after the GST column has
          reserved its 112px. */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
        <AsyncSelect
          id={id}
          value={value && selected ? { id: value, label: selected.code } : null}
          onValueChange={(v) => onChange(v?.id ?? null)}
          useOptions={useHSNCodeOptions}
          toLabel={(o) => o.code}
          placeholder={placeholder}
          searchPlaceholder={S.searchPlaceholder}
          className="h-10 w-full font-mono"
          clearable
          chevron="down"
          disabled={disabled}
          // Dropdown row: code · description · GST on the right.
          renderItem={(o) => (
            <span className="flex w-full items-center gap-2">
              <Typography asChild variant="body">
                <span className="font-mono">{o.code}</span>
              </Typography>
              {o.description && (
                <Typography variant="helper" className="min-w-0 truncate">
                  {"— "}
                  {o.description}
                </Typography>
              )}
              <Typography variant="helper" className="ml-auto shrink-0">
                {formatPercent(Number(o.gst_rate))}
              </Typography>
            </span>
          )}
        />
      </div>

      {/* GST side — label + read-only box. Same vertical stack as the
          HSN side so the two labels share a row and the two input
          surfaces share a row. `items-end` on the parent guarantees
          the box bottoms align even if the labels ever differ in
          height. */}
      <div className="flex shrink-0 flex-col gap-1.5">
        <Label htmlFor={id ? `${id}-gst` : undefined}>{S.gstLabel}</Label>
        <Typography
          asChild
          variant="body-strong"
        >
          <div
            id={id ? `${id}-gst` : undefined}
            role="status"
            aria-label={S.gstAriaLabel}
            title={S.gstTitle}
            className="flex h-10 w-[112px] items-center justify-center rounded-[7px] border border-input bg-muted/30 px-3 tabular-nums"
          >
            {selected ? (
              formatPercent(Number(selected.gst_rate))
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </Typography>
      </div>
    </div>
  );
}
