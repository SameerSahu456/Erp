import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

import { AsyncSelect } from "@/components/ui/async-select";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { SuggestInput } from "@/components/common/pickers/SuggestInput";
import { Typography } from "@/components/ui/typography";

import type { SpecificationAttributeShort } from "../../api";
import type { SpecEntry } from "../../schemas";
import {
  makeSpecKeyOptionsHook,
  useSpecificationAttributeByName,
} from "../../hooks/specification-attributes/useSpecificationAttributes";
import { SPEC_ATTRIBUTES_STRINGS } from "../specification-attributes/specification-attributes.strings";
import { PARTS_STRINGS } from "./parts.strings";

const S = PARTS_STRINGS.specs;
const E = SPEC_ATTRIBUTES_STRINGS.editor;
const P = SPEC_ATTRIBUTES_STRINGS.picker;

// Value cap mirrors the backend specs bound.
const SPEC_VALUE_MAX = 200;

type RowError = { key?: { message?: string }; value?: { message?: string } };
/** Shape of `formState.errors.spec_entries` the editor reads per row. */
export type SpecRowErrors = ReadonlyArray<RowError | undefined> | undefined;

interface SpecificationsEditorProps {
  entries: SpecEntry[];
  onChange: (entries: SpecEntry[]) => void;
  /** The category's linked specification attributes, in display order.
   *  Only prioritised — listed first in the key dropdown, above the rest of
   *  the master. Rows are never added for them automatically. */
  categoryAttributes?: SpecificationAttributeShort[];
  /** Category name for the "<Category> specifications" grouping hint. */
  categoryName?: string;
  /** Per-row RHF errors (`formState.errors.spec_entries`). */
  rowErrors?: SpecRowErrors;
  /** Names-only mode (the Part picks which attributes apply; the values are
   *  entered per Variant). Hides the value box; rows carry an empty value. */
  valueless?: boolean;
}

export function SpecificationsEditor({
  entries,
  onChange,
  categoryAttributes,
  categoryName,
  rowErrors,
  valueless = false,
}: SpecificationsEditorProps) {
  const attrs = useMemo(() => categoryAttributes ?? [], [categoryAttributes]);

  // Attributes picked from the master during this session, so a picked
  // non-category key still gets its suggested values without a lookup.
  const [picked, setPicked] = useState<Record<string, SpecificationAttributeShort>>({});
  const known = useMemo(() => {
    const map: Record<string, SpecificationAttributeShort> = { ...picked };
    for (const a of attrs) map[a.name.toLowerCase()] = a;
    return map;
  }, [attrs, picked]);

  const useKeyOptions = useMemo(() => makeSpecKeyOptionsHook(attrs), [attrs]);
  const categoryIds = useMemo(() => new Set(attrs.map((a) => a.id)), [attrs]);

  function updateEntry(index: number, patch: Partial<SpecEntry>) {
    onChange(entries.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.length > 0 && (
        <div className="flex flex-col gap-2">
          {entries.map((entry, i) => (
            <SpecRow
              key={i}
              entry={entry}
              index={i}
              usedKeys={entries
                .filter((_, j) => j !== i)
                .map((e) => e.key.toLowerCase())}
              known={known[entry.key.toLowerCase()]}
              useKeyOptions={useKeyOptions}
              categoryIds={categoryIds}
              categoryName={categoryName}
              valueless={valueless}
              error={rowErrors?.[i]}
              onPick={(attr) => {
                setPicked((prev) => ({ ...prev, [attr.name.toLowerCase()]: attr }));
                updateEntry(i, { key: attr.name });
              }}
              onClearKey={() => updateEntry(i, { key: "" })}
              onValueChange={(value) => updateEntry(i, { value })}
              onRemove={() => onChange(entries.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      )}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...entries, { key: "", value: "" }])}
        >
          <Plus className="mr-1.5 size-3.5" />
          {S.addSpecification}
        </Button>
      </div>
    </div>
  );
}

interface SpecRowProps {
  entry: SpecEntry;
  index: number;
  usedKeys: string[];
  known: SpecificationAttributeShort | undefined;
  useKeyOptions: ReturnType<typeof makeSpecKeyOptionsHook>;
  categoryIds: Set<string>;
  categoryName?: string;
  valueless?: boolean;
  error?: RowError;
  onPick: (attr: SpecificationAttributeShort) => void;
  onClearKey: () => void;
  onValueChange: (value: string) => void;
  onRemove: () => void;
}

function SpecRow({
  entry,
  index,
  usedKeys,
  known,
  useKeyOptions,
  categoryIds,
  categoryName,
  valueless = false,
  error,
  onPick,
  onClearKey,
  onValueChange,
  onRemove,
}: SpecRowProps) {
  // A key that isn't on the category and wasn't picked this session (e.g. an
  // existing variant's spec) is looked up in the master by name — for its
  // suggested values, and to flag keys the master doesn't have.
  const lookup = useSpecificationAttributeByName(entry.key, !!entry.key && !known);
  const attribute = known ?? lookup.data ?? undefined;
  const unknownKey = !!entry.key && !known && lookup.isSuccess && lookup.data === null;

  const keyId = `spec-key-${index}`;
  const valueId = `spec-value-${index}`;
  const keyMessage = unknownKey ? E.unknownKey(entry.key) : error?.key?.message;

  return (
    <div className="flex flex-col gap-1">
      <div
        className={
          valueless
            ? "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2"
            : "grid grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] items-start gap-2"
        }
      >
        <div aria-invalid={keyMessage ? true : undefined} className="min-w-0">
          <AsyncSelect
            id={keyId}
            value={entry.key ? { id: entry.key, label: entry.key } : null}
            onValueChange={(v) => {
              if (!v) onClearKey();
            }}
            onItemPick={onPick}
            useOptions={useKeyOptions}
            toLabel={(a) => a.name}
            loadOnOpen
            placeholder={E.keyPlaceholder}
            searchPlaceholder={P.searchPlaceholder}
            className={
              keyMessage
                ? "h-10 w-full border-destructive ring-3 ring-destructive/20"
                : "h-10 w-full"
            }
            chevron="down"
            isItemDisabled={(a) => usedKeys.includes(a.name.toLowerCase())}
            renderItem={(a) => (
              <span className="flex w-full min-w-0 items-center justify-between gap-2">
                <Typography asChild variant="body">
                  <span className="min-w-0 truncate">{a.name}</span>
                </Typography>
                {categoryName && categoryIds.has(a.id) && (
                  <Typography variant="helper" className="shrink-0">
                    {categoryName}
                  </Typography>
                )}
              </span>
            )}
          />
          </div>
        {!valueless && (
          <SuggestInput
            id={valueId}
            value={entry.value}
            onChange={onValueChange}
            suggestions={attribute?.values ?? []}
            placeholder={E.valuePlaceholder}
            ariaLabel={E.valuePlaceholder}
            maxLength={SPEC_VALUE_MAX}
            invalid={!!error?.value?.message}
          />
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-10 w-9 p-0 text-muted-foreground hover:text-destructive"
          aria-label={S.removeSpecAriaLabel}
        >
          <X className="size-4" />
        </Button>
      </div>
      {attribute && !attribute.is_active && (
        <div>
          <StatusBadge variant="neutral">{P.inactiveBadge}</StatusBadge>
        </div>
      )}
      {(keyMessage || error?.value?.message) && (
        <Typography variant="caption" tone="danger" role="alert">
          {keyMessage ?? error?.value?.message}
        </Typography>
      )}
    </div>
  );
}
