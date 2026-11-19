// Copy for WMS access-denied states (§16.12 — no naked strings in components).
// These messages must tell the user WHO can unblock them, not just say "no".
export const WMS_ACCESS_STRINGS = {
  pageNotFoundTitle: "Page not found",
  pageNotFound:
    "This WMS address doesn't exist. Pick a page from the sidebar.",
  stageDeniedTitle: "No Access to This Area",
  stageDenied:
    "You aren't set up for this work at any warehouse. Ask a store manager to add you to the warehouse team with the right capability.",
  managerDenied:
    "This area is for warehouse managers (store manager / MIS). Ask a store manager if you need something from here.",
  memberDenied:
    "You aren't on any warehouse team yet, so device details aren't available. Ask a store manager to add you to a warehouse team.",
  deviceForbiddenTitle: "No Access to This Device",
  deviceForbidden:
    "You don't have access to this device's warehouse. Ask a manager to add you to that warehouse's team.",
  dispatchForbiddenTitle: "No Access to This Dispatch",
  dispatchForbidden:
    "You don't have access to this dispatch's warehouse. Ask a manager to add you to that warehouse's team.",
  materialIssueForbiddenTitle: "No Access to This Material Issue",
  materialIssueForbidden:
    "You don't have access to this material issue's warehouse. Ask a manager to add you to that warehouse's team.",
  transferForbiddenTitle: "No Access to This Transfer",
  transferForbidden:
    "You don't have access to this transfer's warehouse. Ask a manager to add you to that warehouse's team.",
  purchaseReturnForbiddenTitle: "No Access to This Purchase Return",
  purchaseReturnForbidden:
    "You don't have access to this purchase return's warehouse. Ask a manager to add you to that warehouse's team.",
} as const;
