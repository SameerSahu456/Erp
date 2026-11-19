/**
 * Rental Return Request copy — data layer (hooks + mutations).
 *
 * Screen copy lives in the WMS pages' own strings file; this holds only
 * what the hooks emit (toasts) and the business-error explanations, so a
 * refusal reads as something the user can act on rather than a code.
 */
export const RENTAL_RETURN_REQUEST_DATA_STRINGS = {
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
    closedShort: "Closed short — the rest is no longer expected",
    closeShortFailed: "Could not close the request short",
  },

  /**
   * Business codes the API answers refusals with. Each one is a rule the
   * user can respond to, so it gets explained rather than echoed.
   */
  errors: {
    RRET_UNIT_ALREADY_CLAIMED:
      "One of those units is already claimed by a live replacement or return request. Refresh the unit list and pick again.",
    RRET_REPLACEMENT_UNIT_NOT_RETURNABLE:
      "That unit was shipped as a replacement, so it cannot be returned on a rental return. Raise it against the replacement request instead.",
    RRET_NOT_ITEM_APPROVER:
      "That line is assigned to another product manager.",
    RRET_ITEM_ALREADY_DECIDED: "That line has already been decided.",
    RRET_ALREADY_RECEIVED:
      "Units have already been received against this request, so it can no longer be cancelled.",
    RRET_NOT_CANCELLABLE:
      "This request is no longer in a state that can be cancelled.",
    RRET_SO_NOT_DISPATCHED:
      "That order has no dispatched units, so there is nothing to return.",
    RRET_LINE_NOT_FROM_SO:
      "One of those lines does not belong to the selected order.",
    RRET_NOT_RECEIVABLE:
      "This request has no approved line awaiting a unit, so nothing can be received against it.",
    RRET_NO_UNITS_OUT:
      "The customer does not have that many of this model on rent. Refresh the model list — another request may have claimed some.",
    RRET_DECLARED_ORDER_NOT_ON_ACCOUNT:
      "That order belongs to a different customer.",
    RRET_NO_LINES: "Ask for at least one unit.",
    RRET_LINE_NOT_OPEN: "That line is already received or closed.",
    RRET_NOTHING_TO_CLOSE: "Nothing is outstanding on this request.",
  } as Record<string, string>,
} as const
