import { PackageCheck, PackageOpen, Settings2, ShieldCheck, Truck } from "lucide-react"

import {
  WorkflowStepper,
  type StepAccent,
  type StepConfig,
} from "@/components/common/views/WorkflowStepper"
import { Typography } from "@/components/ui/typography"

import type { RentalDisplayStatus } from "../../api/agreements"
import {
  AGREEMENT_STAGE_ORDER,
  currentStage,
  stageStates,
  type AgreementStageId,
  type UnitCounts,
} from "../../lib/agreement-stage"
import { AGREEMENT_STAGES_STRINGS as S } from "./agreement-stages.strings"

const D = S.detail

const ICONS = {
  configure: Settings2,
  approve: ShieldCheck,
  dispatch: Truck,
  onRent: PackageOpen,
  return: PackageCheck,
} as const

type Status = RentalDisplayStatus | null | undefined
type Describer = (done: boolean, status: Status, units: UnitCounts) => string | undefined

function describeOnRent(done: boolean, status: Status, { out, total }: UnitCounts) {
  if (done) return undefined
  if (status === "Hold") return D.onHold
  if (status === "Overdue") return D.overdue
  if (status === "Alert") return D.dueSoon
  return out < total ? D.onRentSomeBack(out, total) : D.onRent(out, total)
}

function describeReturn(done: boolean, status: Status, { out }: UnitCounts) {
  if (status === "Terminated") return D.terminated
  if (status === "Closed") return D.closed
  if (done) return D.returnDone
  return out === 0 ? D.finalInvoice : D.returnPartially
}

const DESCRIBE: Record<AgreementStageId, Describer> = {
  configure: (done) => (done ? D.configureDone : D.configurePending),
  approve: (done) => (done ? D.approveDone : D.approvePending),
  dispatch: (done, status) =>
    done ? D.dispatchDone : status === "PartiallyDispatched" ? D.dispatchPartially : D.dispatchReady,
  onRent: describeOnRent,
  return: describeReturn,
}

/** What the stage line says under each step. Pending steps say nothing —
 *  a future step's caption would only be noise. */
function describe(id: AgreementStageId, state: StepConfig["status"], status: Status, units: UnitCounts) {
  if (state === "pending") return undefined
  return DESCRIBE[id](state === "completed", status, units)
}

function nextLine(
  stage: AgreementStageId,
  finished: boolean,
  status: RentalDisplayStatus | null | undefined,
  { out, total }: UnitCounts,
) {
  if (finished) return S.next.done
  if (stage === "onRent" && status === "Hold") return S.next.onHold
  if (stage === "return" && out === 0 && total > 0) return S.next.finalInvoice
  if (stage === "onRent" && out < total) return S.next.someBack
  return S.next[stage]
}

function accentFor(status: RentalDisplayStatus | null | undefined): StepAccent {
  if (status === "Overdue") return "danger"
  if (status === "Hold" || status === "Alert") return "warning"
  return "primary"
}

export interface RentalAgreementStageStripProps {
  /** The agreement's display status; null when no agreement exists yet. */
  status: RentalDisplayStatus | null | undefined
  /** Units still with the customer — on rent, held or mid-replacement
   *  (`devices_out`), not just the ones billing (`devices_on_rent`). */
  devicesOut: number
  deviceCount: number
  className?: string
}

/** Configure → Approve → Dispatch → On rent → Return, with the one line
 *  that says what happens next and which team does it. Rendered on the
 *  agreement page and on the CRM sales-order card so both read alike. */
export function RentalAgreementStageStrip({
  status,
  devicesOut,
  deviceCount,
  className,
}: RentalAgreementStageStripProps) {
  const units: UnitCounts = { out: devicesOut, total: deviceCount }
  const states = stageStates(status, units)
  const { stage, finished } = currentStage(status, units)
  const accent = accentFor(status)
  const steps: StepConfig[] = AGREEMENT_STAGE_ORDER.map((id) => ({
    id,
    label: S.stages[id],
    icon: ICONS[id],
    status: states[id],
    description: describe(id, states[id], status, units),
    accent: states[id] === "active" ? accent : undefined,
  }))
  return (
    <section aria-label={S.heading} className={className}>
      <WorkflowStepper steps={steps} />
      <Typography variant="helper" tone="muted" asChild>
        <p className="mt-3 text-center">{nextLine(stage, finished, status, units)}</p>
      </Typography>
    </section>
  )
}
