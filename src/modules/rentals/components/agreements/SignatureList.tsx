import { Pencil, PenLine } from "lucide-react";

import { EmptyState } from "@/components/common/feedback/EmptyState";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { toISTDateKey } from "@shared/lib/date";

import type { AgreementSignature } from "../../api/agreements";
import { SIGNATORY_PARTY_LABELS } from "../../constants/signatures";
import { formatRentalDay } from "../../lib/format";
import { AGREEMENTS_STRINGS } from "./agreements.strings";
import { ListRowsSkeleton } from "./ListRowsSkeleton";

const S = AGREEMENTS_STRINGS.agreement.signatures;

/** Who has signed this agreement version. `onEdit` (given only to users who
 *  may record signatures) adds an Edit button to each row. */
export function SignatureList({
  rows,
  isLoading,
  onEdit,
}: {
  rows: readonly AgreementSignature[];
  isLoading: boolean;
  onEdit?: (row: AgreementSignature) => void;
}) {
  if (isLoading) return <ListRowsSkeleton />;
  if (rows.length === 0) return <EmptyState icon={PenLine} title={S.empty} className="py-6" />;
  return (
    <ul className="divide-y">
      {rows.map((row) => (
        <li key={row.id} className="flex min-w-0 items-center gap-3 py-2">
          <StatusBadge variant={row.signed_at ? "success" : "neutral"}>
            {SIGNATORY_PARTY_LABELS[row.party] ?? row.party}
          </StatusBadge>
          <Typography variant="body" className="min-w-0 flex-1 truncate" asChild>
            <span>{row.signatory_name}</span>
          </Typography>
          <Typography variant="helper" tone="muted" className="shrink-0" asChild>
            <span>{row.signed_at ? formatRentalDay(toISTDateKey(row.signed_at)) : S.undated}</span>
          </Typography>
          {onEdit ? (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              aria-label={S.editAria(SIGNATORY_PARTY_LABELS[row.party] ?? row.party)}
              onClick={() => onEdit(row)}
            >
              <Pencil className="size-3.5" />
              {S.edit}
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
