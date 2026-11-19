import { useState } from "react";
import {
  Clock,
  PackageCheck,
  PauseCircle,
  PlayCircle,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/common/feedback/EmptyState";
import { TablePagination } from "@/components/common/tables/TablePagination";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState";
import { NoAccess } from "@/shared/components/feedback/NoAccess";
import { humanizeEnum } from "@shared/lib/humanize-enum";
import { PAGINATION } from "@/shared/constants";
import {
  formatIST_date,
  formatIST_time,
  toISTDateKey,
} from "@/shared/lib/date";
import { usePermission } from "@/shared/rbac/usePermission";
import {
  AUDIT_PERMISSIONS,
  useEntityAuditTrail,
  type AuditEntry,
} from "@modules/audit";

import { getActivityPeriod, readHoldSpans, type ActivityPeriod } from "../../lib/activity-period";
import { daysInclusive } from "../../lib/dateRange";
import { formatRentalDay } from "../../lib/format";
import { DEVICE_STRINGS as S } from "./devices.strings";
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings";

const A = S.activity;

/** Icon per unit-level action. The backend writes distinct action codes
 *  (`dispatch` / `hold` / `unhold` / `delivered`) precisely so the timeline
 *  can tell them apart; anything else — including order-level events that
 *  reach a unit later — falls back to a neutral clock rather than guessing.
 */
const ICON_BY_ACTION: Record<string, LucideIcon> = {
  dispatch: Truck,
  hold: PauseCircle,
  unhold: PlayCircle,
  delivered: PackageCheck,
};

type HoldSpans = ReturnType<typeof readHoldSpans>;

/** "1 Aug 2026 → 10 Aug 2026 · 10 days", "From 1 Aug 2026 · ongoing" or "On …". */
function describePeriod(period: ActivityPeriod): string {
  if (period.kind === "on") return A.on(formatRentalDay(period.day));
  if (!period.to) return A.spanOngoing(formatRentalDay(period.from));
  return A.span(
    formatRentalDay(period.from),
    formatRentalDay(period.to),
    S.deviceDetail.days(daysInclusive(period.from, period.to)),
  );
}

function EntryRow({ entry, spans }: { entry: AuditEntry; spans: HoldSpans }) {
  const Icon = ICON_BY_ACTION[entry.action] ?? Clock;
  const period = getActivityPeriod(entry.action, entry.after, spans);
  return (
    <li className="flex gap-3">
      {/* The rail: a dot and the line beneath it, drawn by the list's own
          border so it connects rows without a wrapper per entry. */}
      <span
        className="mt-2 size-2 shrink-0 rounded-full bg-foreground"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 rounded-md border border-border px-3 py-2">
        <div className="flex min-w-0 gap-2">
          <Icon
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <Typography variant="body" className="min-w-0">
            {entry.message ?? humanizeEnum(entry.action)}
          </Typography>
        </div>
        {period ? (
          <Typography variant="helper" className="mt-1 break-words" numeric>
            {describePeriod(period)}
          </Typography>
        ) : null}
        <Typography variant="helper" tone="muted" className="mt-1">
          {S.activity.meta(
            entry.actor_name ?? A.system,
            formatIST_date(entry.created_at),
            formatIST_time(entry.created_at),
          )}
        </Typography>
      </div>
    </li>
  );
}

/** Entries grouped by IST day, keeping the API's order. Grouped here, not
 *  in the API, so a page stays N entries rather than N days. */
function groupByDay(items: AuditEntry[]) {
  const out: { key: string; entries: AuditEntry[] }[] = [];
  for (const entry of items) {
    const key = toISTDateKey(entry.created_at) ?? "";
    const last = out[out.length - 1];
    if (last && last.key === key) last.entries.push(entry);
    else out.push({ key, entries: [entry] });
  }
  return out;
}

function ActivityGroups({ items, spans }: { items: AuditEntry[]; spans: HoldSpans }) {
  return (
    <>
      {groupByDay(items).map((group) => (
        <div key={group.key} className="space-y-2">
          <Typography variant="caption" tone="muted">
            {formatIST_date(group.entries[0].created_at)}
          </Typography>
          <ul className="space-y-2">
            {group.entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} spans={spans} />
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

export interface DeviceActivityCardProps {
  deviceId: string;
  /** What the unit is called in the panel's subtitle — its serial, else its
   *  part. The id identifies it to the database, not to the reader. */
  deviceName: string;
  /** The unit's hold spans — where a hold's actual end is recorded. */
  holdHistory?: readonly Record<string, unknown>[];
}

/** Everything recorded against ONE unit: the audit trail scoped to
 *  `rental_device` + this id (hold, un-hold, delivery, dispatch). Order- and
 *  account-level events stay off it so the unit's own history isn't buried. */
export function DeviceActivityCard({ deviceId, deviceName, holdHistory }: DeviceActivityCardProps) {
  const spans = readHoldSpans(holdHistory);
  const [page, setPage] = useState(1);
  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE;

  // `audit:read` is superuser-only today; ask before firing a request that 403s.
  const { can } = usePermission();
  const canRead = can(AUDIT_PERMISSIONS.READ);
  const query = useEntityAuditTrail("rental_device", deviceId, { enabled: canRead, page, pageSize });
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  let body = (
    <>
      <ActivityGroups items={items} spans={spans} />
      {/* `compact`: this sits in a 320px rail. */}
      <TablePagination
        compact
        page={page}
        totalPages={Math.max(1, Math.ceil(total / pageSize))}
        pageSize={pageSize}
        total={total}
        isFetching={query.isFetching}
        onPageChange={setPage}
      />
    </>
  );
  if (!canRead) body = <NoAccess description={A.forbidden} compact />;
  else if (query.isLoading) {
    body = (
      <div className="space-y-2" aria-label={A.loading}>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  } else if (query.isError) {
    body = (
      <div className="space-y-2">
        <LoadErrorState error={query.error} fallback={A.failed} compact />
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          {C.retry}
        </Button>
      </div>
    );
  } else if (total === 0) body = <EmptyState title={A.empty} />;

  return (
    <Card>
      {/* CardHeader lays children side by side; the title/subtitle pair is ONE child. */}
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{A.title}</CardTitle>
          <CardDescription>{A.subtitle(deviceName)}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{body}</CardContent>
    </Card>
  );
}
