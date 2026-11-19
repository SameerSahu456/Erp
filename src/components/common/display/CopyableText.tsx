import type { ReactNode } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { COPYABLE_TEXT_STRINGS as S } from "./copyable-text.strings";

interface CopyableTextProps {
  /** The exact text written to the clipboard. */
  value: string;
  /** What renders; defaults to `value`. */
  children?: ReactNode;
  className?: string;
  /** Show the browser's native "Click to copy" tooltip (default). Turn off when
   *  the caller already renders its own styled tooltip. */
  nativeTitle?: boolean;
}

/**
 * A reference number (GRN / PO / PRET / serial) that looks like plain text but
 * copies to the clipboard on click, with a "Copied" toast — no separate copy
 * icon (PAGE-UI §2). Wrap in `<Typography asChild>` to inherit a text variant.
 */
export function CopyableText({ value, children, className, nativeTitle = true }: CopyableTextProps) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(S.copied);
    } catch {
      toast.error(S.copyFailed);
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={nativeTitle ? S.clickToCopy : undefined}
      className={cn(
        "max-w-full cursor-pointer text-left transition-colors hover:text-primary",
        className,
      )}
    >
      {children ?? value}
    </button>
  );
}
