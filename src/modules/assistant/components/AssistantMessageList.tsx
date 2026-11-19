import { useEffect, useRef } from "react";
import { AlertCircle, Sparkles } from "lucide-react";

import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import { ASSISTANT_STRINGS as S } from "../assistant.strings";
import type { AssistantMessage } from "../types";
import { AssistantChartOffer } from "./AssistantChartOffer";
import { AssistantMarkdown } from "./AssistantMarkdown";

const TYPING_DOT_DELAYS = ["[animation-delay:0ms]", "[animation-delay:150ms]", "[animation-delay:300ms]"];

function AssistantAvatar() {
  return (
    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/15">
      <Sparkles className="size-3 text-primary" aria-hidden />
    </span>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <li className="flex min-w-0 animate-slide-up justify-end">
      <div className="min-w-0 max-w-[85%] rounded-2xl rounded-tr-md bg-primary px-3.5 py-2 text-primary-foreground shadow-sm">
        <Typography
          variant="body-sm"
          tone="inherit"
          className="whitespace-pre-wrap [overflow-wrap:anywhere]"
        >
          {text}
        </Typography>
      </div>
    </li>
  );
}

function AssistantBubble({ message }: { message: AssistantMessage }) {
  return (
    <li className="flex min-w-0 animate-slide-up items-start gap-2">
      <AssistantAvatar />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {message.isError ? (
          <div
            role="alert"
            className="flex min-w-0 items-start gap-1.5 rounded-2xl rounded-tl-md bg-destructive-soft px-3 py-2"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden />
            <Typography variant="body-sm" tone="danger" className="min-w-0 [overflow-wrap:anywhere]">
              {message.text}
            </Typography>
          </div>
        ) : (
          <div className="min-w-0 rounded-2xl rounded-tl-md border border-border/60 bg-card px-3.5 py-2.5 shadow-sm">
            <AssistantMarkdown text={message.text} />
          </div>
        )}
        {message.chart && <AssistantChartOffer chart={message.chart} />}
      </div>
    </li>
  );
}

function TypingIndicator() {
  return (
    <li className="flex min-w-0 items-center gap-2" aria-label={S.status.thinking}>
      <AssistantAvatar />
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-border/60 bg-card px-3.5 py-3 shadow-sm">
        {TYPING_DOT_DELAYS.map((delay) => (
          <span
            key={delay}
            className={cn("size-1.5 animate-bounce rounded-full bg-muted-foreground/60", delay)}
          />
        ))}
      </div>
    </li>
  );
}

interface AssistantMessageListProps {
  messages: AssistantMessage[];
  isPending: boolean;
}

export function AssistantMessageList({ messages, isPending }: AssistantMessageListProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Each new message (and the typing indicator) scrolls into view.
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isPending]);

  return (
    <div
      ref={scrollerRef}
      className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-muted/40 px-3 py-4"
    >
      <ul className="flex min-w-0 flex-col gap-3.5" aria-live="polite">
        {messages.map((message) =>
          message.role === "user" ? (
            <UserBubble key={message.id} text={message.text} />
          ) : (
            <AssistantBubble key={message.id} message={message} />
          ),
        )}
        {isPending && <TypingIndicator />}
      </ul>
    </div>
  );
}
