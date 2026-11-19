# Frontend — Per-Module Task Lists

**Date:** 2026-04-22
**Covers:** Module-level frontend work after Phase 1 scaffold — Identity, IMS, CRM, OMS, Procurement, WMS (incl. refurb).
**Pattern:** Every module page follows the same skeleton — a TanStack Query hook, a DataTable listing, a detail route, a create/edit form. Deviations called out per page.

---

## Module page recipe (reused across every page)

For each module, per page:

1. **API hooks** in `src/modules/<m>/api/hooks.ts` — `useList<Entity>()`, `use<Entity>Detail(id)`, `useCreate<Entity>()`, `useUpdate<Entity>()`. Use the generated API client via `unwrap()`.
2. **Listing page** — `DataTable` bound to the list hook, with filter drawer and pagination.
3. **Detail page** — fetches `use<Entity>Detail(id)`, renders sections per the entity's fields.
4. **Create / edit form** — dialog or page with React Hook Form + Zod schema + error mapping from API.
5. **Tests** — at least one component test for the form (happy path + validation error + API error). One E2E for each critical flow.

Scopes are passed to `RequireScope` route guards per the auth matrix in the backend spec.

---

## Phase 2 — Identity pages

- [ ] Login page (done in scaffold Task 12).
- [ ] Logout action in the app header.
- [ ] "Current user" badge — reads `useCurrentUser()` from TanStack Query.
- [ ] Admin: users list (visible only to `identity:user:read` scope).
- [ ] Admin: create user form.
- [ ] Admin: assign category scope (multi-select IMS categories; only for scoped roles).

Integration with theme: use the existing user-menu dropdown UX pattern.

---

## Phase 3 — IMS pages

Pages, each following the module recipe:

- [ ] Categories — tree view on the left, CRUD on the right. Reuse a shadcn `Collapsible` for nesting.
- [ ] OEMs — flat list + create/edit.
- [ ] Parts — list with filters (category, oem, brand, active), detail page with aliases + pricing + PM assignment.
- [ ] Pricing — per part, show variant × tag × currency matrix; edit in-place calls `PATCH /ims/pricing/{id}` and renders updated history.
- [ ] PM assignments — table by (category, subcategory, oem, variant_scope, pm_user).

Frontend-specific rule: any PM-role user sees only assigned data (backend filters; frontend just displays).

---

## Phase 4 — CRM pages

- [ ] Accounts list + detail (with contacts, related deals, related leads tabs).
- [ ] Contacts under an account.
- [ ] Leads list with stage filter (`All`, `New`, `Contacted`, `Qualified`, `Procurement`, `Cold`, `Proposal`, `Negotiation`, `Closed Won`, `Closed Lost`, `Rejected`).
- [ ] **Rejected leads queue** — dedicated page at `/crm/leads/rejected` showing only `stage=Rejected`. Manager can reinstate inline.
- [ ] Lead detail — timeline of activities, actions (reject / reinstate / convert to deal).
- [ ] Deals list + detail + stage transitions.
- [ ] Quotes list + detail + versioning (create new version of existing quote; old auto-marked `Expired`).
- [ ] Demo requests — list + detail + PM approval action + return disposition.
- [ ] Material inquiries — list + detail + response thread.

Use existing theme repo pages as visual reference. Many components can be ported with light refactoring to call hooks instead of mock data.

---

## Phase 5 — OMS pages

- [ ] Sales Orders list with status chips + filter.
- [ ] SO detail — header, line items (including config_action badges: `STANDARD` / `ADD` / `REMOVE` / `SWAP`), approval action, stock availability panel.
- [ ] Action buttons conditional on status + user scope.
- [ ] Approval panel surfaces stock-check result inline (counts + shortfall).

Deep link from a Deal/Quote detail → the SO created from it.

---

## Phase 6 — Procurement pages

- [ ] Vendors list + detail with categories + bank details + ratings.
- [ ] PR list + detail with approval step chain visualization (Radix `Stepper`-style).
- [ ] PO list + detail with line items + send-to-vendor action.
- [ ] GRN matching page — shows PO items against received qty; highlight discrepancies.

---

## Phase 7 — WMS base pages

- [ ] Warehouses list + tree (warehouse > row > rack > bin) with capacity badges.
- [ ] Inward batches list + detail (devices created, inspection assignment).
- [ ] Devices list — rich filter: status, condition (once Phase 8 is live), part, warehouse.
- [ ] Device detail page — structured sections: identity, location, status/movements timeline, inspections, repairs, QC records.
- [ ] Outward list + detail + pick/pack/QC actions.
- [ ] Returns list + detail + resolve action (restock / repair / scrap).

---

## Phase 8 — WMS refurb UI (scanner-optimized)

**This is the highest-UX-complexity page set — scanner-first, low-latency, undo-friendly.**

### Disassembly Workstation (`/wms/disassembly`)

- [ ] New operation form — pick parent device (scan barcode), trigger type, optional `linked_so_id`.
- [ ] Active operation view:
  - Header: parent serial, started-at, extracted count, `Complete` + `Cancel` buttons
  - Scan input (auto-focused) — on enter, `POST /extract`. Row appears below with part, serial, status "PENDING_INSPECTION", undo button.
  - Undo removes a misscanned row (calls `DELETE /extract/{id}`).
  - Complete dialog: `chassis_disposition` radio (EMPTY_CHASSIS / SCRAPPED) + reason textarea if scrap.
- [ ] List of prior operations (completed + cancelled).

### Reassembly Workstation (`/wms/reassembly`)

- [ ] Mirror of disassembly — pick empty chassis, scan children to install. Shows running list.
- [ ] Override flag for `force_install_faulty` (gated on manager scope) with mandatory reason.
- [ ] Complete dialog — requires `installed_count >= 1` (button disabled until).

### Stock Summary (`/wms/stock`)

- [ ] Table: part → counts by condition (HEALTHY / FAULTY / DAMAGED / OBSOLETE) × status (in-stock / installed / in-flight / scrapped).
- [ ] Click-through → devices list pre-filtered.
- [ ] Toggle: "Include installed in count view?" → reflects backend `include_installed` param.

### Faulty Stock Review (`/wms/stock/faulty`)

- [ ] Cross-SKU faulty list; PM can bulk-action (scrap / move to repair).

### Device Lineage (`/wms/devices/{id}/lineage`)

- [ ] Vertical timeline showing:
  - Born-from provenance (linked parent serial if not null)
  - Install history (parent, install reason, installed → removed period, remove reason)
  - Event log (expandable rows with metadata JSON)

### Composition View (on Device Detail page for `ASSEMBLED_PARENT` devices)

- [ ] Tree/table of currently-installed components: serial, part, condition (badge if FAULTY), installed-at.
- [ ] Quick-action: swap (opens reassembly-style dialog scoped to this parent — behaviour in Phase 9).

---

## Phase 9 — Outward + billing bridge + part-swap UI

(Matches backend Phase 9.)

- [ ] Outward QC workstation — scanner-first; PASS/FAIL per device.
- [ ] Ready-for-billing queue — shown to billing role, items awaiting release.
- [ ] Billing release action — confirms release, records invoice number.
- [ ] Dispatch execution — vehicle/driver/tracking form, on submit moves all devices to DISPATCHED.
- [ ] Part-swap-at-outward dialog — pick the device to remove (scan), pick the replacement (scan), choose reason. Triggers backend swap endpoint.

---

## Cross-cutting

- [ ] Global toast system for API errors (mount once in `AppProviders`).
- [ ] Idempotency-Key generator — `src/shared/api/idempotency.ts` generates a uuid-v4 per mutation call; wrap in the API client.
- [ ] Optimistic updates where cheap (condition change, simple toggles). Never for multi-row workflows (disassembly extract) — those wait for the server roundtrip because the response carries the authoritative new row.
- [ ] A11y: every form field labelled, every button has an accessible name, keyboard navigation works end-to-end.
- [ ] Responsive: pages degrade gracefully on tablet (1024×768). Mobile is not a v1 target.

---

## Suggested delivery order

1. Phase 1 scaffold (separate plan).
2. Identity (login / user menu) — can't do anything without auth.
3. IMS + CRM pages in parallel — they're decoupled.
4. OMS pages — builds on CRM.
5. Procurement pages — decoupled, can run anytime after Phase 1.
6. WMS base — after OMS/Procurement, because they feed it.
7. WMS refurb workstation pages — biggest UX investment, do last.
8. Outward + billing bridge — wraps the flow.

Each phase has its own PR with matching backend phase. Keep frontend/backend phases tightly paired so integration is continuously tested.
