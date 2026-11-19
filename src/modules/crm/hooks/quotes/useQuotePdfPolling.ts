import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { fetchQuote } from "../../api"
import type { QuoteWire } from "../../api"

// Async PDF integration — see docs/quote-pdf-async-integration.md.
//
// Backend quote PDF rendering moved from inline (during POST/PATCH) to a Celery
// worker. The mutation returns immediately with either `pdf_url = null` (create
// / new version) or the *previous* `pdf_url` (edit / item CRUD). The worker
// overwrites the stored value 1–3s later. This hook polls
// `GET /crm/quotes/{id}` until the value changes, then stops.
//
// The store is module-scoped so that whichever component (list row, builder,
// download button…) is currently showing the quote sees the same status — the
// mutation site fires `beginQuotePdfPoll(quoteId, previousUrl)` and the render
// site consumes `useQuotePdfPolling(quoteId)`.

const POLL_INTERVAL_MS = 2_000
const MAX_POLL_ATTEMPTS = 5

type PollRecord = { previousUrl: string | null; startedAt: number }

const pendingByQuote = new Map<string, PollRecord>()
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

/**
 * Start polling for a fresh PDF URL after a mutation that enqueues a render.
 *
 * `previousUrl` is the URL the FE was showing *before* the mutation — pass
 * `null` on create / new version, and the current `existing.pdf_url` on edit /
 * item CRUD. Polling settles when the newly-fetched URL is non-null AND
 * different from `previousUrl`; times out after ~10 s (5 × 2 s).
 *
 * Calling this again for the same quoteId while a poll is in flight resets it
 * (fresh attempt counter + new `previousUrl`), which lines up with the "abort
 * previous poll on rapid saves" edge case in the integration doc.
 */
export function beginQuotePdfPoll(
  quoteId: string,
  previousUrl: string | null,
): void {
  pendingByQuote.set(quoteId, { previousUrl, startedAt: Date.now() })
  emit()
}

function endPoll(quoteId: string): void {
  if (pendingByQuote.delete(quoteId)) emit()
}

export type PdfPollingStatus = "idle" | "pending" | "ready" | "timeout"

export interface QuotePdfPollingResult {
  /**
   * `idle`     — no active poll for this quote (either nothing to wait on, or
   *              a previous poll already settled/timed out).
   * `pending`  — poll running; the download button should show "Generating PDF…".
   * `ready`    — the fetched `pdf_url` changed vs the pre-mutation URL; the
   *              cache has been updated, `pdfUrl` here is the fresh URL.
   * `timeout`  — 5 attempts elapsed without a URL change; the download button
   *              should offer a manual refresh.
   */
  status: PdfPollingStatus
  /** Latest known `pdf_url` for this quote from the query cache — `null` if the
   *  quote isn't in cache or hasn't received a URL yet. */
  pdfUrl: string | null
}

/**
 * Observe the async PDF poll for a given quote. Safe to call with a null/
 * undefined id (renders as `idle`, does nothing). Multiple components can
 * subscribe to the same quote — they'll all see the same status.
 */
export function useQuotePdfPolling(
  quoteId: string | null | undefined,
): QuotePdfPollingResult {
  const qc = useQueryClient()

  // Subscribe to the module-scoped store. A plain re-render tick is enough —
  // the record is read imperatively below, so no need for useSyncExternalStore.
  const [, forceRender] = useState(0)
  useEffect(() => {
    const listener = () => forceRender((n) => n + 1)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  const record = quoteId ? pendingByQuote.get(quoteId) : undefined
  const isActive = !!record && !!quoteId
  const previousUrl = record?.previousUrl ?? null
  const startedAt = record?.startedAt ?? 0

  const [status, setStatus] = useState<PdfPollingStatus>("idle")
  const attemptsRef = useRef(0)

  // A new polling session (identified by `startedAt`) resets the counter and
  // flips us into `pending`. When the store record is cleared we drop to
  // `idle` — but only from `pending`, so a settled `ready` sticks until the
  // next save cycle.
  useEffect(() => {
    if (isActive) {
      attemptsRef.current = 0
      setStatus("pending")
    } else {
      setStatus((s) => (s === "pending" ? "idle" : s))
    }
  }, [startedAt, isActive])

  useEffect(() => {
    if (status !== "pending" || !quoteId) return
    let cancelled = false
    const timer = setInterval(async () => {
      if (cancelled) return
      attemptsRef.current += 1
      try {
        const fresh = await fetchQuote(quoteId)
        if (cancelled) return
        // Feed the primary detail cache so `useQuote(quoteId)` observers
        // (QuoteBuilder, QuoteFormPage, embedded lists) re-render with the
        // new URL without needing their own polling loops.
        qc.setQueryData<QuoteWire>(
          ["crm", "quotes", "detail", quoteId],
          fresh,
        )
        if (fresh.pdf_url && fresh.pdf_url !== previousUrl) {
          endPoll(quoteId)
          setStatus("ready")
          return
        }
      } catch {
        // Swallow — network hiccups shouldn't kill the poll; if the quote is
        // genuinely gone the next click through the UI will surface it.
      }
      if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
        endPoll(quoteId)
        setStatus("timeout")
      }
    }, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [status, quoteId, previousUrl, qc])

  const currentPdfUrl = quoteId
    ? (qc.getQueryData<QuoteWire>(["crm", "quotes", "detail", quoteId])
        ?.pdf_url ?? null)
    : null

  return { status, pdfUrl: currentPdfUrl }
}
