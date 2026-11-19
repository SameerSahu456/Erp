import type { DetailContext } from './helpers'

/** Per-stage customization for the ONE shared device-detail page.
 *
 *  The device page is a single component; what differs per stage (which optional
 *  cards show, and — see EngineerAssignments / DeviceHeaderActions — which
 *  actions/assignees) lives here as DATA, not duplicated UI. To add a feature to
 *  some stages (e.g. a future "Change Request" that only Inspection + Repair
 *  have), add its key to those contexts in this one map — no new pages, no forks
 *  of the shared dossier. */
export type DetailSection = 'spares'

const SECTIONS: Partial<Record<NonNullable<DetailContext>, DetailSection[]>> = {
  // Spares can be raised at inspection / repair / qc, so those contexts all
  // surface the Spares card — otherwise a spare requested during inspection
  // (e.g. on an inspection fail) is invisible on the device detail page.
  inspection: ['spares'],
  repair: ['spares'],
  spares: ['spares'],
  qc: ['spares'],
  rack: [],
}

/** The optional sections to render for a device-detail context. */
export function sectionsFor(ctx: DetailContext): DetailSection[] {
  return (ctx && SECTIONS[ctx]) || []
}

/** Does this context show the given section? */
export function hasSection(ctx: DetailContext, section: DetailSection): boolean {
  return sectionsFor(ctx).includes(section)
}
