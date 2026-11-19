import type { components } from "@/shared/api/schema.gen";

import { apiClient } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";

// A sales order's rental billing contract (`rental_agreements`). Wire shapes
// mirror `comprint-erp-backend/app/modules/rentals/schemas/`.

export type RentalAgreement = components["schemas"]["RentalAgreementResponse"];
export type RentalAgreementPayload = components["schemas"]["RentalAgreementRequest"];

// Vocabularies (mirror the backend CHECK constraints).
export type BillingType = RentalAgreementPayload["billing_type"];
export type BillingMode = RentalAgreementPayload["billing_mode"];
export type InvoicingMode = NonNullable<RentalAgreementPayload["invoicing_mode"]>;

/** The order's whole post-approval lifecycle — the ONLY place a rental's state
 *  lives (the CRM order stops at `Approved`). Seeds at `Draft`. */
export type RentalStatus = RentalAgreement["status"];

/** What an order READS as today. `Alert` / `Overdue` are derived, never stored. */
export type RentalDisplayStatus = RentalStatus | "Alert" | "Overdue";

/** One entry of an order's action menu; the server decides which are enabled. */
export type RentalSalesOrderActionKind =
  components["schemas"]["RentalSalesOrderActionAvailability"]["action"];

// POST /api/v1/rentals/sales-orders/{id}/configure — on a configured order this
// AMENDS: the prior terms become a superseded version.
export async function configureSo(
  salesOrderId: string,
  payload: RentalAgreementPayload,
): Promise<RentalAgreement> {
  return apiClient.post<RentalAgreement>(
    endpoints.rentals.salesOrderConfigure(salesOrderId),
    payload,
  );
}

// GET /api/v1/rentals/sales-orders/{id}/config-versions — newest first.
export async function fetchRentalSalesOrderConfigVersions(
  salesOrderId: string,
): Promise<RentalAgreement[]> {
  return apiClient.get<RentalAgreement[]>(
    endpoints.rentals.salesOrderConfigVersions(salesOrderId),
  );
}

/** POST — put the agreement in force (`PendingSignature` -> `Active`); WMS
 *  refuses to dispatch until this. 409 names the actual state otherwise. */
export async function approveAgreement(
  salesOrderId: string,
): Promise<RentalAgreement> {
  return apiClient.post<RentalAgreement>(
    endpoints.rentals.salesOrderApprove(salesOrderId),
    {},
  );
}

export type SignatoryParty = "comprint" | "customer" | "guarantor";
export type AgreementSignature = components["schemas"]["SignatureResponse"];
export type AgreementSignaturePayload = components["schemas"]["SignatureRecord"];

/** GET — who signed THIS VERSION; an amend spawns a version with none. */
export async function fetchAgreementSignatures(
  agreementId: string,
): Promise<AgreementSignature[]> {
  return apiClient.get<AgreementSignature[]>(
    endpoints.rentals.agreementSignatures(agreementId),
  );
}

export async function recordAgreementSignature(
  agreementId: string,
  payload: AgreementSignaturePayload,
): Promise<AgreementSignature> {
  return apiClient.post<AgreementSignature>(
    endpoints.rentals.agreementSignatures(agreementId),
    payload,
  );
}

// ─── Per-line billing cadence ────────────────────────────────────────

/** One line's EFFECTIVE cadence, already resolved against the order's. */
export type RentalLineCadence = components["schemas"]["RentalLineCadence"];

/** All-null clears the override; anything else must be a whole cadence. */
export type RentalLineCadencePayload =
  components["schemas"]["RentalLineCadenceUpsert"];

// PUT /api/v1/rentals/agreements/{id}/lines/{lineId}/cadence
export async function saveLineCadence(
  agreementId: string,
  lineId: string,
  payload: RentalLineCadencePayload,
): Promise<RentalLineCadence> {
  return apiClient.put<RentalLineCadence>(
    endpoints.rentals.agreementLineCadence(agreementId, lineId),
    payload,
  );
}

// ─── Reject ──────────────────────────────────────────────────────────

export type RejectAgreementRequest = components["schemas"]["RejectAgreementRequest"];

/** POST — send the agreement's terms back: `PendingSignature` -> `Draft`.
 *
 *  Same authority as approve (`rentals:agreement_approve`). The reason is
 *  required; reconfiguring supersedes the rejected version and puts the
 *  new terms back in the approval queue. 409 unless the agreement is
 *  exactly `PendingSignature`. */
export async function rejectAgreement(
  salesOrderId: string,
  payload: RejectAgreementRequest,
): Promise<RentalAgreement> {
  return apiClient.post<RentalAgreement>(
    endpoints.rentals.salesOrderReject(salesOrderId),
    payload,
  );
}
