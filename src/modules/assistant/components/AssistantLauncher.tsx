import { useCallback, useState } from "react";
import { Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ASSISTANT_STRINGS as S } from "../assistant.strings";
import { AssistantPanel } from "./AssistantPanel";

/**
 * Floating entry point for the ERP Assistant, mounted once in the AppShell so
 * it is available on every page.
 */
export function AssistantLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);

  const label = isOpen ? S.launcher.close : S.launcher.open;
  return (
    <>
      {isOpen && <AssistantPanel onClose={close} />}
      <Button
        size="icon"
        onClick={() => setIsOpen((value) => !value)}
        aria-label={label}
        aria-expanded={isOpen}
        title={label}
        className="fixed bottom-6 right-4 z-[60] h-12 w-12 rounded-full shadow-xl shadow-primary/30 ring-4 ring-primary/15 transition-transform hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100 sm:right-6"
      >
        {isOpen ? (
          <X className="size-5" aria-hidden />
        ) : (
          <Sparkles className="size-5" aria-hidden />
        )}
      </Button>
    </>
  );
}
