import { Typography } from "@/components/ui/typography";
import { TruncatedSerial } from "@/components/common/display/TruncatedSerial";
import type { PullOutState } from "../../hooks/material-issue/useIssuedComponentsPanel";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import { StagedTable } from "./StagedTable";
import { RowRemove } from "./RowRemove";

const REMOVE_GRID_COLS = "grid-cols-[1fr_auto_2.5rem_2.5rem_1.75rem]";

export function StagedRemovesTable({ rm }: { rm: PullOutState }) {
  return (
    <StagedTable
      emptyText={S.issuedComponents.stagedRemoveEmpty}
      count={rm.staged.length}
      extraHeaders={
        <>
          <Typography variant="badge" tone="muted" asChild>
            <span>{S.issuedComponents.colRack}</span>
          </Typography>
          <Typography variant="badge" tone="muted" asChild>
            <span>{S.issuedComponents.colBin}</span>
          </Typography>
        </>
      }
      gridCols={REMOVE_GRID_COLS}
    >
      {rm.staged.map((r) => (
        <div
          key={r.key}
          className="grid grid-cols-[1fr_auto_2.5rem_2.5rem_1.75rem] items-center gap-3 py-2"
        >
          <Typography variant="body" truncate asChild>
            <span className="min-w-0">{r.label}</span>
          </Typography>
          <Typography variant="mono" tone="muted" asChild>
            <TruncatedSerial value={r.serial} className="max-w-full" mono={false} />
          </Typography>
          <Typography variant="body" numeric asChild>
            <span>{r.rackName}</span>
          </Typography>
          <Typography variant="body" numeric tone={r.binName ? "default" : "muted"} asChild>
            <span>{r.binName ?? "—"}</span>
          </Typography>
          <RowRemove onClick={() => rm.unstage(r.key)} />
        </div>
      ))}
    </StagedTable>
  );
}
