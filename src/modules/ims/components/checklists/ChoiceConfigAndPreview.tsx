import {
  useWatch,
  type Control,
  type UseFormSetValue,
} from "react-hook-form";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";

import { PassFailButton } from "./ChecklistPreviewList";
import { CHECKLISTS_STRINGS } from "./checklists.strings";
import {
  PRESET_SELECT_OPTIONS,
  type UiKind,
  type ChecklistFormShape,
  type ItemErrorMap,
} from "./checklist-items-editor-helpers";

export function ChoiceConfigAndPreview({
  kind,
  uiKind,
  index,
  control,
  setValue,
  errors,
}: {
  kind: "select" | "multi_select";
  uiKind: UiKind;
  index: number;
  control: Control<ChecklistFormShape>;
  setValue: UseFormSetValue<ChecklistFormShape>;
  errors: ItemErrorMap;
}) {
  const options = (useWatch({ control, name: `items.${index}.options` }) ??
    []) as string[];

  // Preset single-select: Pass / Fail / N/A locked, no editor. Renders
  // the same three outlined buttons (icon + semantic text colour) the
  // inspector taps at runtime — same component reused from
  // ChecklistPreviewList so the editor preview and the runtime stay 1:1.
  // Distinct from the radio-dot / checkbox shapes used for Single Select
  // and Multi Select below, so the three answer affordances never read
  // as the same control.
  if (uiKind === "select_preset") {
    // N/A stays in the stored options (the backend only scores the exact
    // Pass/Fail/N/A triplet) but is not offered, matching the run form.
    const toneFor: Record<"Pass" | "Fail", "pass" | "fail"> = { Pass: "pass", Fail: "fail" };
    return (
      <div className="space-y-1.5">
        <Typography asChild variant="caption" className="font-[550] uppercase tracking-[0.06em]">
          <Label>{CHECKLISTS_STRINGS.choiceConfig.optionsLabel}</Label>
        </Typography>
        <div
          role="group"
          aria-label={CHECKLISTS_STRINGS.choiceConfig.passFailAriaLabel}
          className="flex flex-wrap items-center gap-1"
          data-testid={`checklist-item-${index}-preset-options`}
        >
          {PRESET_SELECT_OPTIONS.filter((opt) => opt !== "N/A").map((opt) => (
            <PassFailButton key={opt} tone={toneFor[opt]}>
              {opt}
            </PassFailButton>
          ))}
        </div>
        <Typography asChild variant="helper">
          <p>
            {CHECKLISTS_STRINGS.choiceConfig.fixedOptionsHintPrefix}{" "}
            <span className="font-medium">{CHECKLISTS_STRINGS.choiceConfig.singleSelectKindLabel}</span>{" "}
            {CHECKLISTS_STRINGS.choiceConfig.fixedOptionsHintSuffix}
          </p>
        </Typography>
        {/* The "On fail route to" Repair/Paint options were removed from the
            Pass/Fail type — fail-routing defaults are handled in
            WMS, not configured here. */}
      </div>
    );
  }

  const writeOptions = (next: string[]) =>
    setValue(`items.${index}.options`, next, {
      shouldValidate: true,
      shouldDirty: true,
    });

  const updateAt = (i: number, value: string) => {
    const next = options.slice();
    next[i] = value;
    writeOptions(next);
  };
  const removeAt = (i: number) => {
    const next = options.filter((_, j) => j !== i);
    writeOptions(next.length ? next : [""]);
  };
  const addOption = () => writeOptions([...options, ""]);

  const errorMessage = errors?.options?.message;

  return (
    <div className="space-y-2">
      <Typography asChild variant="caption" className="font-[550] uppercase tracking-[0.06em]">
        <Label>{CHECKLISTS_STRINGS.choiceConfig.optionsLabel}</Label>
      </Typography>

      {/* Tightened row heights (h-8) and gap (1.5) so a 6-option list
          stays around the same height as a 3-option one elsewhere. */}
      <ul className="space-y-1.5" data-testid={`checklist-item-${index}-options`}>
        {(options.length ? options : [""]).map((opt, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span className="text-muted-foreground/60" aria-hidden>
              {kind === "select" ? (
                <span className="block h-3.5 w-3.5 rounded-full border-2 border-current" />
              ) : (
                <span className="block h-3.5 w-3.5 rounded-sm border-2 border-current" />
              )}
            </span>
            <Typography asChild variant="body" tone="inherit">
              <Input
                value={opt}
                onChange={(e) => updateAt(i, e.target.value)}
                placeholder={CHECKLISTS_STRINGS.choiceConfig.optionPlaceholder(i + 1)}
                className="h-8 bg-background"
                aria-label={CHECKLISTS_STRINGS.choiceConfig.optionPlaceholder(i + 1)}
              />
            </Typography>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeAt(i)}
              disabled={options.length <= 1}
              className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive disabled:opacity-30"
              aria-label={CHECKLISTS_STRINGS.choiceConfig.removeOptionAriaLabel(i + 1)}
              title={CHECKLISTS_STRINGS.choiceConfig.removeOptionTitle}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addOption}
        className="h-8"
        data-testid={`checklist-item-${index}-add-option`}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {CHECKLISTS_STRINGS.choiceConfig.addOption}
      </Button>

      {errorMessage && (
        <Typography asChild variant="helper" tone="danger">
          <p>{errorMessage}</p>
        </Typography>
      )}
    </div>
  );
}
