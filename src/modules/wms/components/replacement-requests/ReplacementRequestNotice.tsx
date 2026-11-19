import { ClipboardList } from "lucide-react";

import { Typography } from "@/components/ui/typography";
import { EntityRef } from "@/components/common/display/EntityRef";

import type { DeviceDossier } from "../../api";
import { useDevice } from "../../hooks/devices/useDevices";
import { lineActionText, lineWhereText } from "./replacement-line-wording";
import { REPLACEMENT_REQUESTS_STRINGS } from "./replacement-requests.strings";

type LiveReplacement = NonNullable<DeviceDossier["live_replacement_request"]>;
type LiveLine = LiveReplacement["lines"][number];

const N = REPLACEMENT_REQUESTS_STRINGS.unitNotice;
const W = REPLACEMENT_REQUESTS_STRINGS.lineWording;

/** For a stage dialog that has only the unit id: loads the unit (shared,
 *  cached query) and shows its open replacement request, if any. */
export function DeviceReplacementNotice({ deviceId }: { deviceId: string | null }) {
  const query = useDevice(deviceId ?? "");
  const live = query.data?.live_replacement_request;
  return live ? <ReplacementRequestNotice live={live} /> : null;
}

/** The open replacement request a unit is part of: which parts to check, what
 *  to do with each, and what the customer reported. Shown at inspection,
 *  repair, QC and on the device page until the request closes. */
export function ReplacementRequestNotice({ live }: { live: LiveReplacement }) {
  return (
    <section
      aria-label={N.title}
      className="min-w-0 space-y-2 rounded-md border border-info bg-info-soft px-4 py-3"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <ClipboardList className="size-4 shrink-0 text-info" aria-hidden />
        <Typography variant="body-strong">{N.title}</Typography>
        <EntityRef kind="replacement" id={live.id} value={live.request_number}>
          {live.request_number}
        </EntityRef>
      </div>
      <Typography variant="helper" className="block break-words">
        {`${N.reason}: ${live.reason}`}
        {live.description ? ` — ${live.description}` : ""}
      </Typography>
      <Typography variant="helper" tone="muted" className="block">
        {N.lead}
      </Typography>
      <ul className="space-y-2">
        {live.lines.map((line) => (
          <NoticeLine key={line.item_id} line={line} />
        ))}
      </ul>
    </section>
  );
}

function NoticeLine({ line }: { line: LiveLine }) {
  const name = line.part_name || W.unknownPart;
  return (
    <li className="min-w-0 rounded-md border border-border bg-card px-3 py-2">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
        <Typography variant="body-strong" className="min-w-0 break-words">
          {line.part_number && line.part_number !== name ? `${name} · ${line.part_number}` : name}
        </Typography>
        <Typography variant="caption" tone="muted">
          {lineWhereText(line)}
        </Typography>
      </div>
      <Typography variant="body" className="block">
        {lineActionText(line, line.replacement_part_name)}
      </Typography>
      {line.issue_reason && (
        <Typography variant="helper" className="block break-words">
          {`${W.issue}: ${line.issue_reason}`}
        </Typography>
      )}
      {line.notes && (
        <Typography variant="helper" tone="muted" className="block break-words">
          {line.notes}
        </Typography>
      )}
    </li>
  );
}
