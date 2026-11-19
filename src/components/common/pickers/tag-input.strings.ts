// User-facing copy for the TagInput component.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy).
export const TAG_INPUT_STRINGS = {
  // Accessible label on the individual chip remove buttons.
  // Dynamic: `Remove <tag>`.
  removeTag: (tag: string) => `Remove ${tag}`,
  // Field-level clear button.
  clearAll: {
    ariaLabel: "Clear all tags",
    title: "Clear all",
  },
} as const
