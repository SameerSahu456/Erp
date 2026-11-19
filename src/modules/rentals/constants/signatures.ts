import type { SignatoryParty } from "../api/agreements";

/** Who signed an agreement version (§16.12 bucket 2). */
export const SIGNATORY_PARTY_LABELS: Record<SignatoryParty, string> = {
  comprint: "Comprint",
  customer: "Customer",
  guarantor: "Guarantor",
};

/** The order the party picker offers them in. */
export const SIGNATORY_PARTIES: readonly SignatoryParty[] = ["comprint", "customer", "guarantor"];
