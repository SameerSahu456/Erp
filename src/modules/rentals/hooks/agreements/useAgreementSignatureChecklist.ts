import { useAttachments } from "@modules/attachments";

import { AGREEMENTS_HOOKS_STRINGS as S } from "./agreements-hooks.strings";
import { useRentalSettings } from "../configuration/useRentalSettings";
import { useAgreementSignatures } from "./useAgreement";

export interface SignatureChecklistItem {
  key: "comprint" | "customer" | "document";
  label: string;
  done: boolean;
}

/**
 * The paperwork the approve endpoint checks while
 * `require_signed_document_for_active` is on — mirrored, not re-decided:
 * Comprint and the customer must each have a signature row, and a signed
 * document must be uploaded against the agreement (a guarantor is never
 * required). The server is still the authority; this only lets the UI say
 * what is missing before the click.
 */
export function useAgreementSignatureChecklist(
  agreementId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const settings = useRentalSettings();
  const signatures = useAgreementSignatures(agreementId, options);
  const documents = useAttachments("rental_agreements", agreementId, options);

  const parties = new Set((signatures.data ?? []).map((row) => row.party));
  const items: SignatureChecklistItem[] = [
    {
      key: "comprint",
      label: S.checklist.comprintSigned,
      done: parties.has("comprint"),
    },
    {
      key: "customer",
      label: S.checklist.customerSigned,
      done: parties.has("customer"),
    },
    {
      key: "document",
      label: S.checklist.documentUploaded,
      done: (documents.data?.length ?? 0) > 0,
    },
  ];

  return {
    /** Whether the installation requires the paperwork before approval. */
    required: settings.data?.require_signed_document_for_active ?? false,
    items,
    complete: items.every((item) => item.done),
    isLoading:
      settings.isLoading || signatures.isLoading || documents.isLoading,
  };
}
