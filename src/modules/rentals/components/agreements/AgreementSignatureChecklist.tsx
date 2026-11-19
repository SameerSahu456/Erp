import { CheckCircle2, Circle } from "lucide-react";

import { Typography } from "@/components/ui/typography";

import type { SignatureChecklistItem } from "../../hooks/agreements/useAgreementSignatureChecklist";
import { AGREEMENT_APPROVAL_STRINGS as S } from "./agreement-approval.strings";

/** Comprint signed / Customer signed / Signed document uploaded — one tick
 *  per thing the approve endpoint checks when the document is required. */
export function AgreementSignatureChecklist({
  items,
}: {
  items: SignatureChecklistItem[];
}) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.key} className="flex min-w-0 items-center gap-2">
          {item.done ? (
            <CheckCircle2
              className="size-4 shrink-0 text-success"
              aria-hidden
            />
          ) : (
            <Circle
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
          )}
          <Typography
            variant="body"
            className="min-w-0 flex-1 truncate"
            asChild
          >
            <span>{item.label}</span>
          </Typography>
          <Typography
            variant="helper"
            tone={item.done ? "success" : "muted"}
            className="shrink-0"
            asChild
          >
            <span>{item.done ? S.checklist.done : S.checklist.missing}</span>
          </Typography>
        </li>
      ))}
    </ul>
  );
}
