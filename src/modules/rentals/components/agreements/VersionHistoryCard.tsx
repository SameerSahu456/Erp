import { History } from "lucide-react";

import { StatusBadge } from "@/components/common/display/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { toISTDateKey } from "@shared/lib/date";

import type { RentalAgreement } from "../../api/agreements";
import { toAgreementCadence } from "../../lib/agreementCadence";
import { formatRentalDay } from "../../lib/format";
import { SectionHeader } from "../shared/SectionHeader";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { cadenceSummary } from "./agreement-configure-helpers";

/** Every version of the terms, newest first. */
export function VersionHistoryCard({ versions }: { versions: readonly RentalAgreement[] }) {
  return (
    <Card>
      <SectionHeader icon={History} title={S.configure.historyTitle} subtitle={S.configure.historySubtitle} />
      <CardContent>
        <div className="divide-y divide-border">
          {versions.map((version) => (
            <div
              key={version.id}
              className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <Typography variant="body-strong">{S.so.versionLabel(version.version)}</Typography>
                  <StatusBadge variant={version.is_current ? "success" : "neutral"}>
                    {version.is_current ? S.so.currentLabel : S.so.supersededLabel}
                  </StatusBadge>
                </div>
                <Typography variant="helper" tone="muted">
                  {cadenceSummary(toAgreementCadence(version))}
                </Typography>
                {version.amend_reason ? <Typography variant="helper">{version.amend_reason}</Typography> : null}
              </div>
              <Typography variant="helper" tone="muted">
                {formatRentalDay(toISTDateKey(version.configured_at))}
              </Typography>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
