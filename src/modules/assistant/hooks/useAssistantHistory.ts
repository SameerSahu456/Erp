import { useCallback, useState } from "react";

import type { AssistantChart, AssistantHistoryEntry } from "../types";

const STORAGE_PREFIX = "erp_assistant_history:";
// Newest first; the oldest entries drop off once the cap is reached.
const MAX_ENTRIES = 100;

function isEntry(value: unknown): value is AssistantHistoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.question === "string" &&
    typeof entry.answer === "string" &&
    typeof entry.askedAt === "string"
  );
}

function load(key: string): AssistantHistoryEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

function save(key: string, entries: AssistantHistoryEntry[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(entries));
  } catch {
    // Storage full or unavailable — history is a convenience, never a blocker.
  }
}

/**
 * Question-and-answer history for one user, kept in this browser's
 * localStorage so it outlives the tab (unlike the open chat itself).
 */
export function useAssistantHistory(userId: string) {
  const key = `${STORAGE_PREFIX}${userId}`;
  const [entries, setEntries] = useState<AssistantHistoryEntry[]>(() => load(key));

  const record = useCallback(
    (question: string, answer: string, chart: AssistantChart | null = null) => {
      setEntries((prev) => {
        const entry: AssistantHistoryEntry = {
          id: crypto.randomUUID(),
          question,
          answer,
          chart,
          askedAt: new Date().toISOString(),
        };
        const next = [entry, ...prev].slice(0, MAX_ENTRIES);
        save(key, next);
        return next;
      });
    },
    [key],
  );

  const clear = useCallback(() => {
    save(key, []);
    setEntries([]);
  }, [key]);

  return { entries, record, clear };
}
