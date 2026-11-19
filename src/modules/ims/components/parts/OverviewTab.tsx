import { Typography } from "@/components/ui/typography";
import { OverflowPillList } from "@/components/common/display/OverflowPillList";
import { AttachmentsPanel } from "@/shared/components/AttachmentsPanel";
import { uomLabel } from "../../uom";
import { PARTS_STRINGS } from "./parts.strings";

const SO = PARTS_STRINGS.overview;

export function OverviewTab({
  partId,
  description,
  specs,
  aliasChips,
  uom,
  brand,
  modelName,
  hsnCode,
}: {
  partId: string;
  description: string | null | undefined;
  specs: Record<string, string> | null;
  aliasChips: string[];
  uom: string | undefined;
  brand: string | null;
  modelName: string;
  hsnCode: string | null;
}) {
  return (
    <div className="space-y-6">
      {/* Media — gallery sourced from the attachments API. Empty state shows
          the dropzone; once there's at least one image the panel exposes an
          "Upload media" button anchored at the top-right of the section
          (sharing a row with the heading) so the operator can add more
          without going into the edit form. */}
      <AttachmentsPanel
        entityType="ims_part"
        entityId={partId}
        title={SO.mediaTitle}
      />

      {/* Description */}
      {description && (
        <div>
          <Typography asChild variant="body-strong" className="mb-1">
            <h3>{SO.descriptionHeading}</h3>
          </Typography>
          <Typography variant="body" tone="muted">
            {description}
          </Typography>
        </div>
      )}

      {/* Specifications + Additional Info side-by-side */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Typography asChild variant="body-strong" className="mb-2">
            <h3>{SO.specificationsHeading}</h3>
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
                <p className="px-2.5 py-3">{SO.noSpecificationsRecorded}</p>
              </Typography>
            )}
          </div>
        </div>

        <div>
          <Typography asChild variant="body-strong" className="mb-2">
            <h3>{SO.additionalInfoHeading}</h3>
          </Typography>
          <div className="rounded-md border">
            <Typography asChild variant="helper" tone="default">
              <dl className="divide-y">
              {aliasChips.length > 0 && (
                <div className="flex items-start justify-between gap-3 px-2.5 py-1.5">
                  <dt className="font-medium text-muted-foreground">
                    {SO.aliasLabel}
                  </dt>
                  <dd>
                    <OverflowPillList
                      items={aliasChips}
                      getItemKey={(a) => a}
                      getItemLabel={(a) => a}
                      summaryLabel={SO.aliasesSummaryLabel}
                      hoverTitle={SO.aliasesHoverTitle}
                    />
                  </dd>
                </div>
              )}
              <div className="flex items-start justify-between gap-3 px-2.5 py-1.5">
                <dt className="font-medium text-muted-foreground">
                  {SO.hsnCodeLabel}
                </dt>
                <dd className="font-medium">{hsnCode ?? "—"}</dd>
              </div>
              <div className="flex items-start justify-between gap-3 px-2.5 py-1.5">
                <dt className="font-medium text-muted-foreground">
                  {SO.unitOfMeasureLabel}
                </dt>
                <dd>{uomLabel(uom)}</dd>
              </div>
              {brand && (
                <div className="flex items-start justify-between gap-3 px-2.5 py-1.5">
                  <dt className="font-medium text-muted-foreground">
                    {SO.brandOemLabel}
                  </dt>
                  <dd>{brand}</dd>
                </div>
              )}
              <div className="flex items-start justify-between gap-3 px-2.5 py-1.5">
                <dt className="font-medium text-muted-foreground">
                  {SO.modelLabel}
                </dt>
                <dd>{modelName}</dd>
              </div>
              </dl>
            </Typography>
          </div>
        </div>
      </div>
    </div>
  );
}
