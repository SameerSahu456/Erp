import { useState } from "react";

import { EmptyState } from "@/components/common/feedback/EmptyState";
import { TablePagination } from "@/components/common/tables/TablePagination";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Typography } from "@/components/ui/typography";
import { EMPTY_VALUE, PAGINATION } from "@/shared/constants";
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState";
import { formatIST } from "@/shared/lib/date";
import { usePermission } from "@shared/rbac";
import {
  AUDIT_PERMISSIONS,
  useEntityAuditTrail,
  type AuditEntry,
} from "@modules/audit";

import { RENTAL_SETTINGS_AUDIT_ID } from "../../api/settings";
import { rentalSettingLabel } from "../../constants/rental-settings";
import { CONFIGURATION_STRINGS } from "./configuration.strings";

const S = CONFIGURATION_STRINGS.history;

/** Bookkeeping the audit service stamps onto `after`; never a setting. */
const IGNORED_KEYS = new Set(["actor_was_superuser"]);

interface ChangeRow {
  id: string;
  setting: string;
  change: string;
  user: string;
  at: string;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return EMPTY_VALUE;
  if (typeof value === "boolean") return value ? S.on : S.off;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** One row per setting that actually changed in an audit entry. */
function toRows(entry: AuditEntry): ChangeRow[] {
  const before = (entry.before ?? {}) as Record<string, unknown>;
  const after = (entry.after ?? {}) as Record<string, unknown>;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const rows: ChangeRow[] = [];
  for (const key of keys) {
    if (IGNORED_KEYS.has(key)) continue;
    if (JSON.stringify(before[key]) === JSON.stringify(after[key])) continue;
    rows.push({
      id: `${entry.id}:${key}`,
      setting: rentalSettingLabel(key),
      change: S.change(formatValue(before[key]), formatValue(after[key])),
      user: entry.actor_name ?? S.unknownUser,
      at: formatIST(entry.created_at),
    });
  }
  return rows;
}

function ChangeTable({ rows }: { rows: ChangeRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{S.columns.setting}</TableHead>
          <TableHead>{S.columns.change}</TableHead>
          <TableHead>{S.columns.user}</TableHead>
          <TableHead>{S.columns.when}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <Typography variant="table-name">{row.setting}</Typography>
            </TableCell>
            <TableCell className="max-w-80">
              {/* A long value (an email body) is cut; the tooltip has it whole. */}
              <Tooltip>
                <TooltipTrigger render={<span className="block min-w-0" />}>
                  <Typography variant="table-cell" truncate className="min-w-0">
                    {row.change}
                  </Typography>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm [overflow-wrap:anywhere]">{row.change}</TooltipContent>
              </Tooltip>
            </TableCell>
            <TableCell>
              <Typography variant="table-cell">{row.user}</Typography>
            </TableCell>
            <TableCell>
              <Typography variant="table-secondary">{row.at}</Typography>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Who changed which rental setting, from the audit trail. Rendered only
 *  for `audit:read` holders (superusers today) — the API 403s otherwise. */
export function SettingsChangeHistoryCard() {
  const { can } = usePermission();
  const canRead = can(AUDIT_PERMISSIONS.READ);
  const [page, setPage] = useState(1);
  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE;
  const query = useEntityAuditTrail("rental_settings", RENTAL_SETTINGS_AUDIT_ID, {
    enabled: canRead,
    page,
    pageSize,
  });
  const total = query.data?.total ?? 0;
  const rows = (query.data?.items ?? []).flatMap(toRows);

  if (!canRead) return null;

  let body = (
    <>
      <ChangeTable rows={rows} />
      <TablePagination
        page={page}
        totalPages={Math.max(1, Math.ceil(total / pageSize))}
        pageSize={pageSize}
        total={total}
        isFetching={query.isFetching}
        onPageChange={setPage}
      />
    </>
  );
  if (query.isLoading) body = <Skeleton className="h-40 w-full" aria-label={S.loading} />;
  else if (query.isError) body = <LoadErrorState error={query.error} fallback={S.failed} />;
  else if (rows.length === 0) body = <EmptyState title={S.empty} />;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{S.title}</CardTitle>
          <CardDescription>{S.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{body}</CardContent>
    </Card>
  );
}
