import { useEffect } from "react";

/** Close a popup when the PAGE scrolls, so it does not stay pinned on screen
 *  while the content it belongs to moves away. Scrolling inside the popup
 *  itself (`data-slot="dropdown-menu-content"`) is left alone. Listens in the
 *  capture phase: the app scrolls inside its main pane, not the window. */
export function useCloseOnPageScroll(open: boolean, close: () => void): void {
  useEffect(() => {
    if (!open) return;
    const onScroll = (e: Event) => {
      const target = e.target;
      if (target instanceof Element && target.closest('[data-slot="dropdown-menu-content"]')) return;
      close();
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, [open, close]);
}
