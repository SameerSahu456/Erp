import { AlertTriangle } from "lucide-react";

import { Typography } from "@/components/ui/typography";

/** A titled list of errors the server returned that belong to no single field. */
export function GeneralErrorsAlert({ title, messages }: { title: string; messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <div role="alert" className="space-y-1 rounded-lg border border-destructive/40 bg-destructive-soft p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden />
        <Typography variant="body-strong" tone="danger">{title}</Typography>
      </div>
      <ul className="list-disc space-y-0.5 pl-6">
        {messages.map((m) => (
          <li key={m}>
            <Typography variant="body-sm">{m}</Typography>
          </li>
        ))}
      </ul>
    </div>
  );
}
