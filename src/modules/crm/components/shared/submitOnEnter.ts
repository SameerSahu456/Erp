import type { KeyboardEvent } from 'react'

// Textarea keydown handler factory: Enter submits, Shift+Enter inserts a
// newline. Used by the Notes composer + inline note editor (plain textareas,
// no @-mention picker). The supplied `onSubmit` owns the empty-content guard.
//
// `isComposing` is honoured so pressing Enter to commit an IME candidate
// (e.g. CJK input) doesn't accidentally post the note.
export function submitOnEnter(onSubmit: () => void) {
  return (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      onSubmit()
    }
  }
}
