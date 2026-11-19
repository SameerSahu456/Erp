import { useMemo, useState } from "react";

import { AsyncSelect, type AsyncSelectOption } from "@/components/ui/async-select";
import { DatePicker } from "@/components/common/pickers/DatePicker";
import { OperationDialog } from "@/components/common/dialogs/OperationDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";
import { useContactOptions } from "@modules/crm";
import { istDayStartISO, toISTDateKey } from "@shared/lib/date";

import { useRecordAgreementSignature } from "../../hooks/agreements/useAgreement";
import type { AgreementSignature, SignatoryParty } from "../../api/agreements";
import { SIGNATORY_PARTIES, SIGNATORY_PARTY_LABELS } from "../../constants/signatures";
import { AGREEMENTS_STRINGS } from "./agreements.strings";
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings";

const S = AGREEMENTS_STRINGS.agreement.signatures;


/** Account-scoped contact options for the signatory picker.
 *
 *  A factory returning a named `use…` hook, not an inline arrow:
 *  `AsyncSelect` takes `useOptions(search, opts)` and calls it in its own
 *  body, so the hook has to BE a hook. Passing
 *  `(s, o) => useContactOptions(s, { ...o, accountId })` reads naturally
 *  and is a rules-of-hooks violation — the call sits inside a callback,
 *  and hook order breaks as soon as the picker unmounts. Same shape as
 *  `makeUnitOptions` in WMS's FulfillSpareDialog.
 */
function makeContactOptions(accountId: string) {
  return function useAccountContactOptions(
    search: string,
    options?: { enabled?: boolean },
  ) {
    return useContactOptions(search, { ...options, accountId });
  };
}

interface RecordSignatureDialogProps {
  /** The AGREEMENT's id. Signatures hang off the version, not the order. */
  agreementId: string;
  /** Scopes the contact picker. The only contacts that can sign for the
   *  customer side are the agreement's own account's. */
  accountId: string;
  /** Parties that already have a signature on this version — recording one
   *  again replaces it, and the operator is told before they do. */
  alreadySigned: readonly SignatoryParty[];
  /** The signature being edited, or null to record a new one. Editing
   *  re-records that party (the API replaces the prior row), so the form
   *  starts from its values and the party is fixed. The caller keys the
   *  dialog by this row so each edit starts fresh. */
  editing?: AgreementSignature | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The form's starting values — blank, or the signature being edited. */
function initialValues(editing: AgreementSignature | null | undefined) {
  return {
    party: editing?.party ?? ("comprint" as SignatoryParty),
    name: editing?.signatory_name ?? "",
    // The response carries the contact's id but not its name; the
    // signatory name is what the operator picked it by, so it labels it.
    contact:
      editing?.signatory_contact_id
        ? { id: editing.signatory_contact_id, label: editing.signatory_name }
        : null,
    signedOn: (editing?.signed_at ? toISTDateKey(editing.signed_at) : null) ?? "",
  };
}

/** Records who signed one version of a rental agreement.
 *
 *  `POST /rentals/agreements/{id}/signatures` shipped with no caller at
 *  all: the API wrapper and the hook existed, no component used them, so
 *  the signatures list was permanently empty and an agreement could never
 *  satisfy `validate_signatures_permit_approval` once the hard check was
 *  switched on.
 *
 *  The party decides who the signatory IS, and the backend enforces it:
 *  `comprint` is stamped with the logged-in user and rejects a contact,
 *  while `customer` and `guarantor` require one. The form mirrors that
 *  rather than leaving the server to refuse a combination the UI offered.
 */
export function RecordSignatureDialog({
  agreementId,
  accountId,
  alreadySigned,
  editing,
  open,
  onOpenChange,
}: RecordSignatureDialogProps) {
  const initial = initialValues(editing);
  const isEdit = Boolean(editing);
  const [party, setParty] = useState<SignatoryParty>(initial.party);
  const [name, setName] = useState(initial.name);
  const [contact, setContact] = useState<AsyncSelectOption | null>(initial.contact);
  const [signedOn, setSignedOn] = useState(initial.signedOn);
  const record = useRecordAgreementSignature(agreementId);
  // Rebuilt only when the account changes, so the picker keeps its
  // query identity across re-renders of the dialog.
  const contactOptions = useMemo(() => makeContactOptions(accountId), [accountId]);

  const needsContact = party !== "comprint";
  const canSubmit = name.trim() !== "" && (!needsContact || contact !== null);
  const isDirty =
    name !== initial.name ||
    contact?.id !== initial.contact?.id ||
    signedOn !== initial.signedOn;
  const replaces = !isEdit && alreadySigned.includes(party);

  function reset() {
    setParty(initial.party);
    setName(initial.name);
    setContact(initial.contact);
    setSignedOn(initial.signedOn);
  }

  return (
    <OperationDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      isDirty={isDirty}
      title={isEdit ? S.editTitle : S.recordTitle}
      description={isEdit ? S.editDescription : S.recordDescription}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose}>
            {C.cancel}
          </Button>
          <Button
            disabled={!canSubmit || (isEdit && !isDirty) || record.isPending}
            onClick={() =>
              record.mutate(
                {
                  party,
                  signatory_name: name.trim(),
                  // Sent only for the parties the backend accepts it for;
                  // `comprint` is stamped with the actor server-side and a
                  // contact there is rejected outright.
                  signatory_contact_id: needsContact ? contact?.id : null,
                  signed_at: signedOn ? istDayStartISO(signedOn) : null,
                },
                {
                  // No toast here — `useRecordAgreementSignature` already
                  // fires one, and two for one action reads as two actions.
                  onSuccess: () => {
                    reset();
                    onOpenChange(false);
                  },
                },
              )
            }
          >
            {isEdit ? S.save : S.submit}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="sig-party">{S.partyLabel}</Label>
          <div className="flex gap-2" id="sig-party">
            {SIGNATORY_PARTIES.map((option) => (
              <Button
                key={option}
                variant={party === option ? "default" : "outline"}
                size="sm"
                // Editing changes one party's signature — not whose it is.
                disabled={isEdit && option !== party}
                onClick={() => {
                  setParty(option);
                  // A contact is meaningless for comprint and the API
                  // rejects it, so drop any prior pick on the way.
                  if (option === "comprint") setContact(null);
                }}
              >
                {SIGNATORY_PARTY_LABELS[option]}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sig-name">{S.nameLabel}</Label>
          <Input
            id="sig-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Typography variant="helper" tone="muted">
            {S.nameHelp}
          </Typography>
        </div>

        {needsContact ? (
          <div className="space-y-1.5">
            <Label htmlFor="sig-contact">{S.contactLabel}</Label>
            <AsyncSelect
              value={contact}
              onValueChange={(next) => {
                setContact(next);
                // The contact's name is the obvious default for the
                // signatory, but it stays editable: the person who signs
                // is not always the contact on file.
                if (next && name.trim() === "") setName(next.label);
              }}
              useOptions={contactOptions}
              toLabel={(c) => c.name}
              placeholder={S.contactPlaceholder}
              searchPlaceholder={S.contactPlaceholder}
              searchable
              clearable
            />
            <Typography variant="helper" tone="muted">
              {S.contactHelp}
            </Typography>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="sig-date">{S.signedOnLabel}</Label>
          <DatePicker id="sig-date" value={signedOn} onChange={setSignedOn} />
          <Typography variant="helper" tone="muted">
            {S.signedOnHelp}
          </Typography>
        </div>

        {replaces ? (
          <Typography variant="helper" tone="danger">
            {S.replaceWarning}
          </Typography>
        ) : null}
        {isEdit ? (
          <Typography variant="helper" tone="muted">
            {party === "comprint" ? S.editComprintNote : S.editNote}
          </Typography>
        ) : null}
      </div>
    </OperationDialog>
  );
}
