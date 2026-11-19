import { useLayoutEffect, useRef, type ChangeEvent } from "react";

/**
 * Keeps the caret put on a controlled input that REWRITES what the user typed.
 *
 * ## The bug this fixes
 *
 * A field like the account name uppercases every keystroke:
 *
 * ```tsx
 * <Input value={name} onChange={(e) => setName(e.target.value.toUpperCase())} />
 * ```
 *
 * Type into the MIDDLE of "ACME CORP" and the caret jumps to the end. The DOM
 * briefly holds `ACMe CORP` (the raw keystroke) while state becomes `ACME CORP`
 * (the transformed one). Because those differ, React assigns `input.value` on
 * commit — and assigning `value` collapses the selection to the end of the
 * field. Nothing restores it, so every correction mid-word throws the user to
 * the end of the line.
 *
 * It only bites when the transform actually CHANGES the text, which is why it
 * looks intermittent: typing an already-uppercase character is a no-op and the
 * caret behaves.
 *
 * ## The fix
 *
 * Record where the caret was as the change is handled, then put it back in a
 * layout effect — after React has written `value`, before the browser paints,
 * so there is no visible jump. Same capture-then-restore idiom the `Input`
 * primitive already uses to roll back a rejected decimal keystroke.
 *
 * ## Length-changing transforms
 *
 * The caret index is only meaningful when the transform preserves length.
 * `toUpperCase()` normally does, but not always — German `ß` uppercases to
 * `SS`, and some ligatures expand too. When the length changes, the offset is
 * dropped and the browser's own end-of-field placement stands, which is the
 * correct fallback for an edit that inserted characters.
 *
 * ## Usage
 *
 * ```tsx
 * const nameInput = useTransformedInput((v) => v.toUpperCase(), (v) => {
 *   setName(v)
 *   clearError("name")
 * })
 *
 * <Input value={name} {...nameInput} />
 * ```
 *
 * @param transform Applied to the raw input value on every change.
 * @param onValue   Receives the transformed value — set your state here.
 */
export function useTransformedInput(
  transform: (value: string) => string,
  onValue: (value: string) => void,
) {
  const ref = useRef<HTMLInputElement | null>(null);
  // Where to put the caret after the next commit; null means "leave it alone".
  const caretRef = useRef<number | null>(null);

  // No dependency array: this must run after EVERY commit that a change may
  // have caused. `caretRef` is cleared on each run, so it acts exactly once per
  // edit and never fights the user's own clicks or selections.
  useLayoutEffect(() => {
    const el = ref.current;
    const caret = caretRef.current;
    caretRef.current = null;
    if (el == null || caret == null) return;
    // Don't steal the caret into a field the user has already left.
    if (document.activeElement !== el) return;
    // Already where it belongs (transform was a no-op) — touching the selection
    // would needlessly collapse a range the user is holding.
    if (el.selectionStart === caret && el.selectionEnd === caret) return;
    const pos = Math.min(caret, el.value.length);
    try {
      el.setSelectionRange(pos, pos);
    } catch {
      /* selection unsupported on this input type — ignore */
    }
  });

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    const next = transform(raw);
    // Only restore when the transform is length-preserving (see above).
    caretRef.current = next.length === raw.length ? event.target.selectionStart : null;
    onValue(next);
  };

  return { ref, onChange };
}
