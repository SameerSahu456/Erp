import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { TablePagination } from "@/components/common/tables/TablePagination";
import type { PartVariant } from "../../api";
import { formatINR } from "../../lib/format";
import { SR_NO_TD_CLASS, SR_NO_TH_CLASS } from "../../lib/sr-no";
import { PARTS_STRINGS } from "./parts.strings";

const SV = PARTS_STRINGS.variants;

export function VariantsTab({
  partName,
  partId,
  variants,
  variantsTotal,
  variantsPage,
  variantsPageSize,
  variantsTotalPages,
  variantsFetching,
  search,
  onSearchChange,
  onPageChange,
  onPageSizeChange,
  onAddVariant,
  onEditVariant,
  onDeleteVariant,
  onOpenVariant,
  deletePending,
  canWrite,
}: {
  partName: string;
  partId: string;
  variants: PartVariant[];
  variantsTotal: number;
  variantsPage: number;
  variantsPageSize: number;
  variantsTotalPages: number;
  variantsFetching: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onPageChange: (p: number) => void;
  onPageSizeChange: (size: number) => void;
  onAddVariant: () => void;
  onEditVariant: (v: PartVariant) => void;
  onDeleteVariant: (v: PartVariant) => void;
  onOpenVariant: (id: string) => void;
  deletePending: boolean;
  /** Hides Add / Edit / Delete buttons for `ims:read` users. */
  canWrite: boolean;
}) {
  void partId;
  void partName;

  // Client-side search on the visible page — `useVariantsPage` doesn't
  // accept a server-side search param. The filter narrows what's
  // rendered, but pagination + total still reflect the unfiltered
  // backend count. Good enough for typical variant counts; revisit if
  // a part regularly has 100+ variants.
  const q = search.trim().toLowerCase();
  const filteredVariants = q
    ? variants.filter((v) => {
        const sku = (v.sku_code ?? "").toLowerCase();
        const name = (v.name ?? "").toLowerCase();
        const description = (v.description ?? "").toLowerCase();
        return sku.includes(q) || name.includes(q) || description.includes(q);
      })
    : variants;

  const conditionMeta: Record<
    string,
    { label: string; variant: "success" | "info" | "warning" }
  > = {
    new: { label: "New", variant: "success" },
    refurbished: { label: "Refurbished", variant: "info" },
    new_pull: { label: "New Pull", variant: "warning" },
  };

  return (
    <div className="space-y-3">
      {/* Variant count removed per product request — the parent tab
          header already shows "Variants (N)" so it was redundant.
          When the user is read-only and the Add button is also gone,
          we hide the whole bar to avoid an empty vertical gap. */}
      {canWrite && (
        <div className="flex items-baseline justify-end">
          <Button size="sm" variant="outline" onClick={onAddVariant}>
            <Plus className="mr-1 size-3.5" />
            {SV.addVariant}
          </Button>
        </div>
      )}

      {variants.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={SV.searchPlaceholder}
            className="h-9 pl-8"
          />
        </div>
      )}

      {variants.length === 0 ? (
        <div className="rounded-md border p-8 text-center">
          <Typography variant="body-strong">{SV.noVariantsTitle}</Typography>
          <Typography asChild variant="helper" className="mt-1">
            <p>{SV.noVariantsHelper}</p>
          </Typography>
        </div>
      ) : filteredVariants.length === 0 ? (
        <div className="rounded-md border p-8 text-center">
          <Typography variant="body-strong">
            {SV.noMatchTitle(search)}
          </Typography>
          <Typography asChild variant="helper" className="mt-1">
            <p>{SV.noMatchHelper}</p>
          </Typography>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            {/* See stock-items table above for `cpt-tbl` rationale. */}
            <table className="cpt-tbl min-w-full">
              <thead>
                <Typography asChild variant="caption">
                <tr className="border-b bg-muted/40 uppercase tracking-wider">
                  <th className={SR_NO_TH_CLASS}>{SV.columns.srNo}</th>
                  <th className="px-3 py-1.5 text-left font-medium">
                    {SV.columns.variant}
                  </th>
                  <th className="px-3 py-1.5 text-left font-medium">
                    {SV.columns.sku}
                  </th>
                  <th className="px-3 py-1.5 text-left font-medium">
                    {SV.columns.condition}
                  </th>
                  {/* `right` (cpt-tbl convention) instead of Tailwind's
                      `text-right` — the .cpt-tbl thead th rule in
                      comprint.css force-aligns headers left, beating the
                      utility on cascade. `right` is the project-wide
                      escape hatch and also adds tabular-nums. */}
                  <th className="right px-3 py-1.5 font-medium">
                    {SV.columns.price}
                  </th>
                  <th
                    className="w-px px-3 py-1.5"
                    aria-label={SV.actionsAriaLabel}
                  />
                </tr>
                </Typography>
              </thead>
              <tbody>
                {filteredVariants.map((v, idx) => {
                  const cond = conditionMeta[v.condition ?? "new"] ?? {
                    label: v.condition ?? "—",
                    variant: "info" as const,
                  };
                  return (
                    <tr
                      key={v.id}
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                      onClick={() => onOpenVariant(v.id)}
                    >
                      {/* Absolute row index across pages. */}
                      <td
                        className={SR_NO_TD_CLASS}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {(variantsPage - 1) * variantsPageSize + idx + 1}
                      </td>
                      <td className="px-3 py-1.5 font-medium">{v.name}</td>
                      <Typography asChild variant="helper">
                        <td className="px-3 py-1.5 font-mono">
                          {v.sku_code ?? "—"}
                        </td>
                      </Typography>
                      <td className="px-3 py-1.5">
                        <StatusBadge variant={cond.variant}>
                          {cond.label}
                        </StatusBadge>
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {v.sell_price != null
                          ? formatINR(Number(v.sell_price))
                          : "—"}
                      </td>
                      <td
                        className="px-3 py-1.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canWrite && (
                          <div className="inline-flex gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditVariant(v)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              aria-label={`Edit ${v.name}`}
                              title={SV.tooltips.editVariant}
                              data-testid="variant-edit-button"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteVariant(v)}
                              disabled={deletePending}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              aria-label={`Delete ${v.name}`}
                              title={SV.tooltips.deleteVariant}
                              data-testid="variant-delete-button"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={variantsPage}
            totalPages={variantsTotalPages}
            pageSize={variantsPageSize}
            total={variantsTotal}
            isFetching={variantsFetching}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}
    </div>
  );
}
