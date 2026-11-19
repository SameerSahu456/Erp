import { useState } from "react";
import { PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { Typography } from "@/components/ui/typography";
import { FilePreviewDialog, type FilePreviewTarget } from "@modules/attachments";
import { usePermission } from "@shared/rbac";

import type { AgreementSignature } from "../../api/agreements";
import { useAgreementSignatureChecklist } from "../../hooks/agreements/useAgreementSignatureChecklist";
import { useAgreementSignatures } from "../../hooks/agreements/useAgreement";
import { useAgreementDocuments } from "../../hooks/agreements/useAgreementDocuments";
import { rentalsCan } from "../../permissions";
import { AgreementSignatureChecklist } from "./AgreementSignatureChecklist";
import { AGREEMENT_APPROVAL_STRINGS as P } from "./agreement-approval.strings";
import { DocumentUploadButton } from "./DocumentUploadButton";
import { RecordSignatureDialog } from "./RecordSignatureDialog";
import { SignatureList } from "./SignatureList";
import { SignedDocumentList } from "./SignedDocumentList";
import { AGREEMENTS_STRINGS } from "./agreements.strings";

const S = AGREEMENTS_STRINGS.agreement.signatures;

interface AgreementSignaturesCardProps {
  /** The AGREEMENT's id (`config.id`): an amend starts a fresh sheet. */
  agreementId: string;
  /** Scopes the signatory picker to the agreement's own account. */
  accountId: string;
}

export function AgreementSignaturesCard({ agreementId, accountId }: AgreementSignaturesCardProps) {
  const signatures = useAgreementSignatures(agreementId);
  const documents = useAgreementDocuments(agreementId);
  const [preview, setPreview] = useState<FilePreviewTarget | null>(null);
  const [recording, setRecording] = useState(false);
  // The signature being edited; null while recording a new one.
  const [editing, setEditing] = useState<AgreementSignature | null>(null);
  // Recording a signature and filing or removing the signed scan are one
  // authority — the paperwork — so one grant opens all three; without it
  // the card is read-only (signatures listed, document previewable).
  const canSign = usePermission().canAny(rentalsCan.recordSignature);
  const rows = signatures.data ?? [];

  return (
    <>
      <Card size="sm">
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle>{S.title}</CardTitle>
          {canSign ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(null);
                setRecording(true);
              }}
            >
              <PenLine className="size-4" />
              {S.record}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-6">
          <SignatureList
            rows={rows}
            isLoading={signatures.isLoading}
            onEdit={
              canSign
                ? (row) => {
                    setEditing(row);
                    setRecording(true);
                  }
                : undefined
            }
          />
          <div className="space-y-2 border-t pt-4">
            <DocumentRequirement agreementId={agreementId} />
            <SignedDocumentList
              files={documents.files}
              removing={documents.removing}
              onPreview={setPreview}
              onRemove={canSign ? documents.remove : undefined}
            />
            {canSign ? <DocumentUploadButton uploading={documents.uploading} onPick={documents.upload} /> : null}
          </div>
        </CardContent>
      </Card>

      <RecordSignatureDialog
        // Keyed by the edit target so each open starts from that row's values.
        key={editing?.id ?? "new"}
        agreementId={agreementId}
        accountId={accountId}
        alreadySigned={rows.map((r) => r.party)}
        editing={editing}
        open={recording}
        onOpenChange={setRecording}
      />
      <FilePreviewDialog
        target={preview}
        onOpenChange={(next) => {
          if (!next) setPreview(null);
        }}
      />
    </>
  );
}

/** The Signed document heading, whether it gates approval, and the same
 *  checklist the approve dialog shows (shares the card's queries via cache). */
function DocumentRequirement({ agreementId }: { agreementId: string }) {
  const checklist = useAgreementSignatureChecklist(agreementId);
  return (
    <>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <Typography variant="card-title">{S.document}</Typography>
        <StatusBadge variant={checklist.required ? "warning" : "neutral"}>
          {checklist.required ? P.requirement.required : P.requirement.optional}
        </StatusBadge>
      </div>
      <Typography variant="helper" tone="muted" asChild>
        <p>{P.documentHelp}</p>
      </Typography>
      <Typography variant="helper" tone="muted" asChild>
        <p>{S.documentHint}</p>
      </Typography>
      <AgreementSignatureChecklist items={checklist.items} />
    </>
  );
}
