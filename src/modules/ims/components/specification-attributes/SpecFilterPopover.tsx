import { useState } from "react";
import { Plus, SlidersHorizontal, X } from "lucide-react";

import { AsyncSelect } from "@/components/ui/async-select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SuggestInput } from "@/components/common/pickers/SuggestInput";
import { Typography } from "@/components/ui/typography";

import type { SpecificationAttributeShort } from "../../api";
import {
  useSpecificationAttributeByName,
  useSpecificationAttributeOptions,
} from "../../hooks/specification-attributes/useSpecificationAttributes";
import { SPEC_ATTRIBUTES_STRINGS } from "./specification-attributes.strings";
import { MAX_SPEC_CONDITIONS } from "./spec-filter";

const FS = SPEC_ATTRIBUTES_STRINGS.filter;
const P = SPEC_ATTRIBUTES_STRINGS.picker;

type Row = { key: string; value: string };

interface SpecFilterPopoverProps {
  value: Record<string, string>;
  onApply: (next: Record<string, string>) => void;
}

/** "Specifications" filter for the variants list: AND-ed name = value rows. */
export function SpecFilterPopover({ value, onApply }: SpecFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const count = Object.keys(value).length;

  function openWith(next: boolean) {
    if (next) {
      const current = Object.entries(value).map(([key, v]) => ({ key, value: v }));
      setRows(current.length ? current : [{ key: "", value: "" }]);
    }
    setOpen(next);
  }

  function apply(nextRows: Row[]) {
    const specs: Record<string, string> = {};
    for (const r of nextRows) {
      if (r.key.trim() && r.value.trim()) specs[r.key.trim()] = r.value.trim();
    }
    onApply(specs);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={openWith}>
      <PopoverTrigger render={<Button variant="outline" />}>
        <SlidersHorizontal className="mr-1.5 size-4" />
        {count ? FS.buttonCount(count) : FS.button}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(32rem,calc(100vw-2rem))] p-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <Typography variant="card-title">{FS.heading}</Typography>
            <Typography variant="helper">{FS.helper}</Typography>
          </div>
          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {rows.map((row, i) => (
              <FilterRow
                key={i}
                row={row}
                usedKeys={rows.filter((_, j) => j !== i).map((r) => r.key.toLowerCase())}
                onChange={(patch) =>
                  setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)))
                }
                onRemove={() => setRows((prev) => prev.filter((_, j) => j !== i))}
              />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRows((prev) => [...prev, { key: "", value: "" }])}
              disabled={rows.length >= MAX_SPEC_CONDITIONS}
            >
              <Plus className="mr-1.5 size-4" />
              {FS.addRow}
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => apply([])}>
                {FS.clear}
              </Button>
              <Button type="button" size="sm" onClick={() => apply(rows)}>
                {FS.apply}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilterRow({
  row,
  usedKeys,
  onChange,
  onRemove,
}: {
  row: Row;
  usedKeys: string[];
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const [picked, setPicked] = useState<SpecificationAttributeShort | null>(null);
  // Rows restored from the URL only carry the name — look the attribute up
  // for its suggested values.
  const lookup = useSpecificationAttributeByName(row.key, !!row.key && picked?.name !== row.key);
  const attribute = picked?.name === row.key ? picked : lookup.data;

  return (
    <div className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] items-center gap-2">
      <AsyncSelect
        value={row.key ? { id: row.key, label: row.key } : null}
        onValueChange={(v) => {
          if (!v) onChange({ key: "" });
        }}
        onItemPick={(a) => {
          setPicked(a);
          onChange({ key: a.name });
        }}
        useOptions={useSpecificationAttributeOptions}
        toLabel={(a) => a.name}
        loadOnOpen
        placeholder={SPEC_ATTRIBUTES_STRINGS.editor.keyPlaceholder}
        searchPlaceholder={P.searchPlaceholder}
        className="h-10 w-full"
        chevron="down"
        isItemDisabled={(a) => usedKeys.includes(a.name.toLowerCase())}
      />
      <SuggestInput
        value={row.value}
        onChange={(v) => onChange({ value: v })}
        suggestions={attribute?.values ?? []}
        placeholder={FS.valuePlaceholder}
        ariaLabel={FS.valuePlaceholder}
        maxLength={200}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-10 w-9 p-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        aria-label={P.removeAriaLabel(row.key || FS.valuePlaceholder)}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
