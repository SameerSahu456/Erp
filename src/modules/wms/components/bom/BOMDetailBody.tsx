import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/common/feedback/EmptyState"
import { useNavigateBack } from "@/hooks/use-navigate-back";
import { AlertTriangle, FileQuestion, Layers, Package, Settings } from 'lucide-react';

import { PageHeader } from "@/components/page-shells";
import { Typography } from "@/components/ui/typography";
import { ExpandableClampText } from "@/components/common/display/ExpandableClampText";
import { useVariant } from "@modules/ims";
import { formatIST_date } from "@shared/lib/date";
import { asUuid } from "@shared/lib/validation";
import { BOM_STRINGS } from "./bom.strings";
import { BOM_DETAIL_BODY_STRINGS } from "./bom-detail-body.strings";
import { formatCondition } from "../../constants/condition";

const DASH = "—";

function formatDate(dateStr: string) {
  return formatIST_date(dateStr);
}

/** Reference-BOM detail. The route `:id` is the parent `part_variant_id`; the
 *  variant endpoint embeds its Reference BOM under `bom` (`?include=bom`). The
 *  backend BOM is minimal — a parent variant + component variants with
 *  quantities/positions — so there is no BOM number / type / version / status /
 *  cost here (those existed only in the earlier mock). */
export function BOMDetailBody() {
  // §11.1 — the route `:id` (the parent variant id) is untrusted. Validate it
  // so a malformed id keeps the variant query disabled and falls through to the
  // not-found guard, rather than the backend returning a 422 for a non-UUID.
  const { id: rawId } = useParams<{ id: string }>();
  const id = asUuid(rawId);
  const goBack = useNavigateBack("/wms/bom");

  const variantQuery = useVariant(id ?? "", { includeBom: true });
  const variant = variantQuery.data;
  const bom = variant?.bom ?? null;

  if (variantQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Typography variant="body" tone="muted">
          {BOM_DETAIL_BODY_STRINGS.loading}
        </Typography>
      </div>
    );
  }

  if (variantQuery.isError || !variant || !bom) {
    // §0.6 / §2 — a friendly EmptyState, not a lone muted line. The icon
    // distinguishes the two cases the branch already separated: a load
    // failure is worth retrying, a missing BOM is not.
    return (
      <EmptyState
        icon={variantQuery.isError ? AlertTriangle : FileQuestion}
        title={
          variantQuery.isError
            ? BOM_DETAIL_BODY_STRINGS.loadError
            : BOM_STRINGS.detail.notFound
        }
        action={{ label: BOM_STRINGS.detail.backToBOMs, onClick: goBack }}
      />
    );
  }

  const totalComponents = bom.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={variant.name}
        subtitle={variant.sku_code ?? DASH}
        breadcrumbs={[
          { label: BOM_DETAIL_BODY_STRINGS.breadcrumbs.wms },
          { label: BOM_DETAIL_BODY_STRINGS.breadcrumbs.bom, href: "/wms/bom" },
          { label: variant.name },
        ]}
        backHref="/wms/bom"
      />

      {/* Stats — only what the backend BOM carries. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Layers className="size-4" />
            {BOM_STRINGS.detail.stats.lineItems}
          </div>
          <p className="mt-1 text-2xl font-semibold">{bom.items.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="size-4" />
            {BOM_STRINGS.detail.stats.totalComponents}
          </div>
          <p className="mt-1 text-2xl font-semibold">{totalComponents}</p>
        </div>
      </div>

      {/* Parent product — the assembly variant this BOM belongs to. */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">{BOM_STRINGS.detail.outputProduct}</h2>
        </div>
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
              <Settings className="size-6 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{variant.name}</p>
              <Typography variant="body" tone="muted">
                {BOM_STRINGS.detail.parentCard.partNo} {variant.sku_code ?? DASH} · {formatCondition(variant.condition)}
              </Typography>
            </div>
          </div>
        </div>
      </div>

      {/* Component list. */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">{BOM_STRINGS.detail.componentsRequired}</h2>
        </div>
        <div className="divide-y">
          {bom.items.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-4 px-6 py-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.component_variant.name}</p>
                <Typography variant="body" tone="muted">
                  {BOM_STRINGS.detail.parentCard.partNo} {item.component_variant.sku_code ?? DASH}
                  {` · ${item.component_variant.part_name}`}
                  {item.position && ` · ${BOM_DETAIL_BODY_STRINGS.componentCard.position(item.position)}`}
                </Typography>
                {item.notes && (
                  <Typography variant="helper" className="mt-1 italic" asChild>
                    <p>{item.notes}</p>
                  </Typography>
                )}
              </div>
              <div className="shrink-0 text-right">
                <Typography variant="subsection-title" asChild>
                  <p>{item.quantity}</p>
                </Typography>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metadata. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-3 font-semibold">{BOM_STRINGS.detail.metadata.details}</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{BOM_STRINGS.detail.metadata.created}</dt>
              <dd>{formatDate(bom.created_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{BOM_STRINGS.detail.metadata.lastUpdated}</dt>
              <dd>{formatDate(bom.updated_at)}</dd>
            </div>
          </dl>
        </div>

        {bom.notes && (
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-3 font-semibold">{BOM_STRINGS.detail.metadata.notes}</h3>
            <ExpandableClampText text={bom.notes} lines={3} variant="body" tone="muted" />
          </div>
        )}
      </div>
    </div>
  );
}
