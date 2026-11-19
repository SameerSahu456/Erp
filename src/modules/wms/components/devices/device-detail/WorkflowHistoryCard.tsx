import { ArrowDownUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";

import type { WorkflowHistoryEntry } from "../../../api";
import { WORKFLOW_HISTORY_CARD_STRINGS } from "./workflow-history-card.strings";
import { useWorkflowHistoryView } from "./useWorkflowHistoryView";
import { WorkflowHistoryTimeline } from "./WorkflowHistoryTimeline";

interface WorkflowHistoryCardProps {
  history: WorkflowHistoryEntry[];
  /** While the history query is in flight, show a skeleton instead of the
   *  "No events yet" empty state, which would otherwise read as wrong info
   *  mid-load (§0.6). */
  isLoading?: boolean;
}

/** Workflow History sidebar. Presentational: mapping lives in workflow-event-registry,
 *  sort / grouping in useWorkflowHistoryView. */
export function WorkflowHistoryCard({
  history,
  isLoading = false,
}: WorkflowHistoryCardProps) {
  const { orderedEntries, sortOrder, toggleSort, cycleGroups, multiCycle } =
    useWorkflowHistoryView(history);

  return (
    // On desktop the card is a flex column so its header stays put and only the
    // timeline scrolls — capped to the left column's height (min-h-0 on the grid
    // cell), so it ends where the left column does instead of running long.
    <Card className="lg:flex lg:h-full lg:flex-col lg:overflow-hidden">
      <CardHeader>
        <CardTitle>{WORKFLOW_HISTORY_CARD_STRINGS.card.title}</CardTitle>
        {/* Order toggle — only meaningful with more than one event. */}
        {orderedEntries.length > 1 && (
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSort}
              aria-label={WORKFLOW_HISTORY_CARD_STRINGS.card.sortToggleAria}
              className="h-7 gap-1.5 px-2 text-muted-foreground"
            >
              <ArrowDownUp className="size-3.5" />
              <Typography variant="helper" tone="inherit" asChild>
                <span>
                  {sortOrder === "newest"
                    ? WORKFLOW_HISTORY_CARD_STRINGS.card.sortNewestFirst
                    : WORKFLOW_HISTORY_CARD_STRINGS.card.sortOldestFirst}
                </span>
              </Typography>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="lg:min-h-0 lg:flex-1 lg:overflow-auto">
        <WorkflowHistoryTimeline
          isLoading={isLoading}
          orderedEntries={orderedEntries}
          cycleGroups={cycleGroups}
          multiCycle={multiCycle}
        />
      </CardContent>
    </Card>
  );
}
