import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import { useNumberField } from "@/hooks/use-number-field";

import { useUpdatePrice } from "../../hooks/parts/usePrice";
import { formatINR } from "../../lib/format";
import { validatePriceInput } from "../../schemas";
import { STOCK_STRINGS } from "./stock.strings";

// Inline-editable variant sell-price cell. Click → number input + Save /
// Cancel icons. Saves through `useUpdatePrice` (audit-logged backend
// endpoint) and busts both the parts list and the variants list query
// keys so any consumer of either list re-renders with the new value.
//
// Used by the Parts table (parent rows with a default variant) and the
// Stock Items table (every row is a variant). Behaviour is identical
// across both surfaces — same validation, same shortcuts (Enter saves,
// Esc cancels), same hover hint.
export function EditablePriceCell({
  variantId,
  value,
}: {
  variantId: string;
  value: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(0);
  const qc = useQueryClient();
  const updatePrice = useUpdatePrice(variantId);

  // Numeric field behaviour (default 0, clear-on-focus, strip leading zeros,
  // 2-decimal guard) comes from the shared hook; the parent owns the `draft`
  // number that gets committed. Bounds ("Too large" / min) stay with the
  // shared validator below rather than a hook clamp, so out-of-range input
  // surfaces the same message as the variant form instead of being silently
  // snapped to a boundary.
  const priceField = useNumberField(draft, setDraft, {
    decimal: true,
    decimals: 2,
  });

  // Shared validator — same five rules + wording as the variant schemas.
  const numericValue = draft;
  const validationError = validatePriceInput(String(draft));
  const isInvalid = validationError != null;

  // The error pill is portaled to <body>: the table wrapper
  // (`.cpt-table-wrap`) sets `overflow: hidden`, which clips any pill that
  // tries to escape the cell. Track the input's viewport rect so the pill
  // can sit just above it, re-measured on scroll / resize.
  const inputRef = useRef<HTMLInputElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    if (!editing || !isInvalid) {
      setAnchorRect(null);
      return;
    }
    const measure = () => {
      const el = inputRef.current;
      if (el) setAnchorRect(el.getBoundingClientRect());
    };
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [editing, isInvalid]);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(value);
    setEditing(true);
  };

  const cancel = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditing(false);
    setDraft(0);
  };

  const save = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    if (isInvalid) return;
    if (numericValue === value) {
      setEditing(false);
      return;
    }
    try {
      await updatePrice.mutateAsync(
        { new_price: numericValue },
        {
          onSuccess: () => {
            // PartsPage embeds variants via include_variants=true on the
            // parts list; StockPage reads /ims/variants directly. Bust
            // both so the edit lands wherever the user is.
            void qc.invalidateQueries({ queryKey: ["ims", "parts"] });
            void qc.invalidateQueries({ queryKey: ["ims", "variants"] });
          },
        },
      );
      setEditing(false);
    } catch {
      // toast already surfaced inside the hook
    }
  };

  if (editing) {
    return (
      <div
        className="inline-flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <Typography
            variant="helper"
            tone={isInvalid ? "danger" : "muted"}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 select-none"
          >
            ₹
          </Typography>
          <Typography asChild variant="body" tone="inherit">
          <Input
            {...priceField}
            ref={inputRef}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void save(e);
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            disabled={updatePrice.isPending}
            aria-invalid={isInvalid || undefined}
            aria-errormessage={isInvalid ? `price-error-${variantId}` : undefined}
            autoFocus
            className={cn(
              "h-8 w-24 bg-background pl-5 pr-2 text-right tabular-nums disabled:opacity-50",
            )}
            aria-label={STOCK_STRINGS.priceCell.newPriceAriaLabel}
          />
          </Typography>
        </div>
        <button
          type="button"
          onClick={(e) => void save(e)}
          disabled={updatePrice.isPending || isInvalid}
          aria-label={STOCK_STRINGS.priceCell.savePriceAriaLabel}
          title={isInvalid ? validationError ?? STOCK_STRINGS.priceCell.invalidFallback : STOCK_STRINGS.priceCell.saveTitle}
          data-testid="price-save-button"
          className="flex h-7 w-7 items-center justify-center rounded-md text-success transition-colors hover:bg-success-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Check className="h-4 w-4" strokeWidth={2.25} />
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={updatePrice.isPending}
          aria-label={STOCK_STRINGS.priceCell.cancelAriaLabel}
          title={STOCK_STRINGS.priceCell.cancelTitle}
          data-testid="price-cancel-button"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50"
        >
          <X className="h-4 w-4" strokeWidth={2.25} />
        </button>
        {isInvalid &&
          anchorRect &&
          createPortal(
            <Typography
              variant="caption"
              tone="inherit"
              id={`price-error-${variantId}`}
              role="alert"
              style={{
                position: "fixed",
                top: anchorRect.top - 6,
                left: anchorRect.left,
                transform: "translateY(-100%)",
              }}
              className="z-[100] whitespace-nowrap rounded bg-destructive px-1.5 py-0.5 font-medium text-destructive-foreground shadow-md"
            >
              {validationError}
            </Typography>,
            document.body,
          )}
      </div>
    );
  }

  // The whole price text is the click target — no separate pencil affordance.
  return (
    <button
      type="button"
      onClick={startEdit}
      title={STOCK_STRINGS.priceCell.editTitle}
      data-testid="price-edit-button"
      className="inline-flex w-full items-center justify-end gap-1 rounded px-1.5 py-0.5 font-medium tabular-nums hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span>{formatINR(value)}</span>
    </button>
  );
}
