import { Check, ListChecks, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";

import type { ChecklistItem } from "../../api";
import { CHECKLISTS_STRINGS } from "./checklists.strings";

// ─── Pass / Fail / N/A preset ───────────────────────────────────────────────
//
// A `select` item whose options are exactly Pass / Fail / N/A renders as a
// 3-button segmented row mirroring the runtime QC dialog (idle state). The
// affordance difference (real <Button>s vs radio dots vs checkboxes) lets
// the operator distinguish three kinds of selectors at a glance during the
// preview:
//   - Pass / Fail / N/A  → tappable outlined buttons (semantic text colour)
//   - Single-select (custom) → radio dots
//   - Multi-select            → checkboxes
// All three serialise the same way server-side (kind="select" / "multi_select"
// + options=[…]). The visual difference exists for the human reading the
// preview, not the payload.
//
// We deliberately show the *idle* state of the runtime button — outline,
// semantic text colour, neutral border — because that is exactly what the
// inspector will see before they tap. Tinted-fill chips read as "already
// answered"; outlined buttons read as "tap me".

const PASS_FAIL_PRESET = ["Pass", "Fail", "N/A"] as const;

function isPassFailPreset(options: string[]): boolean {
  return (
    options.length === 3 &&
    options[0] === PASS_FAIL_PRESET[0] &&
    options[1] === PASS_FAIL_PRESET[1] &&
    options[2] === PASS_FAIL_PRESET[2]
  );
}

export function PassFailButton({
  tone,
  children,
}: {
  tone: "pass" | "fail";
  children: React.ReactNode;
}) {
  const Icon = tone === "pass" ? Check : X;
  // Idle-state styling:
  //   - Pass: emerald text, faint emerald border tint over the neutral base
  //   - Fail: rose  text, faint rose border tint
  // Preview is read-only, so we disable the button but force `opacity-100`
  // — the rest state should *look* live; the disabled cursor is the only
  // tell that the preview can't be tapped.
  const tones: Record<"pass" | "fail", string> = {
    pass: "border-success/40 text-success hover:bg-success-soft hover:border-success/60",
    fail: "border-destructive/40 text-destructive hover:bg-destructive-soft hover:border-destructive/60",
  };
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled
      className={`h-8 gap-1.5 bg-background px-3 font-medium disabled:cursor-default disabled:opacity-100 ${tones[tone]}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span>{children}</span>
    </Button>
  );
}

/**
 * Renders the saved checklist items the way the inspector sees them at
 * runtime. All controls are disabled — this is a read-only preview.
 * Shared between the IMS Preview dialog and the full-page WMS preview.
 */
export function ChecklistPreviewList({ items }: { items: ChecklistItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title={CHECKLISTS_STRINGS.previewList.empty.title}
        description={CHECKLISTS_STRINGS.previewList.empty.description}
      />
    );
  }
  // Single bordered container with divide-y rows — reads as one
  // continuous list, not N stacked cards. Per-row padding is
  // intentionally tight so long checklists stay scannable. A faint hover
  // tint makes the active row easy to track on a fast scroll.
  return (
    <div className="overflow-hidden rounded-lg border bg-card divide-y">
      {items.map((item, idx) => (
        <PreviewItem key={item.key ?? idx} index={idx} item={item} />
      ))}
    </div>
  );
}

function PreviewItem({ index, item }: { index: number; item: ChecklistItem }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
      {/* Index gutter — zero-padded to 2 chars so single-digit and
          double-digit indices left-align cleanly all the way down a
          long list. Fixed width keeps the labels in a single column. */}
      <Typography
        variant="helper"
        tone="muted"
        className="mt-0.5 w-6 shrink-0 font-medium tabular-nums"
      >
        {(index + 1).toString().padStart(2, "0")}
      </Typography>
      <div className="min-w-0 flex-1 space-y-1.5">
        <Typography asChild variant="body" className="font-medium leading-snug">
          <div>
            {item.label}
            {item.required && (
              <span className="ml-1 text-destructive" aria-label={CHECKLISTS_STRINGS.previewList.requiredAriaLabel}>
                *
              </span>
            )}
          </div>
        </Typography>
        {item.notes && (
          <Typography asChild variant="helper" tone="muted" className="leading-snug">
            <p>{item.notes}</p>
          </Typography>
        )}
        <div>
          <KindPreview item={item} />
        </div>
        <KindMeta item={item} />
      </div>
    </div>
  );
}

function KindPreview({ item }: { item: ChecklistItem }) {
  if (item.kind === "boolean") {
    return (
      <RadioGroup className="flex gap-4" disabled>
        <Typography asChild variant="body" className="flex items-center gap-2">
          <label>
            <RadioGroupItem value="yes" disabled />
            {CHECKLISTS_STRINGS.previewList.yes}
          </label>
        </Typography>
        <Typography asChild variant="body" className="flex items-center gap-2">
          <label>
            <RadioGroupItem value="no" disabled />
            {CHECKLISTS_STRINGS.previewList.no}
          </label>
        </Typography>
      </RadioGroup>
    );
  }
  if (item.kind === "text") {
    return (
      <Textarea
        maxLength={500}
        rows={2}
        disabled
        placeholder={
          item.required ? CHECKLISTS_STRINGS.previewList.textRequiredPlaceholder : CHECKLISTS_STRINGS.previewList.textOptionalPlaceholder
        }
        className="resize-none bg-background"
      />
    );
  }
  if (item.kind === "numeric") {
    return (
      <Input
        type="number"
        disabled
        step={item.integer_only ? "1" : "any"}
        placeholder={
          item.required
            ? CHECKLISTS_STRINGS.previewList.numericRequiredPlaceholder
            : CHECKLISTS_STRINGS.previewList.numericOptionalPlaceholder
        }
        className="bg-background"
      />
    );
  }
  if (item.kind === "select") {
    const options = (item.options ?? []).filter(Boolean);
    if (options.length < 2) {
      return (
        <Typography asChild variant="helper" tone="muted" className="italic">
          <p>{CHECKLISTS_STRINGS.previewList.noOptionsText}</p>
        </Typography>
      );
    }
    // Pass / Fail / N/A preset renders as a Pass + Fail button row (N/A is
    // stored but not offered — the run form shows only Pass/Fail) with
    // semantic tint — distinct from a Custom single-select (radio dots
    // below) so the operator never has to read the labels to tell the
    // two apart in the preview.
    if (isPassFailPreset(options)) {
      // Tight `gap-1` matches the runtime QC dialog's button cluster — the
      // three verdicts read as one tri-state control, not three separate
      // chips.
      return (
        <div
          role="group"
          aria-label={CHECKLISTS_STRINGS.previewList.passFailAriaLabel}
          className="flex flex-wrap items-center gap-1"
        >
          <PassFailButton tone="pass">{CHECKLISTS_STRINGS.previewList.pass}</PassFailButton>
          <PassFailButton tone="fail">{CHECKLISTS_STRINGS.previewList.fail}</PassFailButton>
        </div>
      );
    }
    // Custom single-select — wrap-flow radio dots. Each label keeps its
    // natural width (`whitespace-nowrap`), so short options pack 3-4
    // per row and longer labels wrap to fewer. Content-driven, not
    // breakpoint-driven, so it scales with both screen size and text
    // length.
    return (
      <RadioGroup className="flex flex-wrap gap-x-4 gap-y-2" disabled>
        {options.map((opt) => (
          <Typography
            key={opt}
            asChild
            variant="body"
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <label>
              <RadioGroupItem value={opt} disabled />
              {opt}
            </label>
          </Typography>
        ))}
      </RadioGroup>
    );
  }
  if (item.kind === "multi_select") {
    const options = (item.options ?? []).filter(Boolean);
    if (options.length < 2) {
      return (
        <Typography asChild variant="helper" tone="muted" className="italic">
          <p>{CHECKLISTS_STRINGS.previewList.noOptionsText}</p>
        </Typography>
      );
    }
    // Same wrap-flow pattern as single-select.
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {options.map((opt) => (
          <Typography
            key={opt}
            asChild
            variant="body"
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <label>
              <Checkbox checked={false} disabled aria-label={opt} />
              {opt}
            </label>
          </Typography>
        ))}
      </div>
    );
  }
  if (item.kind === "photo") {
    // Compact dropzone — same shape as runtime AttachmentsPanel
    // (icon + headline + limits), tightened vertically so it doesn't
    // dominate a long list. Read-only; no file picker wired.
    return (
      <div
        className="flex flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-muted-foreground/30 bg-background px-4 py-5 text-center"
        role="presentation"
        aria-label={CHECKLISTS_STRINGS.previewList.photoUploadAriaLabel}
      >
        <Upload className="h-4 w-4 text-muted-foreground" aria-hidden />
        <Typography asChild variant="body" className="font-medium">
          <p>{CHECKLISTS_STRINGS.previewList.photoDropLabel}</p>
        </Typography>
        <Typography asChild variant="caption" tone="muted">
          <p>{CHECKLISTS_STRINGS.previewList.photoLimits}</p>
        </Typography>
      </div>
    );
  }
  return null;
}

function KindMeta({ item }: { item: ChecklistItem }) {
  const bits: string[] = [];
  if (item.kind === "text") {
    if (item.min_length != null) bits.push(`min ${item.min_length} chars`);
    if (item.max_length != null) bits.push(`max ${item.max_length} chars`);
  }
  if (item.kind === "numeric") {
    if (item.min_value != null) bits.push(`min ${item.min_value}`);
    if (item.max_value != null) bits.push(`max ${item.max_value}`);
    if (item.integer_only) bits.push("whole numbers only");
  }
  if (item.kind === "multi_select") {
    if (item.min_choices != null) bits.push(`min ${item.min_choices} choices`);
    if (item.max_choices != null) bits.push(`max ${item.max_choices} choices`);
  }
  if (item.kind === "photo") {
    if (item.min_photos != null) bits.push(`min ${item.min_photos} photos`);
    if (item.max_photos != null) bits.push(`max ${item.max_photos} photos`);
  }
  if (bits.length === 0) return null;
  return (
    <Typography asChild variant="caption">
      <p>{bits.join(" · ")}</p>
    </Typography>
  );
}
