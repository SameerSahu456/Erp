// Copy for the CRM-owned Replacement Request data layer.
//
// Coding-guideline §16.12: toast and error copy lives in a typed `as const`
// object, not inline in hooks. It sits in CRM rather than WMS because the
// hooks that use it are CRM-owned — a WMS import would be a cross-module
// deep import (no-restricted-imports).
export const REPLACEMENT_REQUEST_DATA_STRINGS = {
  // Toasts for the live API mutations.
  mutation: {
    created: (requestNumber: string) => `${requestNumber} raised`,
    createFailed: "Could not raise the replacement request",
    lineApproved: "Line approved",
    linesApproved: (count: number) =>
      `${count} ${count === 1 ? "line" : "lines"} approved`,
    approveFailed: "Could not approve",
    lineRejected: "Line rejected",
    rejectFailed: "Could not reject",
    reassigned: "Reassigned to the selected approver",
    updated: "Replacement request updated",
    updateFailed: "Could not update the replacement request",
    reassignFailed: "Could not reassign",
    returnWaived: "Return written off — the request can now close",
    waiveFailed: "Could not waive the return",
    notNeeded: "Line closed as not needed",
    notNeededFailed: "Could not close the line",
    outcomeChanged: "Outcome changed",
    outcomeChangeFailed: "Could not change the outcome",
    cancelled: "Replacement request cancelled",
    cancelFailed: "Could not cancel",
  },

  // Server error codes the UI explains in the user's terms rather than
  // surfacing raw. Anything not listed falls back to the server message.
  errors: {
    RR_LINE_ALREADY_UNDER_REPLACEMENT:
      "Those units are already on another replacement request.",
    RR_SO_LINE_REPLACE_CAPACITY_EXCEEDED:
      "That order line has no replaceable units left.",
    RR_ITEM_ALREADY_DECIDED: "Someone else already decided this line.",
    RR_HEADER_NOT_APPROVABLE:
      "This request has moved past approval and can no longer be decided.",
    RR_ITEM_APPROVAL_FORBIDDEN:
      "This line is assigned to a different product manager.",
    RR_RETURN_ALREADY_RESOLVED:
      "This return is already received or written off.",
    RR_NOT_NEEDED_LAST_DEVICE_LINE:
      "This is the last open part for the device, and the device goes back to the customer on it. Ship it back on this line.",
    RR_NOT_NEEDED_ALREADY_SHIPPED: "This line has already shipped or been closed.",
    RR_NOT_NEEDED_NOT_APPROVED:
      "This line is still awaiting approval — reject it instead.",
    RR_DEVICE_ALREADY_IN_HOUSE:
      "This device already comes in for repair on another open request. Add the part to that request.",
    RR_COMPONENT_SWAP_LOCATION_MIXED:
      "All parts of one device must be swapped in the same place — all at the customer's site, or all with the device brought in.",
    RR_IN_HOUSE_RETURN_MIXED:
      "All parts of one device come in the same way — with the whole device, or each part on its own.",
    RR_OUTCOME_NOT_CHANGEABLE:
      "Only a part repaired in house that has not shipped can switch between repair and replace.",
    RR_NOT_NEEDED_PART_RECEIVED:
      "The part is already here and has to go back to the customer. Change the line to repair instead.",
    RR_NOT_CANCELLABLE:
      "A unit has already shipped or arrived, so this request can no longer be cancelled.",
  } as Record<string, string>,
} as const
