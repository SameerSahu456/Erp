import { StickyNote } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityRef } from "@/components/common/display/EntityRef";
import { DetailTextBlock } from "@/components/common/display/DetailTextBlock";
import { formatIST } from "@shared/lib/date";

import type { MaterialIssueResponse } from "../../api";
import { getIssueTypeLabel, getSourceEntityLabel } from "../../constants/material-issue-status";
import { RentalOrderNumberTag } from "../shared/RentalOrderNumberTag";
import { DetailFact } from "../shared/section-primitives";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";

const DASH = "—";
const F = S.detail.fields;

interface Props {
  mi: MaterialIssueResponse;
  /** The demand document's code + detail route; null falls back to the source type label. */
  source: { code: string; href: string | null } | null;
}

/** Overview facts card on the Material Issue detail page. */
export function MaterialIssueOverviewCard({ mi, source }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{S.detail.sections.overview}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 items-start gap-4 md:grid-cols-4">
        <DetailFact label={F.issueType} value={getIssueTypeLabel(mi.issue_type)} />
        <DetailFact label={F.source}>
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            {source?.href ? (
              <EntityRef href={source.href} value={source.code} className="font-medium">
                {source.code}
              </EntityRef>
            ) : (
              (source?.code ?? getSourceEntityLabel(mi.source_entity_type))
            )}
            <RentalOrderNumberTag orderNumber={mi.rental_order_number} />
          </span>
        </DetailFact>
        <DetailFact label={F.warehouse} value={mi.warehouse_name ?? DASH} />
        <DetailFact label={F.issuedTo} value={mi.issued_to_name ?? DASH} />
        <DetailFact label={F.issuedBy} value={mi.issued_by_name ?? DASH} />
        <DetailFact label={F.issuedAt} value={mi.issued_at ? formatIST(mi.issued_at) : DASH} />
        <DetailFact label={F.externalTicket} value={mi.external_ticket_number ?? DASH} />
        <DetailFact label={F.createdAt} value={formatIST(mi.created_at)} />
        {mi.notes && (
          <DetailTextBlock
            icon={StickyNote}
            label={F.notes}
            text={mi.notes}
            // Plain text like the facts above it, not a boxed panel.
            className="col-span-2 border-0 bg-transparent p-0 md:col-span-4"
          />
        )}
      </CardContent>
    </Card>
  );
}
