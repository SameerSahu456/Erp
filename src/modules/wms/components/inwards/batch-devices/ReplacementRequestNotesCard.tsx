import { ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import { usePermission } from "@shared/rbac";
import {
  crmPermissions,
  useReplacementRequest,
  type ReplacementRequestItemWire,
} from "@modules/crm";
import { rentalsCan } from "@modules/rentals";

import type { GrnBatchResponse } from "../../../api";
import { wmsCan } from "../../../permissions";
import { INWARDS_STRINGS } from "../inwards.strings";
import { REPLACEMENT_REQUESTS_STRINGS } from "../../replacement-requests/replacement-requests.strings";
import {
  isLiveLine,
  lineAction,
  lineSubject,
  lineWhere,
} from "./replacement-request-notes-helpers";

const S = INWARDS_STRINGS.replacementRequestNotes;

/** Replacement return: what the request asks for — the fault and what to do with
 *  each part — so whoever receives and inspects the unit knows. Read-only; shown
 *  only to viewers who may read the request (the same gate as its own page). */
export function ReplacementRequestNotesCard({
  batch,
}: {
  batch: GrnBatchResponse;
}) {
  const { can } = usePermission();
  const isReplacement = batch.inward_type === "replacement_return";
  const canRead = can([
    crmPermissions.READ,
    ...wmsCan.returnsView,
    ...rentalsCan.replacementView,
  ]);
  const query = useReplacementRequest(batch.source_entity_id, {
    enabled: isReplacement && canRead,
  });
  const rr = query.data;
  if (!isReplacement || !canRead || !rr) return null;
  const lines = (rr.items ?? []).filter(isLiveLine);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="size-4 text-muted-foreground" />
          <Link
            to={`/wms/replacements/${rr.id}`}
            className="min-w-0 text-primary hover:underline"
          >
            {S.title(rr.request_number)}
          </Link>
        </CardTitle>
        <Typography variant="helper" tone="muted">
          {S.description}
        </Typography>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          <Fact label={S.reason} value={rr.reason} />
          <Fact label={S.details} value={rr.description} />
          <Fact label={S.notes} value={rr.notes} />
          <Fact label={S.engineer} value={rr.engineer_name} />
          <Fact label={S.ticket} value={rr.external_ticket_no} />
        </dl>
        <ul className="divide-y divide-border rounded-md border">
          {lines.map((item) => (
            <LineNote key={item.id} item={item} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Fact({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value?.trim()) return null;
  return (
    <div className="min-w-0">
      <Typography variant="caption" tone="muted" asChild>
        <dt>{label}</dt>
      </Typography>
      <Typography variant="body" className="break-words" asChild>
        <dd>{value}</dd>
      </Typography>
    </div>
  );
}

function LineNote({ item }: { item: ReplacementRequestItemWire }) {
  return (
    <li className="flex flex-col gap-1 p-3 sm:flex-row sm:items-start sm:gap-6">
      <div className="min-w-0 sm:w-2/5">
        <TruncatedText
          value={lineSubject(item)}
          className="block max-w-full font-medium"
        />
        {item.original_internal_serial && (
          <Typography
            variant="caption"
            tone="muted"
            className="block font-mono"
          >
            {S.device(item.original_internal_serial)}
          </Typography>
        )}
        <Typography variant="caption" tone="muted" className="block">
          {lineWhere(item)}
        </Typography>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <Typography variant="body-strong" className="block">
          {lineAction(item)}
        </Typography>
        {item.issue_reason && (
          <Typography variant="helper" className="block break-words">
            {`${REPLACEMENT_REQUESTS_STRINGS.lineWording.issue}: ${item.issue_reason}`}
          </Typography>
        )}
        {item.notes && (
          <Typography
            variant="helper"
            tone="muted"
            className="block break-words"
          >
            {item.notes}
          </Typography>
        )}
      </div>
    </li>
  );
}
