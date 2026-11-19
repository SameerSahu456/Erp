import type { ReactNode } from 'react'

import type { WorkflowHistoryEntry } from '../../../api'

/** Everything a describer needs to word one history event. */
export type EventCtx = {
  e: WorkflowHistoryEntry
  /** The event's metadata (`{}` when absent). */
  md: Record<string, unknown>
  /** Stage name for the event's op ("Inspection" / "QC" / a section name), or null. */
  stage: string | null
  /** Prefix a phrase with the stage when known ("Inspection started"). */
  withStage: (s: string) => string
  /** Legacy `outcome_set` routing rows, indexed by operation id. */
  legacyRoutingByOp: Map<string, Record<string, unknown>>
}

/** The worded parts of one timeline entry. */
export type EventText = {
  title: string
  description?: ReactNode
  note?: string
}

export type EventDescriber = (ctx: EventCtx) => EventText
