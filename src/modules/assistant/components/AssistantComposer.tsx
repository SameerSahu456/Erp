import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";

import { ASSISTANT_STRINGS as S } from "../assistant.strings";

// Mirrors AskRequest.question max_length on the backend.
const MAX_QUESTION_CHARS = 500;

interface AssistantComposerProps {
  isPending: boolean;
  onSend: (text: string) => void;
}

export function AssistantComposer({ isPending, onSend }: AssistantComposerProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const canSend = value.trim() !== "" && !isPending;

  const submit = () => {
    if (!canSend) return;
    onSend(value);
    setValue("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter (and IME composition) keeps typing.
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit();
  };

  return (
    <div className="shrink-0 border-t border-border/70 bg-card px-3 pb-2.5 pt-3">
      <div className="flex min-w-0 items-end gap-1.5 rounded-2xl border border-input bg-background py-1 pl-1 pr-1.5 shadow-sm transition-shadow focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25">
        <Textarea
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={S.composer.placeholder}
          aria-label={S.composer.label}
          maxLength={MAX_QUESTION_CHARS}
          rows={1}
          className="min-h-9 max-h-32 flex-1 border-0 bg-transparent shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
        />
        <Button
          size="icon-sm"
          onClick={submit}
          disabled={!canSend}
          aria-label={S.actions.send}
          className="mb-0.5 rounded-full"
        >
          <ArrowUp className="size-4" aria-hidden />
        </Button>
      </div>
      <Typography variant="micro" tone="muted" align="center" className="mt-2 block">
        {S.disclaimer}
      </Typography>
    </div>
  );
}
