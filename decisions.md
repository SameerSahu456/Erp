
## 2026-10-26 — Frontend: Back on the agreement detail page

- **Decision:** The agreement page passes its own `onBack` through `SoDetailHeaderOverrides`, reusing `lastRecentLocation` with a skip rule covering `/rentals/agreements/…`, `/rentals/sales-orders/…` and `/crm/sales-orders/…`, falling back to the agreements list.
- **Alternatives considered:** Make CRM's `goBack` skip rentals routes too; drop the recent-location logic and always navigate to the list.
- **Reasoning:** CRM's hook should not know rentals' routes. Always going to the list would lose the "step back to where you came from" behaviour the CRM page has (list at page 3, account tab).
- **Trade-offs accepted:** The skip regex is duplicated in spirit between the two pages.
- **Related request:** "why is the back button not working from the agreements detail page".
