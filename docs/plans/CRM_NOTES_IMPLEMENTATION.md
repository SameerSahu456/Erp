# CRM Notes API Integration — Implementation Plan

**Status:** Draft, awaiting sign-off
**Owner:** Frontend
**Backend:** Already shipped (see `comprint-erp-backend/app/modules/crm/api/v1/endpoints.py:1759-1825`)
**Pages affected:** `/crm/leads/:id` (LeadDetailPage), `/crm/deals/:id` (DealDetailPage)
**Reusable components:** `NotesSection` is the shared UI; both pages mount it.

---

## 1. Scope & Goals

Replace the in-memory mock notes UI (`NotesSection.tsx` driven by `data/notes.ts`) with the live polymorphic notes API for the **lead** and **deal** entity types. Account / contact notes are out of scope for this ticket but the work should leave the door open to extend (one component, one hook family, one entity_type prop).

**In scope:**
1. List notes for a lead/deal — `GET /api/v1/crm/{entity_type}/{entity_id}/notes`
2. Create a note — `POST /api/v1/crm/{entity_type}/{entity_id}/notes`
3. Edit a note — `PATCH /api/v1/crm/notes/{note_id}` (within the configured edit window)
4. Soft-delete a note — `DELETE /api/v1/crm/notes/{note_id}`
5. Mount `NotesSection` on `LeadDetailPage` (currently has a "Lead Notes" tab driven by structured `lead.notes` JSON; we add a separate user-notes section alongside or in a tab)
6. Surface backend permission/window errors as clean toasts (only-author edits, edit-window expired)
7. Pagination via offset/limit; load 50 at a time, "Load more" button at the end

**Out of scope:**
- @mention rendering / picker (backend extracts mentions from `@<uuid>` tokens; frontend can ship plain text first and add the picker UI in a follow-up — the wire format already accepts it)
- Comments (separate `/comments` endpoint with its own threading rules — separate ticket)
- Realtime updates / websocket
- Account & contact notes UI wiring (component already supports them, just no consumers yet)
- Migrating the structured `lead.notes` JSON object on the lead form — that's a different concept (pre-defined fields on the lead body) and stays as-is

---

## 2. Backend contract (verified live, 2026-05-07)

Source: `comprint-erp-backend/app/modules/crm/api/v1/endpoints.py:1759-1825`,
schemas in `app/modules/crm/schemas/note.py`,
service rules in `app/modules/crm/services/note_service.py`.
Live OpenAPI confirmed at `http://localhost:8000/openapi.json`.

| Method | Path | Purpose | RBAC |
|---|---|---|---|
| `GET`  | `/api/v1/crm/{entity_type}/{entity_id}/notes?limit=50&offset=0` | List notes oldest-first paginated by offset | `CRM_READ` |
| `POST` | `/api/v1/crm/{entity_type}/{entity_id}/notes` | Create a note + fire mention notifications | `CRM_MANAGE` |
| `PATCH`| `/api/v1/crm/notes/{note_id}` | Edit content; only author, only within edit window | `CRM_MANAGE` |
| `DELETE` | `/api/v1/crm/notes/{note_id}` | Soft-delete; author or superuser only | `CRM_MANAGE` |

### 2.1 Wire shapes

**`NoteCreate` / `NoteUpdate`** (request body):
```jsonc
{ "content": "string" }
```

**`NoteResponse`** (each list item / create response / update response):
```jsonc
{
  "id": "uuid",
  "entity_type": "lead" | "deal" | "account" | "contact",
  "entity_id": "uuid",
  "content": "string",
  "mentions": ["uuid-as-string", ...],   // extracted server-side; not user-supplied
  "created_by_id": "uuid" | null,
  "created_at": "2026-05-07T10:23:49.291Z",
  "updated_at": "2026-05-07T10:23:49.291Z"
}
```

### 2.2 Service rules (frontend must respect)

- **Edit ownership**: `PATCH` returns `403 ForbiddenError` ("Only the note author can edit this note") if `created_by_id !== current_user.id`. Hide the Edit button for non-author rows.
- **Edit window**: `PATCH` returns `403 ForbiddenError` ("Edit window has expired") past `note_edit_window_minutes` after `created_at`. Setting the window to 0 disables editing entirely. We don't know the window value client-side — show the Edit button for the author and let the toast surface the error if expired. (Optional: expose the window via `/api/v1/auth/me` and gate locally — see follow-up §6.)
- **Delete ownership**: `DELETE` allows the author OR a superuser. We can show the Delete button for both; non-author non-superuser users get a 403 toast on click.
- **Mentions are server-extracted**: do NOT send a `mentions` field; backend parses `content` for `@<uuid>` tokens and writes `mentions[]` itself. Out of scope here, but the wire is ready for it.
- **No `entity_type` validation list**: backend accepts any string (`lead`, `deal`, `account`, `contact` are documented; the model column is `String(100)`). Frontend MUST type the prop as `"lead" | "deal" | "account" | "contact"` so we can't silently send a typo.

### 2.3 ⚠️ Compatibility notes

- **The list returns `list[NoteResponse]`, NOT a paginated envelope.** The endpoint accepts `limit`/`offset` but the response is a bare array (no `total`). We can't render an absolute "X of Y" — only "loaded 50, request next 50". The Load-more sentinel checks `data.length < limit` to know when there's no next page (heuristic).
- Backend orders by ascending `created_at` (chronological). Most note UIs show newest-first — we either sort client-side after fetch (cheap, single page is small) or accept oldest-first per the API.
- `created_by_id` may be `null` for system-generated notes. Render "System" in that case.

---

## 3. Files to add / change

```
src/shared/api/
└── endpoints.ts                              [MODIFY] add crm.entityNotes / crm.note routes

src/modules/crm/
├── api.ts                                    [MODIFY] add Note types + 4 fetchers
├── hooks/
│   └── useNotes.ts                           [NEW]    list / create / update / delete
├── components/
│   └── NotesSection.tsx                      [REWRITE] swap mock for useNotes hooks; honor author + window rules
├── data/
│   └── notes.ts                              [DELETE-OR-DEPRECATE] migrate any other consumer first
└── pages/
    ├── LeadDetailPage.tsx                    [MODIFY] mount <NotesSection entityType="lead" entityId={lead.id} />
    └── DealDetailPage.tsx                    [VERIFY] already mounts <NotesSection entityType="deal" /> — should "just work"
```

No backend changes. No new routes. No new dependencies.

---

## 4. Step-by-step plan

Each phase ends with `pnpm typecheck && pnpm lint` and a manual smoke step.

### Phase 0 — Pre-flight

0.1 Live OpenAPI already verified — endpoints + shapes confirmed (§2).
0.2 Run `pnpm api:gen` if backend has changed since last typegen so `components["schemas"]["NoteResponse"]` exists.
0.3 Confirm with user — sign off on §2.3 caveats (no envelope, ordering, edit-window UX without a `me`-side window value).

### Phase 1 — Endpoint registry

`src/shared/api/endpoints.ts` — extend the `crm` namespace:

```ts
crm: {
  // ...existing routes...
  // Polymorphic-entity routes (entity_type: "lead" | "deal" | "account" | "contact").
  entityNotes:    (entityType: string, entityId: string) =>
                    `${BASE}/crm/${entityType}/${entityId}/notes`,
  note:           (id: string) => `${BASE}/crm/notes/${id}`,
}
```

### Phase 2 — Types + fetchers in `src/modules/crm/api.ts`

```ts
// Mirrors backend NoteResponse (schemas/note.py:19).
export type NoteEntityType = "lead" | "deal" | "account" | "contact"

export interface CrmNoteWire {
  id: string
  entity_type: NoteEntityType
  entity_id: string
  content: string
  mentions: string[]               // backend extracts; not user-supplied on POST/PATCH
  created_by_id: string | null     // null for system-generated notes
  created_at: string
  updated_at: string
}

export interface FetchNotesParams {
  limit?: number   // backend accepts 1..200, default 50
  offset?: number
}

export interface NoteCreatePayload { content: string }
export interface NoteUpdatePayload { content: string }

// GET /api/v1/crm/{entity_type}/{entity_id}/notes
// Backend returns a bare list (NOT a paginated envelope). Caller manages
// "load more" by tracking offset client-side.
export async function fetchEntityNotes(
  entityType: NoteEntityType,
  entityId: string,
  params: FetchNotesParams = {},
): Promise<CrmNoteWire[]>

// POST /api/v1/crm/{entity_type}/{entity_id}/notes
export async function createEntityNote(
  entityType: NoteEntityType,
  entityId: string,
  body: NoteCreatePayload,
): Promise<CrmNoteWire>

// PATCH /api/v1/crm/notes/{note_id}
export async function updateNote(
  noteId: string,
  body: NoteUpdatePayload,
): Promise<CrmNoteWire>

// DELETE /api/v1/crm/notes/{note_id}
export async function deleteNote(noteId: string): Promise<void>
```

All four go through `apiClient` so the `ApiResponse` envelope is unwrapped.

### Phase 3 — Hooks (`src/modules/crm/hooks/useNotes.ts`)

```ts
const NOTES_KEY = ["crm", "notes"] as const
// One list query per (entityType, entityId) + paging shape.
const listKey = (entityType: NoteEntityType, entityId: string, params: FetchNotesParams) =>
  [...NOTES_KEY, "by-entity", entityType, entityId, params] as const
```

**Hooks to expose:**

- `useEntityNotes(entityType, entityId, params)` — `useQuery` over `fetchEntityNotes`. Inherits global `staleTime: 0 + refetchOnMount: 'always'` from §6.5.1; do **not** override.
- `useCreateNote(entityType, entityId)` — `useMutation`; on success: `invalidateQueries({ queryKey: [...NOTES_KEY, "by-entity", entityType, entityId] })`.
- `useUpdateNote(entityType, entityId)` — `useMutation((args: { noteId, content }) => updateNote(args.noteId, { content: args.content }))`; same invalidation.
- `useDeleteNote(entityType, entityId)` — `useMutation((noteId: string) => deleteNote(noteId))`; same invalidation.

**Key design choice — bind `entityType` + `entityId` to the mutation hooks**, not just to the queries. The `PATCH /notes/{id}` and `DELETE /notes/{id}` endpoints don't carry the entity type in the URL, but our cache keys do. Without binding, the mutation can't invalidate the right list query without an extra round-trip. Binding at hook-call time keeps the API simple.

### Phase 4 — Rewrite `NotesSection.tsx`

Replace the mock-driven implementation with the new hooks. Preserve the existing visual shell (textarea + add button + list of cards with edit/delete icons). Changes:

- Drop `import { mockNotes } from '../data/notes'`. Drop the local `useState<Note[]>` and `Note` type from `'../types'`.
- Add `const auth = useAuth()` (or however the current user is exposed) so we can show/hide Edit and Delete based on `created_by_id === auth.user.id`. If `useAuth` is not the right hook, look up `useCurrentUser()` in the codebase — every existing CRM detail page consumes it.
- Wire query: `const { data, isLoading, isError } = useEntityNotes(entityType, entityId, { limit: 50, offset: 0 })`.
- Render states: skeleton → empty state (existing dashed-border block) → list. Surface error inline ("Failed to load notes — try again").
- Sort newest-first client-side after fetch (`[...notes].sort((a,b) => b.created_at.localeCompare(a.created_at))`) since backend returns oldest-first per §2.3.
- Add: `<Button onClick={loadMore}>Load more</Button>` only when the last page returned `>= limit` rows. Maintain a local `offset` state.
- Author / timestamp footer: render the user's display name from a hydrated lookup. Backend returns only `created_by_id`. Use `useUser(created_by_id)` (already exists in `@modules/users`) — but only if rendering the name is required. Otherwise show the id-stub or "Unknown" until the lookup arrives. **Recommendation:** ship a small `<NoteAuthor userId={...} />` cell that calls `useUser(userId)` and falls back to "Loading…" / id-truncated. Cheap, isolated, and the cache is shared.
- Editing: only show the pencil if `note.created_by_id === currentUser.id`. The window is enforced server-side; on click → 403 toast if expired.
- Deleting: show the trash for author OR superuser (we have `is_superuser` on the user object). Backend rejects the rest; surface 403 toast if a non-author non-superuser slips through (defense in depth — should never happen given the gate).
- Optimistic update on add: the existing UX (newly added note appears immediately in the list above) should be preserved. Use `onMutate` per §6.6 OR just rely on `invalidate → refetch` and live with the small flicker. **Recommendation:** invalidate-only for v1 — optimistic is more code for marginal UX win on a single-server-trip mutation.
- Keep `entityType` typed as `NoteEntityType` (was `'lead' | 'deal' | 'account' | 'contact'`, equivalent).

### Phase 5 — Mount on `LeadDetailPage`

Currently the lead detail page has a "Notes" tab that renders the **structured** `lead.notes` JSON object (predefined fields filled in during lead creation). That's a separate concept from user-authored timeline notes. We add the new `<NotesSection>` either:

- **(A) As a separate "Discussion" tab** alongside "Notes" — clearer separation. Lead form's structured notes remain on the "Notes" tab; user-authored notes live on a new "Discussion" tab.
- **(B) Append to the existing "Notes" tab** below the structured-notes card — single place for everything notey, but mixes the two concepts.

**Recommendation: option (A).** The structured fields belong to the lead body (already saved via `PATCH /leads/{id}`); the polymorphic notes are CRUD'd separately. Mixing them in one tab will confuse the user about which save button does what.

```tsx
// LeadDetailPage tabs[]
const discussionContent = (
  <NotesSection entityType="lead" entityId={lead.id} />
)

// add to tabs:
{ id: 'discussion', label: 'Discussion', content: discussionContent },
```

### Phase 6 — Verify `DealDetailPage`

DealDetailPage already mounts `<NotesSection entityType="deal" entityId={deal.id} />` (line 671). After the rewrite, this should work unchanged. Smoke-test: open a deal, add a note, refresh, edit, delete.

### Phase 7 — Cleanup

7.1 Search for remaining `mockNotes` consumers. If only `NotesSection` referenced it → delete `data/notes.ts`. If other pages/components still use it → leave the file in place (out of scope) and add a TODO referencing this plan.
7.2 `pnpm lint && pnpm typecheck && pnpm test`.
7.3 Manual smoke per checklist (§5).

---

## 5. Smoke checklist

Run on a real dev backend with at least two seeded users and one lead + one deal:

- [ ] **Lead — empty state.** Open a lead with no notes → "No notes yet" empty state. Network shows `GET /api/v1/crm/lead/{id}/notes?limit=50&offset=0` → 200 with `[]`.
- [ ] **Add note.** Type → click Add → 201 in network → row appears at top of list (newest-first sort).
- [ ] **Edit own note.** Click pencil → textarea appears → save → 200 → "edited" badge visible. Refresh page → edit persists.
- [ ] **Edit window expired** (set `NOTE_EDIT_WINDOW_MINUTES=0` env on backend). Click Edit → save → toast: "Edit window has expired".
- [ ] **Edit other user's note.** Pencil button hidden for non-author rows. (If you force-trigger via dev tools: 403 toast.)
- [ ] **Delete own note.** Click trash → row disappears → refresh confirms. Backend log shows soft delete (`deleted_at` set).
- [ ] **Delete as superuser, on someone else's note.** Trash visible → click → 200 → row gone.
- [ ] **Pagination.** Seed >50 notes → "Load more" button appears → click → next 50 fetched (`offset=50`) → button disappears when last page returns <50 rows.
- [ ] **Deal page.** Repeat empty-state, add, edit, delete on `/crm/deals/:id`. Confirms the polymorphic prop works for both entity types.
- [ ] **Cache freshness.** After adding a note on the deal page, navigate to `/crm/deals` and back — list refetches and shows the new note (per global `refetchOnMount: 'always'`, §6.5.1).

---

## 6. Risks & follow-ups

| Risk | Mitigation |
|---|---|
| Edit-window value isn't exposed to the frontend, so we can't disable the Edit button after expiry — the user clicks and sees a toast. | Either (a) expose `note_edit_window_minutes` on `GET /api/v1/auth/me`, or (b) compute remaining time from `created_at` if we hardcode a sensible default. **Decision: ship the toast-on-error UX in v1, file backend follow-up to expose the window.** |
| Backend list response has no `total`, so pagination footer can't show "X of Y". | Use heuristic: hide "Load more" when last page returned `< limit` rows. Document. |
| `created_by_id` resolution (`useUser(id)`) makes one extra request per distinct author shown on screen. | TanStack Query dedups identical id queries automatically. With `<10` distinct authors per detail page this is fine. If it becomes a problem: backend follow-up to embed a `created_by_name` field on `NoteResponse`. |
| The structured `lead.notes` JSON on the lead body conflicts visually with the new Discussion tab. | Resolved by Phase 5 option A — they live on separate tabs. |
| @mention picker UX not built. | Backend already extracts mentions from `@<uuid>` tokens; ship a follow-up that adds a `<MentionInput>` component (Headless UI combobox over `useUserOptions`) and replace the plain Textarea once design signs off. |
| `NotesSection` is also typed for `account` and `contact` but no consumers exist. | Leave it. The hook + component are entity-agnostic; later tickets just `<NotesSection entityType="account" entityId={...}/>`. |

---

## 7. Decisions to confirm before coding

1. **LeadDetailPage tab layout** — separate "Discussion" tab (option A) vs append to existing "Notes" tab (option B)? **Recommend A.**
2. **Optimistic add** — invalidate-only or full optimistic? **Recommend invalidate-only for v1.**
3. **Authors lookup** — fire `useUser(id)` per visible note (TanStack dedups), or hold a single `Map<userId, name>` populated lazily? **Recommend per-note `useUser` — simpler, dedup is automatic, cache survives across pages.**
4. **Sort order** — newest-first (client-side flip) or backend's chronological default? **Recommend newest-first — most note UIs do this.**
5. **`mockNotes` fate** — delete after migration if no other consumers, or keep as a fixtures file? **Recommend delete if grep is clean.**

---

## 8. Out of scope (explicitly)

- Comments endpoint (`/api/v1/crm/{entity_type}/{entity_id}/comments`) — separate ticket.
- @mention picker / autocomplete UI.
- Account & contact notes UI — component already supports them; just no consumer pages wired.
- Realtime push of new notes from other users.
- Backend changes (none needed).
