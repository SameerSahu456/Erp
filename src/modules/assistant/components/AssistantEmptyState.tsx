import { ArrowUpRight, Sparkles } from "lucide-react";

import { Typography } from "@/components/ui/typography";
import { useAuth } from "@/shared/auth/use-auth";

import { ASSISTANT_STRINGS as S } from "../assistant.strings";

export function AssistantEmptyState({ onPick }: { onPick: (question: string) => void }) {
  const { user } = useAuth();
  // Names are often stored in capitals; greet in normal case.
  const rawName = user?.first_name?.trim().split(/\s+/)[0] ?? "";
  const firstName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase() : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto bg-muted/40 px-4 py-6">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20 ring-4 ring-primary/10">
          <Sparkles className="size-5 text-primary-foreground" aria-hidden />
        </div>
        <div className="flex flex-col gap-1">
          <Typography variant="subsection-title" align="center">
            {firstName ? S.greeting(firstName) : S.empty.heading}
          </Typography>
          <Typography variant="body-sm" tone="muted" align="center">
            {S.empty.body}
          </Typography>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <Typography variant="eyebrow" tone="muted">
          {S.empty.startersLabel}
        </Typography>
        <ul className="flex w-full min-w-0 flex-col gap-1.5">
          {S.starters.map((question) => (
            <li key={question} className="min-w-0">
              <button
                type="button"
                onClick={() => onPick(question)}
                className="group flex w-full min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-card px-3.5 py-2.5 text-left shadow-sm outline-none transition-all hover:-translate-y-px hover:border-primary/40 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <Typography variant="body-sm" asChild>
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{question}</span>
                </Typography>
                <ArrowUpRight
                  className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
