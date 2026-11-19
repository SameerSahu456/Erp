import { useMemo, useState } from "react";

import type { WorkflowHistoryEntry } from "../../../api";
import { buildTimelineEntries, groupByCycle } from "./workflow-event-registry";
import {
  readStoredSort,
  writeStoredSort,
  type SortOrder,
} from "./workflow-history-sort";

/** View state for the Workflow History card: the mapped timeline, the
 *  persisted sort order and per-cycle grouping. */
export function useWorkflowHistoryView(history: WorkflowHistoryEntry[]) {
  // Timeline entries carry their workflow-cycle ordinal so the render can
  // group them into per-cycle partitions.
  const entries = useMemo(() => buildTimelineEntries(history), [history]);

  // `entries` are newest-first; oldest-first is simply the reverse.
  const [sortOrder, setSortOrder] = useState<SortOrder>(readStoredSort);
  const orderedEntries = useMemo(
    () => (sortOrder === "oldest" ? entries.slice().reverse() : entries),
    [entries, sortOrder],
  );
  const toggleSort = () =>
    setSortOrder((prev) => {
      const next: SortOrder = prev === "newest" ? "oldest" : "newest";
      writeStoredSort(next);
      return next;
    });

  const cycleGroups = useMemo(
    () => groupByCycle(orderedEntries),
    [orderedEntries],
  );
  const multiCycle = cycleGroups.length > 1;

  return { orderedEntries, sortOrder, toggleSort, cycleGroups, multiCycle };
}
