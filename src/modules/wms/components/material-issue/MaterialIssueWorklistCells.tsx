import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import {
  AsyncSelect,
  type AsyncQueryShape,
  type AsyncSelectOption,
} from "@/components/ui/async-select";

import type { MaterialIssueStage } from "../../api";
import {
  MATERIAL_ISSUE_STAGE_LABELS,
  MATERIAL_ISSUE_STAGE_VARIANT,
} from "../../constants/material-issue-status";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";

const DASH = "—";

/** Issue-type cell — a neutral badge, or a muted dash when unknown. */
export function MiTypeCell({ label }: { label: string }) {
  if (label === DASH) {
    return (
      <Typography variant="body" tone="muted" asChild>
        <span>{DASH}</span>
      </Typography>
    );
  }
  return <StatusBadge variant="neutral">{label}</StatusBadge>;
}

/** Derived-stage cell. */
export function MiStageCell({ stage }: { stage: MaterialIssueStage }) {
  return (
    <StatusBadge variant={MATERIAL_ISSUE_STAGE_VARIANT[stage] ?? "neutral"}>
      {MATERIAL_ISSUE_STAGE_LABELS[stage] ?? String(stage)}
    </StatusBadge>
  );
}

interface EngineerFilterProps<TItem extends { id: string; label: string }> {
  engineerId: string;
  engineerLabel: string;
  onChange: (next: AsyncSelectOption | null) => void;
  useOptions: (search: string, options?: { enabled?: boolean }) => AsyncQueryShape<TItem>;
}

/** "Issued to" filter — API-backed searchable list (§16.11); keeps the label to avoid a lookup. */
export function MiEngineerFilter<TItem extends { id: string; label: string }>({
  engineerId,
  engineerLabel,
  onChange,
  useOptions,
}: EngineerFilterProps<TItem>) {
  return (
    <div className="w-[190px]">
      <AsyncSelect
        value={engineerId ? { id: engineerId, label: engineerLabel } : null}
        onValueChange={onChange}
        useOptions={useOptions}
        toLabel={(u) => u.label}
        placeholder={S.worklist.filters.allEngineers}
        searchPlaceholder={S.worklist.filters.engineer}
        // Keep the "All engineers" placeholder in foreground tone to match the
        // sibling "All …" Select filters (AsyncSelect otherwise mutes it). CP-499
        className="h-9 w-full text-foreground"
        clearable
        loadOnOpen
        chevron="down"
      />
    </div>
  );
}
