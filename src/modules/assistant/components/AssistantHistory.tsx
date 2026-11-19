import { useState } from "react";
import { ChevronDown, ChevronRight, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { formatIST } from "@/shared/lib/date";

import { ASSISTANT_STRINGS as S } from "../assistant.strings";
import type { AssistantHistoryEntry } from "../types";
import { AssistantChartOffer } from "./AssistantChartOffer";
import { AssistantMarkdown } from "./AssistantMarkdown";

interface HistoryItemProps {
  entry: AssistantHistoryEntry;
  isOpen: boolean;
  onToggle: () => void;
  onAskAgain: () => void;
}

function HistoryItem({ entry, isOpen, onToggle, onAskAgain }: HistoryItemProps) {
  const Chevron = isOpen ? ChevronDown : ChevronRight;
  return (
    <li className="min-w-0 rounded-lg border border-border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full min-w-0 items-start gap-2 rounded-lg px-2.5 py-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Chevron className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Typography variant="body-strong" asChild>
            <span className="[overflow-wrap:anywhere]">{entry.question}</span>
          </Typography>
          <Typography variant="caption">{formatIST(entry.askedAt)}</Typography>
        </span>
      </button>
      {isOpen && (
        <div className="flex min-w-0 flex-col gap-2 border-t border-border px-2.5 py-2">
          <AssistantMarkdown text={entry.answer} />
          {entry.chart && <AssistantChartOffer chart={entry.chart} />}
          <Button variant="outline" size="xs" className="self-start" onClick={onAskAgain}>
            <RotateCw className="size-3" aria-hidden />
            {S.actions.askAgain}
          </Button>
        </div>
      )}
    </li>
  );
}

interface AssistantHistoryProps {
  entries: AssistantHistoryEntry[];
  onAskAgain: (question: string) => void;
  onClear: () => void;
}

/** Past questions, newest first; each expands to the answer given at the time. */
export function AssistantHistory({ entries, onAskAgain, onClear }: AssistantHistoryProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6">
        <Typography variant="body-sm" tone="muted" align="center">
          {S.history.empty}
        </Typography>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
        <Typography variant="helper" className="mb-2 block">
          {S.history.savedNote}
        </Typography>
        <ul className="flex min-w-0 flex-col gap-1.5">
          {entries.map((entry) => (
            <HistoryItem
              key={entry.id}
              entry={entry}
              isOpen={openId === entry.id}
              onToggle={() => setOpenId((current) => (current === entry.id ? null : entry.id))}
              onAskAgain={() => onAskAgain(entry.question)}
            />
          ))}
        </ul>
      </div>
      <div className="flex shrink-0 justify-end border-t border-border px-3 py-2">
        <Button variant="ghost" size="xs" onClick={onClear}>
          {S.actions.clearHistory}
        </Button>
      </div>
    </div>
  );
}
