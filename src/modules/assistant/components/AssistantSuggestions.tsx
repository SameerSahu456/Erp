import { Button } from "@/components/ui/button";

import { ASSISTANT_STRINGS as S } from "../assistant.strings";

interface AssistantSuggestionsProps {
  questions: readonly string[];
  disabled: boolean;
  onPick: (question: string) => void;
}

/** One-tap follow-up questions offered after an answer. */
export function AssistantSuggestions({ questions, disabled, onPick }: AssistantSuggestionsProps) {
  if (questions.length === 0) return null;
  return (
    <ul
      aria-label={S.suggestions.label}
      className="flex min-w-0 shrink-0 flex-wrap gap-1.5 border-t border-border/70 bg-card px-3 pt-2.5"
    >
      {questions.map((question) => (
        <li key={question} className="min-w-0 max-w-full max-sm:[&:nth-child(n+3)]:hidden">
          <Button
            variant="outline"
            size="xs"
            disabled={disabled}
            className="h-auto max-w-full whitespace-normal rounded-full border-border/70 px-2.5 py-1 text-left hover:border-primary/40"
            onClick={() => onPick(question)}
          >
            {question}
          </Button>
        </li>
      ))}
    </ul>
  );
}
