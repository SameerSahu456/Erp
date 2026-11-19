import type { UseFormReturn } from "react-hook-form";
import { Loader2 } from "lucide-react";

import {
  AsyncSelect,
  type AsyncQueryShape,
  type AsyncSelectOption,
} from "@/components/ui/async-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FieldError } from "@/components/common/forms/FieldError";

import { type VariantListItem, partOptionDescription } from "@modules/ims";
import type { POExpectedLine } from "../../../api";
import type { RelinkPoItemInput } from "../../../schemas";
import { relinkLineLabel } from "./relink-po-item-helpers";
import { DEVICE_IDENTITY_STRINGS as S } from "./device-identity.strings";

interface RelinkFooterProps {
  requestClose: () => void;
  isPending: boolean;
  noLines: boolean;
  blockReason: string | null;
  onSubmit: () => void;
}

export function RelinkPoItemFooter(p: RelinkFooterProps) {
  return (
    <>
      <Button variant="outline" onClick={p.requestClose} disabled={p.isPending}>
        {S.common.cancel}
      </Button>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Button onClick={p.onSubmit} disabled={p.isPending || p.noLines}>
              {p.isPending && (
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              )}
              {p.isPending ? S.common.saving : S.relink.submit}
            </Button>
          </TooltipTrigger>
          {p.blockReason && !p.isPending && (
            <TooltipContent>{p.blockReason}</TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </>
  );
}

interface RelinkLineFieldProps {
  lines: POExpectedLine[];
  selectedLineId: string;
  selectedLine: POExpectedLine | undefined;
  onSelectLine: (next: string | null) => void;
  form: UseFormReturn<RelinkPoItemInput>;
}

export function RelinkLineField(p: RelinkLineFieldProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor="relink_line" required>
        {S.relink.lineLabel}
      </Label>
      <Select value={p.selectedLineId || undefined} onValueChange={p.onSelectLine}>
        <SelectTrigger id="relink_line" className="w-full">
          {/* Show the line's label, never its raw id (PAGE-UI §7.2). */}
          <SelectValue placeholder={S.relink.linePlaceholder}>
            {p.selectedLine ? relinkLineLabel(p.selectedLine) : S.relink.linePlaceholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {p.lines.map((l) => (
            <SelectItem key={l.source_line_entity_id} value={l.source_line_entity_id}>
              <span className="block min-w-0 truncate">{relinkLineLabel(l)}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError message={p.form.formState.errors.purchase_order_item_id?.message} />
      <Typography variant="helper" tone="muted">
        {S.relink.sameOrderHint}
      </Typography>
    </div>
  );
}

interface RelinkVariantFieldProps {
  value: AsyncSelectOption | null;
  onValueChange: (next: AsyncSelectOption | null) => void;
  useOptions: (
    search: string,
    options?: { enabled?: boolean },
  ) => AsyncQueryShape<VariantListItem>;
}

export function RelinkVariantField(p: RelinkVariantFieldProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor="relink_variant" required>
        {S.relink.variantLabel}
      </Label>
      <AsyncSelect<VariantListItem>
        id="relink_variant"
        value={p.value}
        onValueChange={p.onValueChange}
        useOptions={p.useOptions}
        toLabel={(v) => v.display_title || `${v.part_number} · ${v.name}`}
        getDescription={partOptionDescription}
        placeholder={S.relink.variantPlaceholder}
        searchPlaceholder={S.relink.variantSearchPlaceholder}
        clearable
        chevron="down"
        loadOnOpen
      />
      <Typography variant="helper" tone="muted">
        {S.relink.variantHint}
      </Typography>
    </div>
  );
}
