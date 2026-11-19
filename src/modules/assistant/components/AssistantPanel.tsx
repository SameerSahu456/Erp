import { useEffect, useState } from "react";
import { Eraser, History, Maximize2, MessageCircle, Minimize2, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import { ASSISTANT_STRINGS as S } from "../assistant.strings";
import { useAssistantChat } from "../hooks/useAssistantChat";
import { AssistantComposer } from "./AssistantComposer";
import { AssistantEmptyState } from "./AssistantEmptyState";
import { AssistantHistory } from "./AssistantHistory";
import { AssistantMessageList } from "./AssistantMessageList";
import { AssistantSuggestions } from "./AssistantSuggestions";

interface HeaderButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}

function HeaderButton({ label, onClick, className, children }: HeaderButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn(
        "text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground",
        className,
      )}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}

interface AssistantChatViewProps {
  chat: ReturnType<typeof useAssistantChat>;
  hasMessages: boolean;
}

function AssistantChatView({ chat, hasMessages }: AssistantChatViewProps) {
  return (
    <>
      {hasMessages ? (
        <AssistantMessageList messages={chat.messages} isPending={chat.isPending} />
      ) : (
        <AssistantEmptyState onPick={chat.send} />
      )}
      <AssistantSuggestions
        questions={chat.suggestions}
        disabled={chat.isPending}
        onPick={chat.send}
      />
      <AssistantComposer isPending={chat.isPending} onSend={chat.send} />
    </>
  );
}

export function AssistantPanel({ onClose }: { onClose: () => void }) {
  const chat = useAssistantChat();
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const askFromHistory = (question: string) => {
    setShowHistory(false);
    chat.send(question);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const hasMessages = chat.messages.length > 0 || chat.isPending;

  return (
    <section
      role="dialog"
      aria-label={S.title}
      className={cn(
        "fixed bottom-[5.5rem] right-4 z-[60] flex max-w-[calc(100vw-2rem)] flex-col overflow-hidden sm:right-6",
        "h-[min(680px,calc(100dvh-7.5rem))] animate-slide-up rounded-2xl border border-border/70 bg-card",
        "shadow-2xl shadow-foreground/15 ring-1 ring-foreground/5",
        "transition-[width] duration-200 motion-reduce:transition-none",
        expanded ? "w-[760px]" : "w-[420px]",
      )}
    >
      <header className="flex shrink-0 items-center gap-1 bg-gradient-to-br from-primary via-primary to-primary/85 px-3 py-3 text-primary-foreground">
        <span className="mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <Typography variant="card-title" tone="inherit" truncate>
            {showHistory ? S.history.title : S.title}
          </Typography>
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="size-1.5 shrink-0 rounded-full bg-success ring-2 ring-success/30" />
            <Typography variant="caption" tone="inherit" truncate className="opacity-80">
              {S.subtitle}
            </Typography>
          </span>
        </div>
        <HeaderButton
          label={showHistory ? S.actions.backToChat : S.actions.history}
          onClick={() => setShowHistory((value) => !value)}
        >
          {showHistory ? (
            <MessageCircle className="size-4" aria-hidden />
          ) : (
            <History className="size-4" aria-hidden />
          )}
        </HeaderButton>
        {hasMessages && !showHistory && (
          <HeaderButton label={S.actions.newChat} onClick={chat.clear}>
            <Eraser className="size-4" aria-hidden />
          </HeaderButton>
        )}
        <HeaderButton
          label={expanded ? S.actions.collapse : S.actions.expand}
          onClick={() => setExpanded((value) => !value)}
          className="hidden sm:inline-flex"
        >
          {expanded ? (
            <Minimize2 className="size-4" aria-hidden />
          ) : (
            <Maximize2 className="size-4" aria-hidden />
          )}
        </HeaderButton>
        <HeaderButton label={S.actions.close} onClick={onClose}>
          <X className="size-4" aria-hidden />
        </HeaderButton>
      </header>

      {showHistory ? (
        <AssistantHistory
          entries={chat.history}
          onAskAgain={askFromHistory}
          onClear={chat.clearHistory}
        />
      ) : (
        <AssistantChatView chat={chat} hasMessages={hasMessages} />
      )}
    </section>
  );
}
