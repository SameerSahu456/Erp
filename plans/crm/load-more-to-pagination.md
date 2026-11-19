
# Plan — Convert detail-page tab lists from "Load More" / infinite-scroll to numbered pagination

**Module:** CRM (Leads, Deals, Accounts, Contacts, Material Inquiry detail pages)
**Author:** (plan) — generated 2026-06-20
**Status:** Proposed — not started

---

## 1. Goal

On the CRM detail pages, the related-list **tabs** (Comments, Notes, Tasks, Quotes, Material
Inquiries, Invoices, …) currently load data with **infinite scroll** (an `IntersectionObserver`
sentinel that calls `fetchNextPage()`), shown to the user as a "scroll for more / loading more"
sentinel. We want to replace this with **numbered pagination** (Prev · 1 2 3 … N · Next +
"showing X–Y of Z") — the same control the list pages already use
(`TablePagination` / `CrmListPaginationFooter`).

Two hard requirements:

1. Every paginated tab must show a **real total count** ("showing 1–10 of 47"). Some endpoints
   (Comments, Notes) currently return a **bare list with no total**, so the backend must change.
2. **Notification deep-links must keep working** — clicking a notification that points at a
   specific comment / note / task must land the user on the **page that contains that row**, then
   scroll-and-highlight it. This works today by auto-paging through infinite scroll; under numbered
   pagination we must instead *jump directly to the correct page*.

---

## 2. Current state — inventory (verified against code)

| Module tabs | Section component | Data hook | Endpoint | Pagination today | Returns `total`? | Deep-link target? |
|---|---|---|---|---|---|---|
| Comments (Lead/Deal/Account/Contact/MI) | `components/common/views/CommentSection.tsx` | `hooks/shared/useComments.ts` → `useEntityComments` | `GET /crm/{entity_type}/{entity_id}/comments` | Infinite scroll (sentinel) | ❌ **bare list** | ✅ `#comment-<id>` |
| Notes | `components/crm/.../shared/NotesSection.tsx` | `hooks/shared/useNotes.ts` → `useEntityNotes` | `GET /crm/{entity_type}/{entity_id}/notes` | Infinite scroll (sentinel) | ❌ **bare list** | ✅ `#note-<id>` |
| Tasks | `components/crm/.../tasks/TasksSection.tsx` | `hooks/tasks/useTasks.ts` → `useTasks` | `GET /crm/{entity_type}/{entity_id}/tasks` | Infinite scroll (sentinel) | ✅ `{items,total,limit,offset}` | ✅ `#task-<id>` |
| Quotes | `components/crm/.../quotes/QuoteSection.tsx` | `useQuotesInfinite` | `GET /crm/quotes` (filtered) | Infinite scroll (sentinel) | ✅ `{items,total}` | ❌ |
| Material Inquiries | `components/crm/.../material-inquiries/MaterialInquirySection.tsx` | `useMaterialInquiriesInfinite` | `GET /crm/material-inquiries` (filtered) | Infinite scroll (sentinel) | ✅ `{items,total}` | ❌ |
| Invoices (Deal tab) | `components/crm/.../deals/DealInvoicesTab.tsx` | **none — static mock** (`../../data/invoices`) | — | none (renders mock array) | n/a | ❌ |
| Activity feed | `components/crm/.../shared/ActivityFeed.tsx` | `hooks/shared/useActivities.ts` | `GET /crm/.../activities` | Infinite scroll — **cursor based** (`before_id` / `next_cursor` / `has_more`) | ❌ (cursor) | ❌ |
| Audit trail | `components/crm/.../shared/AuditTrail.tsx` | (parent passes `onLoadMore`/`hasMore`) | audit endpoint | Infinite scroll (sentinel) | varies | ❌ |

### Reusable pieces that already exist (reuse, don't rebuild)

- **`components/common/tables/TablePagination.tsx`** — full numbered pager with Prev/Next, sliding
  window with ellipsis, "showing X–Y of Z", optional page-size `<Select>`. Props: `page`,
  `totalPages`, `pageSize`, `total`, `isFetching`, `onPageChange`, `onPageSizeChange?`.
- **`components/crm/.../shared/CrmListPaginationFooter.tsx`** — compact numbered footer already used
  by CRM card lists (tasks/meetings index pages). Props: `page`, `totalPages`, `rangeStart`,
  `rangeEnd`, `total`, `isFetching`, `noun`, `onPageChange`. **Best fit for card-style tab lists**
  (Comments, Notes, Tasks).
- **`shared/hooks/useUrlPagination.ts`** — URL-backed `page` + page-size. Note caveat in §6.
- **`shared/constants/pagination.ts`** — `PAGINATION.DEFAULT_PAGE_SIZE = 10`,
  `PAGE_SIZE_OPTIONS = [10,25,50,100]`. Single source per §16.6.
- **`shared/notifications/use-scroll-to-hash-target.ts`** — the deep-link scroll/highlight hook
  (currently drives auto-paging; will be adapted, see §5).

---

## 3. Guideline conflict to resolve first (blocking)

`Coding-guideline.md §16.11` (and the inline comments in `useNotes.ts` / `useComments.ts`) currently
state *"paginated lists in the UI MUST be infinite-scrolled, not button-driven."* This plan
deliberately reverses that for **detail-page related-list tabs**.

Per `CLAUDE.md`: *"If your change conflicts with the guideline, update the guideline in the same PR."*

**Task 0 (do first):**
- Amend `Coding-guideline.md` §16.7 / §16.11 to state: *list **pages** use numbered server
  pagination (`TablePagination`); detail-page related-list **tabs** also use numbered pagination
  via `CrmListPaginationFooter`; infinite scroll remains the pattern only for **API-backed
  dropdowns/pickers** and the **kanban / status-bucket** views.*
- Update the inline `§16.11` references in `useComments.ts` and `useNotes.ts` comments.

---

## 4. Backend changes

> Reference pattern already in the codebase: **Tasks**.
> `task_repository.py` has both `list_for_entity` **and** `count_for_entity`; the endpoint
> `GET /{entity_type}/{entity_id}/tasks` returns `TaskListResponse{items,total,limit,offset}`
> (see `app/modules/crm/api/v1/endpoints.py:3187`). Mirror this for Comments and Notes.

### 4A. Add `total` to Comments and Notes list endpoints

**Comments**

1. `app/modules/crm/repositories/comment_repository.py` — add `count_for_entity(entity_type, entity_id) -> int`
   using `select(func.count())` over the same `_sd_filter` + `where(entity_type, entity_id)` predicate
   (mirror `task_repository.count_for_entity`, lines ~49–65).
2. `app/modules/crm/services/comment_service.py` — change `list_for_entity` to also call the new
   count and return `(items, total)`.
3. `app/modules/crm/schemas/comment.py` — add a `CommentListResponse(items: list[CommentResponse],
   total: int, limit: int, offset: int)` (mirror `TaskListResponse`). *Alternatively* reuse the
   shared `PaginatedResponse[T]` from `app/shared/schemas/common.py` (`items/total/page/page_size`).
   **Pick the `{items,total,limit,offset}` shape to stay consistent with Tasks.**
4. `app/modules/crm/api/v1/endpoints.py:3286` `list_comments` — return
   `ApiResponse[CommentListResponse]` instead of `ApiResponse[list[CommentResponse]]`.

**Notes** — identical change set:

1. `note_repository.py` — add `count_for_entity`.
2. `note_service.py` — return `(items, total)`.
3. `schemas/note.py` — add `NoteListResponse{items,total,limit,offset}`.
4. `endpoints.py:3217` `list_notes` — return `ApiResponse[NoteListResponse]`.

⚠ **Breaking response-shape change.** `list_comments` / `list_notes` go from a bare array to an
envelope. Frontend `api/comments.ts` + `api/notes.ts` + the hooks must change in the same PR (§5),
and `pnpm api:gen` must be re-run to refresh `schema.gen.ts`.

### 4B. Add a "locate" capability for deep-linkable rows (Comments, Notes, Tasks)

To jump straight to the page containing a deep-linked row, the frontend needs the row's **position**
in the list ordering. Add a cheap count-based locate per resource.

For each of Comments, Notes, Tasks, add a repository method:

```
async def index_in_entity_list(entity_type, entity_id, target_id) -> int | None
    # 0-based position of target_id within the SAME ordering the list uses
    # (comments/tasks: created_at DESC; notes: created_at DESC as rendered).
    # = COUNT(rows of this entity that sort strictly before target_id)
    # return None if the row isn't found / is soft-deleted.
```

Expose it via a lightweight endpoint per resource, e.g.:

```
GET /crm/{entity_type}/{entity_id}/comments/{comment_id}/position  -> {index: int}
GET /crm/{entity_type}/{entity_id}/notes/{note_id}/position        -> {index: int}
GET /crm/tasks/{task_id}/position?entity_type=&entity_id=          -> {index: int}
```

The frontend computes `page = floor(index / pageSize) + 1`. (Putting the math on the FE keeps the
endpoint page-size-agnostic; alternatively accept `?page_size=` and return `{page}` directly.)

> **Cheaper alternative if a dedicated endpoint is unwanted:** skip 4B entirely and have the FE
> page-walk on deep-link (fetch page 1, 2, 3 … until the row appears, then stop on that page) — same
> idea as today's auto-paging, just bounded by numbered pages. Slower for old rows but zero new
> endpoints. Recommend the locate endpoint for Comments/Notes/Tasks since notifications routinely
> point at old rows; the page-walk fallback is acceptable for a v1.

### 4C. Activity feed (optional / later)

`ActivityFeed` is **cursor-paginated** (`before_id` / `next_cursor` / `has_more`) — there is no
offset and no total, so it can't become numbered pagination without a backend redesign
(add offset+count). **Out of scope** for the first pass; leave as infinite scroll and call it out.

---

## 5. Frontend changes

General recipe per section (replace the IntersectionObserver block with a footer):

1. Switch the data hook from `useInfiniteQuery` → `useQuery` (one page at a time), OR keep the
   infinite hook but drive it page-by-page. **Recommend a plain `useQuery`** keyed on
   `(entityType, entityId, page, pageSize)` returning `{items, total}`.
2. Add local page state: `const [page, setPage] = useState(1)` and
   `const pageSize = PAGINATION.DEFAULT_PAGE_SIZE`. (Local state, **not** `?page` URL param — see §6.)
3. Compute `totalPages = Math.ceil(total / pageSize)`, `rangeStart`, `rangeEnd`.
4. Remove the `sentinelRef` + `IntersectionObserver` `useEffect` and the "scroll for more" sentinel.
5. Render `<CrmListPaginationFooter …>` (card lists) or `<TablePagination …>` (table lists) below the
   list, only when `total > pageSize`.
6. On a successful **create** mutation, `setPage(1)` so the user sees the newest row (lists are
   newest-first).
7. Keep loading/empty/error states (§9). Empty state unchanged.

### Per-component work

| Component | Hook change | Footer | Notes |
|---|---|---|---|
| `CommentSection.tsx` | `useEntityComments` → page-based `useEntityComments(…, {page})` returning `{items,total}` | `CrmListPaginationFooter` | Has **two layouts**: `comments` (paged footer) and `chat` (the MI "Messages" tab — keep scroll/thread UX; pagination here is awkward, consider leaving chat variant as-is or "load older" button). Decide per §7. |
| `NotesSection.tsx` | `useEntityNotes` → page-based `{items,total}` | `CrmListPaginationFooter` | Straightforward. |
| `TasksSection.tsx` | `useTasks` already returns `{items,total}`; swap `useInfiniteQuery`→`useQuery` with `offset=(page-1)*size` | `CrmListPaginationFooter` | **No backend change needed.** |
| `QuoteSection.tsx` | `useQuotesInfinite` → `useQuotes` page-based (`{items,total}` already there) | `TablePagination` (it's a `<Table>`) | Backend already returns total. |
| `MaterialInquirySection.tsx` | `useMaterialInquiriesInfinite` → page-based | `TablePagination` / footer | Backend already returns total. |
| `DealInvoicesTab.tsx` | **none** | optional | Currently **static mock data**. Either leave as-is, or (if it should be live) wire a real invoices-by-deal endpoint first — separate task, flag to product. |
| `ActivityFeed.tsx` | — | — | **Leave infinite (cursor).** Out of scope (§4C). |
| `AuditTrail.tsx` | — | — | Out of scope unless requested; audit endpoint pagination shape needs checking. |

### API + hook layer edits

- `api/comments.ts` — `fetchEntityComments` returns `CommentListResponse` ({items,total}); add page→offset
  mapping. Update `CrmCommentWire` import of the new envelope type (regen via `pnpm api:gen`).
- `api/notes.ts` — same.
- `hooks/shared/useComments.ts`, `hooks/shared/useNotes.ts`, `hooks/tasks/useTasks.ts` — replace
  `useInfiniteQuery` with `useQuery`; drop `getNextPageParam`; keep query keys stable
  (add `page`/`pageSize` to the key). **Do not** set `staleTime`/`retry` per hook (§6.5.1).

---

## 6. Notification deep-link — make it work under pagination (the key requirement)

**Today:** `useScrollToHashTarget` reads the URL hash (`#comment-<id>` / `#note-<id>` / `#task-<id>`),
and if the row isn't in the DOM it calls `loadMore()` repeatedly (auto-paging through infinite
scroll) until the row appears, then scrolls + flashes a highlight ring (1.8s).

**Under numbered pagination** there is no `loadMore` to walk — we must compute the target's page and
`setPage` to it. Design:

1. **Adapt `useScrollToHashTarget`** to accept a paginated mode:
   ```
   useScrollToHashTarget({
     ready: items.length,            // re-runs when the rendered page changes
     expectedPrefix: 'comment',      // unchanged
     // NEW (paginated mode) — supply instead of loadMore:
     locateAndGoToPage: async (targetId) => { … setPage(targetPage) },
   })
   ```
   Behaviour: if the element `#<prefix>-<id>` is **already in the current page's DOM** → scroll +
   highlight (unchanged). If **not present** and `locateAndGoToPage` is provided → call it once per
   hash (guard with the existing `lastHandledRef`), which fetches the row's index and `setPage()`s;
   when the new page renders, `ready` changes, the effect re-runs, the element is now present → scroll
   + highlight. Keep the old `loadMore` path for any section still on infinite scroll (Activity).

2. **The `locateAndGoToPage` implementation** (per section) calls the §4B position endpoint:
   ```
   const index = await fetchCommentPosition(entityType, entityId, targetId)  // 0-based
   if (index != null) setPage(Math.floor(index / pageSize) + 1)
   ```
   Wrap in a small hook, e.g. `useDeepLinkPageJump(prefix, pageSize, setPage, locator)`.

3. **Fallback without §4B endpoint:** `locateAndGoToPage` page-walks — fetch page 1..N (or use the
   already-known `totalPages`) until the row id is found in a fetched page, then `setPage(thatPage)`.
   Bounded and correct, just chattier.

4. **Edge cases to handle:**
   - Target was deleted / not found → locator returns null → stay on page 1, no highlight (current
     silent no-op is fine; optionally toast "item no longer exists").
   - Hash arrives before first fetch resolves → `ready` gate already covers it (effect re-runs).
   - Switching tabs: `expectedPrefix` scoping already prevents a `#note-…` hash from firing on the
     Comments tab.
   - The **DetailTabs** component must open the correct tab for the hash. Verify the deep-link also
     selects the right tab (e.g. `#task-…` opens the Tasks tab) — check how the notification routing
     (`shared/notifications/routing.ts`) sets the active tab; if it relies on the hash, ensure tab
     selection still happens before/independent of the page jump.

5. **Verify** `shared/notifications/routing.ts` to confirm which hashes are emitted and that they
   match the row `id`s (`comment-<id>`, `note-<id>`, `task-<id>` — confirmed present in
   `CommentSection` row `id={comment-${id}}`).

---

## 7. Open decisions (confirm with product before building)

1. **Comment "chat" variant** (Material Inquiry "Messages" tab): numbered pagination breaks the
   chat-thread UX. Options: (a) keep chat variant on scroll/"load older", numbered only for the
   `comments` variant; (b) paginate both. **Recommend (a).**
2. **Page size** for tabs: default `10` (`PAGINATION.DEFAULT_PAGE_SIZE`). Show the page-size `<Select>`
   on tabs or keep it fixed at 10? **Recommend fixed 10** for compact tab panels (omit
   `onPageSizeChange`).
3. **Deal Invoices tab** is mock data — leave static, or wire a real endpoint (separate effort)?
4. **Activity / Audit** — keep infinite scroll for now (cursor-based), or schedule a later
   conversion? **Recommend keep as-is**, out of scope.
5. **`locate` endpoint vs page-walk fallback** (§4B) — build the endpoint, or ship the page-walk
   fallback for v1?

---

## 8. Task breakdown (suggested order)

**Phase 0 — Guideline**
- [ ] Task 0: Update `Coding-guideline.md` §16.7/§16.11 + inline hook comments (§3).

**Phase 1 — Backend totals (unblocks Comments/Notes)**
- [ ] Comments: `count_for_entity` + service `(items,total)` + `CommentListResponse` + endpoint.
- [ ] Notes: `count_for_entity` + service `(items,total)` + `NoteListResponse` + endpoint.
- [ ] Tests (unit + integration) for the new totals; coverage ≥ 80% (§testing).
- [ ] `pnpm api:gen` in frontend; commit `schema.gen.ts`.

**Phase 2 — Backend locate (deep-link)**
- [ ] `index_in_entity_list` for comment / note / task repos + `…/position` endpoints (§4B).
- [ ] Tests.  *(Or skip and use the page-walk fallback — §4B note.)*

**Phase 3 — Frontend: hooks + api**
- [ ] `api/comments.ts`, `api/notes.ts` → envelope; `useComments`, `useNotes`, `useTasks` → `useQuery`.

**Phase 4 — Frontend: sections to numbered pagination**
- [ ] `TasksSection` (no BE dep — do first as the reference conversion).
- [ ] `NotesSection`, `CommentSection` (comments variant).
- [ ] `QuoteSection`, `MaterialInquirySection`.

**Phase 5 — Deep-link**
- [ ] Adapt `useScrollToHashTarget` (paginated mode) + `useDeepLinkPageJump`.
- [ ] Wire Comments / Notes / Tasks sections to jump-to-page on hash.
- [ ] Confirm DetailTabs opens the correct tab for the hash (§6.4).

**Phase 6 — QA**
- [ ] Manual + e2e per §9.

---

## 9. Testing & verification

- **Backend:** unit tests (`FakeRepository`) + integration for `count_for_entity` and `…/position`;
  assert `total` accuracy across multiple pages and after soft-delete.
- **Frontend unit:** hook tests (`renderHook`) that pages map to correct `offset`; footer renders
  correct `rangeStart/rangeEnd/total`.
- **Component:** msw-mocked `CommentSection`/`NotesSection`/`TasksSection` — page change refetches,
  create resets to page 1, empty/loading/error states intact.
- **Deep-link e2e (Playwright):** seed >2 pages of comments; open
  `/crm/leads/<id>#comment-<oldId>` (an old comment on page 3) → assert the Comments tab is active,
  the list is on page 3, the row scrolled into view and flashed the highlight ring. Repeat for
  note/task. Also test a deleted-target id (graceful no-op).
- **§6.7 live check:** curl the changed endpoints, diff the JSON envelope against the FE types,
  confirm `Content-Type: application/json` through the Vite proxy.
- Gates: `pnpm typecheck && pnpm lint && pnpm test` (FE), `make lint && make typecheck && make test` (BE).

---

## 10. Risks / call-outs

- **Breaking API shape** (Comments/Notes bare-list → envelope): FE + BE must ship together; any other
  consumer of these endpoints must be found (grep) before merge.
- **§16.11 reversal**: requires the guideline edit (Task 0) or review will reject.
- **Newest-first + create on page > 1**: a new row shifts offsets; reset to page 1 on create to avoid
  a confusing "my new comment isn't here" moment.
- **Chat variant** (MI Messages) is the main UX wrinkle — keep it on scroll (recommended).
- **Cursor-paginated Activity feed** genuinely cannot become numbered pages without a backend
  redesign — explicitly out of scope.
- **Deal Invoices tab is mock data** — not a real pagination target yet.
```
