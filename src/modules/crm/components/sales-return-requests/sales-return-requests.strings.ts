/**
 * Sales Return Request copy — data layer (hooks + mutations).
 *
 * Screen copy lives in the WMS pages' own strings file; this holds only
 * what the hooks emit (toasts) and the business-error explanations, so a
 * refusal reads as something the user can act on rather than a code.
 */
export const SALES_RETURN_REQUEST_DATA_STRINGS = {
  mutation: {
    created: (number: string) => `Return request ${number} raised`,
    createFailed: "Could not raise the return request",
    decided: "Lines updated",
    decideFailed: "Could not update those lines",
    cancelled: (number: string) => `Return request ${number} cancelled`,
    cancelFailed: "Could not cancel the return request",
    updated: "Return request updated",
    updateFailed: "Could not update the return request",
    reassigned: "Product manager reassigned",
    reassignFailed: "Could not reassign the product manager",
  },

  /**
   * Business codes the API answers refusals with. Each one is a rule the
   * user can respond to, so it gets explained rather than echoed.
   */
  errors: {
    SRET_UNIT_ALREADY_CLAIMED:
      "One of those units is already claimed by a live replacement or return request. Refresh the unit list and pick again.",
    SRET_REPLACEMENT_UNIT_NOT_RETURNABLE:
      "That unit was shipped as a replacement, so it cannot be returned on a sales return. Raise it against the replacement request instead.",
    SRET_NOT_ITEM_APPROVER:
      "That line is assigned to another product manager.",
    SRET_ITEM_ALREADY_DECIDED: "That line has already been decided.",
    SRET_ALREADY_RECEIVED:
      "Units have already been received against this request, so it can no longer be cancelled.",
    SRET_NOT_CANCELLABLE:
      "This request is no longer in a state that can be cancelled.",
    SRET_SO_NOT_DISPATCHED:
      "That order has no dispatched units, so there is nothing to return.",
    SRET_LINE_NOT_FROM_SO:
      "One of those lines does not belong to the selected order.",
    SRET_NOT_RECEIVABLE:
      "This request has no approved line awaiting a unit, so nothing can be received against it.",
  } as Record<string, string>,
} as const
