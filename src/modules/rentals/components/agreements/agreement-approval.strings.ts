/** Signed-document requirement copy, shared by the approve dialog and the
 *  agreement's Signatures card. */
export const AGREEMENT_APPROVAL_STRINGS = {
  requirement: {
    required: "Required for approval",
    optional: "Optional",
  },
  checklist: {
    done: "Done",
    missing: "Missing",
  },
  documentHelp:
    "Print or export the agreement, get it countersigned, then upload it here.",
  dialog: {
    warningOptional:
      "Until an agreement is approved the warehouse cannot dispatch it. Approving records you as the person who authorised the shipment. A signed document is not required for approval — it can be uploaded later.",
    warningRequired:
      "Until an agreement is approved the warehouse cannot dispatch it. Approving records you as the person who authorised the shipment. This installation requires the signed agreement before approval:",
    checking: "Checking signatures…",
    incomplete:
      "Record both signatures and upload the signed document on the agreement's Signatures card before approving.",
  },
  /** Clear messages for the approve endpoint's paperwork refusals. */
  errors: {
    AGREEMENT_SIGNATURES_INCOMPLETE:
      "This agreement cannot be approved yet: both Comprint and the customer must sign it first.",
    AGREEMENT_SIGNED_DOCUMENT_MISSING:
      "This agreement cannot be approved yet: upload the signed document on the Signatures card first.",
  } as Record<string, string>,
} as const;
