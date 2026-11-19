import { toast } from "sonner"

import { LEADS_STRINGS } from "../components/leads/leads.strings"
import {
  LEAD_DETAILS_REQUIRED_STAGES,
  LEAD_OWNER_REQUIRED_STAGES,
  LEAD_TYPE_OPTIONAL_STAGES,
  type Lead,
} from "../types"

// THE lead stage-gate helpers. Every place a lead can change stage — the kanban
// drag (useLeadsBoard), the detail-page stage select (useLeadDetail), and the
// Convert-to-SO actions — routes through these so the rules can't drift apart.
// Each returns `false` AND toasts the reason(s); callers bail out on false.

export interface LeadStageFields {
  hasName: boolean
  hasCompany: boolean
  hasContact: boolean
  hasType: boolean
  hasCategories: boolean
  hasDescription: boolean
  hasOwner: boolean
}

// Description is rich text — a cleared editor can still hold `<p></p>` or
// `&nbsp;`, so strip markup before deciding it's filled in.
export function hasLeadDescription(description: string | null | undefined): boolean {
  if (!description) return false
  return description.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length > 0
}

// Gate inputs from the mapped `Lead` shape (kanban cards, detail page).
export function leadStageFields(lead: Lead): LeadStageFields {
  return {
    hasName: Boolean(lead.hasContactName),
    hasCompany: Boolean(lead.hasCompanyName),
    hasContact: Boolean(lead.email.trim() || lead.phone.trim()),
    hasType: Boolean(lead.customerType),
    hasCategories: lead.categories.length > 0,
    hasDescription: hasLeadDescription(lead.description),
    hasOwner: Boolean(lead.assignedToId),
  }
}

// Qualified-and-ahead (LEAD_DETAILS_REQUIRED_STAGES) needs Name, Company,
// email-or-phone, Type, Categories and Description (shown as "Requirement");
// every stage in LEAD_OWNER_REQUIRED_STAGES needs an owner. ALL missing fields
// are collected and shown in ONE toast, in form order, so the user can fix
// everything in one pass instead of discovering them one at a time.
export function checkLeadStageRequirements(toStage: string, fields: LeadStageFields): boolean {
  const stage = toStage as Lead["stage"]
  const F = LEADS_STRINGS.toast.stageFields
  const detailsStage = LEAD_DETAILS_REQUIRED_STAGES.includes(stage)
  const missing: string[] = []
  if (detailsStage) {
    if (!fields.hasName) missing.push(F.name)
    if (!fields.hasCompany) missing.push(F.company)
    if (!fields.hasContact) missing.push(F.contact)
    if (!fields.hasType) missing.push(F.type)
    if (!fields.hasCategories) missing.push(F.categories)
    if (!fields.hasDescription) missing.push(F.description)
  }
  if (LEAD_OWNER_REQUIRED_STAGES.includes(stage) && !fields.hasOwner) missing.push(F.owner)

  if (missing.length === 0) return true
  // Owner alone keeps its own wording ("Assign an owner…").
  const ownerOnly = missing.length === 1 && missing[0] === F.owner
  toast.error(ownerOnly ? LEADS_STRINGS.toast.ownerRequired : LEADS_STRINGS.toast.fieldsRequired(missing, detailsStage))
  return false
}

// A Rejected lead can't produce a Sales Order (Close Won wizard or Convert to
// SO from one of its quotes) until it's moved back to Qualified.
export function checkLeadNotRejected(stage: string): boolean {
  if (stage !== "Rejected") return true
  toast.error(LEADS_STRINGS.toast.rejectedToSoBlocked)
  return false
}

// The close-won eligibility gate:
//   1. a Rejected lead must be moved back to Qualified first;
//   2. a lead cannot close as Won from the early funnel (New / Contacted);
//   3. it must satisfy the Closed Won stage requirements above.
// Convert-to-SO actions (the Quotes tab on the lead detail page, the quote
// view page) call this BEFORE navigating into the ClosedWonPage wizard, so a
// blocked lead shows a toast and STAYS PUT — no bounce through the wizard.
export function checkLeadCloseWonReady(stage: string, fields: LeadStageFields): boolean {
  if (!checkLeadNotRejected(stage)) return false
  if (LEAD_TYPE_OPTIONAL_STAGES.includes(stage as Lead["stage"])) {
    toast.error(LEADS_STRINGS.toast.closeWonBlocked)
    return false
  }
  return checkLeadStageRequirements("Closed Won", fields)
}
