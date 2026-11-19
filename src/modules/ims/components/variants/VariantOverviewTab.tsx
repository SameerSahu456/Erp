import { Typography } from "@/components/ui/typography";
import { OverflowPillList } from "@/components/common/display/OverflowPillList";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { AttachmentsPanel } from "@/shared/components/AttachmentsPanel";
import { formatINR } from "../../lib/format";
import { VARIANTS_STRINGS } from "./variants.strings";

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

export function OverviewTab({
  variantId,
  description,
  specs,
  aliasChips,
  skuCode,
  conditionLabel,
  conditionVariant,
  isActive,
  sellPrice,
  hsnCode,
}: {
  variantId: string;
  description: string | null | undefined;
  specs: Record<string, string> | null;
  aliasChips: string[];
  skuCode: string | null | undefined;
  conditionLabel: string;
  conditionVariant: "success" | "info" | "warning";
  isActive: boolean;
  // Decimal serializes as a STRING on the wire (precision-safe for INR), so
  // this accepts both; the render path already coerces with Number().
  // `undefined` is the redacted shape — the backend omits `sell_price`
  // entirely for callers without `ims:price_read`, and the render guard
  // below hides the field rather than showing a blank.
  sellPrice: string | number | null | undefined;
  hsnCode: string | null | undefined;
}) {
  return (
    <div className="space-y-6">
      {/* Media — gallery sourced from the attachments API. Empty state shows
          the dropzone; once there's at least one image the panel exposes an
          "Upload media" button anchored at the top-right of the section
          (sharing a row with the heading) so the operator can add more
          without going into the edit form. */}
      <AttachmentsPanel
        entityType="ims_part_variant"
        entityId={variantId}
        title={VARIANTS_STRINGS.overview.mediaTitle}
      />

      {description && (
        <div className="min-w-0">
          <Typography asChild variant="body-strong" className="mb-1">
            <h3>{VARIANTS_STRINGS.overview.descriptionHeading}</h3>
          </Typography>
          {/* break-words so a long unbroken description string wraps instead of
              overflowing the overview column and overlapping the Variant Info
              card (§8.7). */}
          <Typography variant="body" tone="muted" className="break-words">
            {description}
          </Typography>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Typography asChild variant="body-strong" className="mb-2">
            <h3>{VARIANTS_STRINGS.overview.specificationsHeading}</h3>
          </Typography>
          <div className="rounded-md border">
            {specs && Object.keys(specs).length > 0 ? (
              <Typography asChild variant="helper" tone="default">
                <dl className="divide-y">
                {Object.entries(specs).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-start justify-between gap-3 px-2.5 py-1.5"
                  >
                    <dt className="font-medium text-muted-foreground">{key}</dt>
                    <dd className="text-right">{String(value)}</dd>
                  </div>
                ))}
                </dl>
              </Typography>
            ) : (
              <Typography asChild variant="helper">
                <p className="px-2.5 py-3">
                  {VARIANTS_STRINGS.overview.noSpecsRecorded}
                </p>
              </Typography>
            )}
          </div>
        </div>

        <div>
          <Typography asChild variant="body-strong" className="mb-2">
            <h3>{VARIANTS_STRINGS.overview.additionalInfoHeading}</h3>
          </Typography>
          <div className="rounded-md border">
            <Typography asChild variant="helper" tone="default">
              <dl className="divide-y">
              {aliasChips.length > 0 && (
                <div className="flex items-start justify-between gap-3 px-2.5 py-1.5">
                  <dt className="font-medium text-muted-foreground">
                    {VARIANTS_STRINGS.overview.aliasLabel}
                  </dt>
                  <dd>
                    <OverflowPillList
                      items={aliasChips}
                      getItemKey={(a) => a}
                      getItemLabel={(a) => a}
                      summaryLabel={
                        VARIANTS_STRINGS.overview.aliasesSummaryLabel
                      }
                      hoverTitle={VARIANTS_STRINGS.overview.aliasesHoverTitle}
                    />
                  </dd>
                </div>
              )}
              <div className="flex items-start justify-between gap-3 px-2.5 py-1.5">
                <dt className="font-medium text-muted-foreground">
                  {VARIANTS_STRINGS.overview.skuCodeLabel}
                </dt>
                <dd className="font-mono font-medium">
                  {skuCode ?? "\u2014"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 px-2.5 py-1.5">
                <dt className="font-medium text-muted-foreground">
                  {VARIANTS_STRINGS.overview.conditionLabel}
                </dt>
                <dd>
                  <StatusBadge variant={conditionVariant}>
                    {conditionLabel}
                  </StatusBadge>
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 px-2.5 py-1.5">
                <dt className="font-medium text-muted-foreground">
                  {VARIANTS_STRINGS.overview.statusLabel}
                </dt>
                <dd>
                  <StatusBadge variant={isActive ? "success" : "neutral"}>
                    {isActive
                      ? VARIANTS_STRINGS.overview.active
                      : VARIANTS_STRINGS.overview.inactive}
                  </StatusBadge>
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 px-2.5 py-1.5">
                <dt className="font-medium text-muted-foreground">
                  {VARIANTS_STRINGS.overview.hsnCodeLabel}
                </dt>
                <dd className="font-medium">{hsnCode ?? "\u2014"}</dd>
              </div>
              {sellPrice != null && (
                <div className="flex items-start justify-between gap-3 px-2.5 py-1.5">
                  <dt className="font-medium text-muted-foreground">
                    {VARIANTS_STRINGS.overview.priceLabel}
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {formatINR(Number(sellPrice))}
                  </dd>
                </div>
              )}
              </dl>
            </Typography>
          </div>
        </div>
      </div>
    </div>
  );
}
