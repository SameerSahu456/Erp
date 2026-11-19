// User-facing copy for the ERP Assistant (Coding-guideline §16.12).
export const ASSISTANT_STRINGS = {
  title: "ERP Assistant",
  subtitle: "Live ERP data",
  launcher: { open: "Open ERP Assistant", close: "Close ERP Assistant" },
  actions: {
    newChat: "Clear chat",
    history: "History",
    backToChat: "Back to chat",
    askAgain: "Ask again",
    clearHistory: "Clear history",
    close: "Close",
    expand: "Expand",
    collapse: "Collapse",
    send: "Send",
  },
  composer: {
    placeholder: "Ask about leads, orders, stock, rentals…",
    label: "Message the ERP Assistant",
  },
  empty: {
    heading: "What would you like to know?",
    body: "Ask about any ERP record. I count, list, group and calculate from the same data you can see, and I never change anything.",
    startersLabel: "Popular business questions",
  },
  // Each of these is a question the assistant answers in full (verified
  // against the backend's question parser) — keep the list to five.
  starters: [
    "Sales this month",
    "Deals by stage",
    "Average overdue days of rental devices",
    "How many laptops are in stock?",
    "Pending approvals",
  ],
  history: {
    title: "Question history",
    empty: "Questions you ask will be saved here, with their answers.",
    savedNote: "Answers are shown as they were when asked. Use Ask again for current figures.",
  },
  roles: { user: "You", assistant: "Assistant" },
  greeting: (name: string) => `Hello, ${name}`,
  chart: {
    offer: "Would you like to see this as a chart?",
    show: "Show chart",
    decline: "Not now",
    hide: "Hide chart",
  },
  status: { thinking: "Looking that up…" },
  suggestions: { label: "Suggested questions" },
  errors: {
    generic: "Something went wrong. Please try again.",
    network: "Couldn't reach the ERP. Check your connection and try again.",
  },
  disclaimer: "Live ERP data, limited to your access.",
} as const;
