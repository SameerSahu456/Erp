import { useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { usePersistedState } from "@/hooks/use-persisted-state";
import { ApiError } from "@/shared/api/envelope";
import { useAuth } from "@/shared/auth/use-auth";
import { logger } from "@/shared/lib/logger";

import { askAssistant } from "../api";
import { ASSISTANT_STRINGS as S } from "../assistant.strings";
import type { AssistantHistoryTurn, AssistantMessage } from "../types";
import { useAssistantHistory } from "./useAssistantHistory";

const STORAGE_PREFIX = "erp_assistant_chat:";
// Keep the stored transcript bounded; older turns drop off the top.
const MAX_STORED_MESSAGES = 60;
// Limits of `AskRequest.history` on the backend (schemas/chat.py).
const MAX_HISTORY_TURNS = 8;
const MAX_HISTORY_TURN_CHARS = 6000;

/** The latest turns to send with a question; failed requests are left out. */
function recentTurns(messages: AssistantMessage[]): AssistantHistoryTurn[] {
  return messages
    .filter((message) => !message.isError)
    .slice(-MAX_HISTORY_TURNS)
    .map((message) => ({
      role: message.role,
      text: message.text.slice(0, MAX_HISTORY_TURN_CHARS),
    }));
}

function describeFailure(error: unknown): string {
  if (error instanceof ApiError && error.statusCode !== 0) {
    return error.message || S.errors.generic;
  }
  return S.errors.network;
}

function append(messages: AssistantMessage[], message: AssistantMessage): AssistantMessage[] {
  return [...messages, message].slice(-MAX_STORED_MESSAGES);
}

/**
 * Chat state for the ERP Assistant. The transcript lives in sessionStorage,
 * keyed per user, so it survives navigation and reloads but not the tab.
 */
export function useAssistantChat() {
  const { user } = useAuth();
  const [messages, setMessages] = usePersistedState<AssistantMessage[]>(
    `${STORAGE_PREFIX}${user?.id ?? "anonymous"}`,
    [],
  );
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const history = useAssistantHistory(user?.id ?? "anonymous");
  const recordAnswer = history.record;

  const { mutate, isPending } = useMutation({
    mutationFn: askAssistant,
    onSuccess: (response, { question }) => {
      recordAnswer(question, response.answer, response.chart);
      setMessages((prev) =>
        append(prev, {
          id: crypto.randomUUID(),
          role: "assistant",
          text: response.answer,
          chart: response.chart,
        }),
      );
      setSuggestions(response.suggestions);
    },
    onError: (error) => {
      logger.error("assistant question failed", error);
      setMessages((prev) =>
        append(prev, {
          id: crypto.randomUUID(),
          role: "assistant",
          text: describeFailure(error),
          isError: true,
        }),
      );
    },
  });

  const send = useCallback(
    (text: string) => {
      const question = text.trim();
      if (!question || isPending) return;
      setMessages((prev) => append(prev, { id: crypto.randomUUID(), role: "user", text: question }));
      setSuggestions([]);
      mutate({ question, history: recentTurns(messages) });
    },
    [isPending, messages, mutate, setMessages],
  );

  const clear = useCallback(() => {
    setMessages([]);
    setSuggestions([]);
  }, [setMessages]);

  return {
    messages,
    suggestions,
    isPending,
    send,
    clear,
    history: history.entries,
    clearHistory: history.clear,
  };
}
