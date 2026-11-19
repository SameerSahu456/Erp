// Types for the ERP Assistant. Mirrors
// `comprint-erp-backend/app/modules/assistant/schemas/chat.py`.

export type AssistantRole = "user" | "assistant";

export type AssistantChartUnit = "count" | "money" | "days" | "number";

/** Data the backend attaches when an answer is worth charting. */
export interface AssistantChart {
  title: string;
  unit: AssistantChartUnit;
  points: { label: string; value: number }[];
}

export interface AssistantMessage {
  id: string;
  role: AssistantRole;
  /** Markdown for assistant messages, plain text for the user's. */
  text: string;
  /** True when this assistant message reports a failed request. */
  isError?: boolean;
  /** Offered to the user as "see this as a chart?" under the answer. */
  chart?: AssistantChart | null;
}

/** One answered question, kept in the browser so it can be looked up later. */
export interface AssistantHistoryEntry {
  id: string;
  question: string;
  /** The answer as it was when asked (Markdown). */
  answer: string;
  /** ISO timestamp (UTC) of when the question was asked. */
  askedAt: string;
  chart?: AssistantChart | null;
}

/** One earlier message, sent so a follow-up question is understood. */
export interface AssistantHistoryTurn {
  role: AssistantRole;
  text: string;
}

export interface AskAssistantRequest {
  question: string;
  /** The latest turns of the conversation, oldest first. */
  history: AssistantHistoryTurn[];
}

export interface AskAssistantResponse {
  answer: string;
  suggestions: string[];
  chart: AssistantChart | null;
}
