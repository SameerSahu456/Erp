import { ArrowDown, ArrowUp, X } from "lucide-react";

import { AsyncMultiSelect, type AsyncOption } from "@/components/ui/async-multi-select";
import { Button } from "@/components/ui/button";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import { Typography } from "@/components/ui/typography";

import { useSpecificationAttributeOptions } from "../../hooks/specification-attributes/useSpecificationAttributes";
import { SPEC_ATTRIBUTES_STRINGS } from "./specification-attributes.strings";

const P = SPEC_ATTRIBUTES_STRINGS.picker;

interface SpecAttributesPickerProps {
  /** Picked attributes as `{id, label}`, in display order. */
  value: AsyncOption[];
  onChange: (next: AsyncOption[]) => void;
  id?: string;
}

/**
 * Category form picker for the category's specification attributes.
 *
 * The shared `AsyncMultiSelect` does the picking (server-searched, scroll-
 * loaded, active attributes only). Order matters — it's the order the
 * attributes are prefilled and listed on the category's parts and variants —
 * so the picked set renders below as an ordered list with move up / down and
 * remove controls. New picks append to the end.
 */
export function SpecAttributesPicker({ value, onChange, id }: SpecAttributesPickerProps) {
  function move(index: number, delta: -1 | 1) {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <div id={id}>
        <AsyncMultiSelect
          value={value}
          onValueChange={onChange}
          useOptions={useSpecificationAttributeOptions}
          toLabel={(a) => a.name}
          placeholder={P.searchPlaceholder}
          loadOnOpen
        />
      </div>
      {value.length === 0 ? (
        <Typography variant="helper">{P.categoryNone}</Typography>
      ) : (
        <ol className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-lg border bg-muted/20 p-1.5">
          {value.map((opt, i) => (
            <li
              key={opt.id}
              className="flex items-center gap-2 rounded-md bg-card px-2 py-1 shadow-xs"
            >
              <Typography variant="caption" tone="muted" className="w-5 shrink-0 tabular-nums">
                {i + 1}
              </Typography>
              <Typography asChild variant="body">
                <span className="min-w-0 flex-1">
                  <TruncatedText value={opt.label} />
                </span>
              </Typography>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-8 shrink-0 p-0 text-muted-foreground"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={P.moveUpAriaLabel(opt.label)}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-8 shrink-0 p-0 text-muted-foreground"
                onClick={() => move(i, 1)}
                disabled={i === value.length - 1}
                aria-label={P.moveDownAriaLabel(opt.label)}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => onChange(value.filter((o) => o.id !== opt.id))}
                aria-label={P.removeAriaLabel(opt.label)}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
