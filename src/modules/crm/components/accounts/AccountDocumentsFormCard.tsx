import { FileText } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DocumentUploadField } from "@/components/common/files/DocumentUploadField"
import { Typography } from "@/components/ui/typography"
import {
  ACCOUNT_DOC_ALLOWED_MIMES,
  ACCOUNT_DOC_LABELS,
  ACCOUNT_DOC_MAX_BYTES,
  ACCOUNT_DOC_TYPES,
} from "@/modules/crm/constants/account-documents"

import type { AccountFormController } from "../../hooks/accounts/useAccountForm"
import { ACCOUNTS_STRINGS as S } from "./accounts.strings"
import { AccountDocumentsSection } from "./AccountDocumentsSection"

// KYC Documents — visible in BOTH create and edit modes.
//   • Create: 5 file slots that upload alongside POST /accounts (multipart).
//   • Edit:   live list backed by the generic /attachments API.
export function AccountDocumentsFormCard({ form }: { form: AccountFormController }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          {S.formCards.documents}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {form.isEdit && form.accountId ? (
          <AccountDocumentsSection accountId={form.accountId} />
        ) : (
          <>
            <Typography variant="helper" asChild>
              <p className="mb-4">
                {S.formCards.documentsHelp}
              </p>
            </Typography>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {ACCOUNT_DOC_TYPES.map((docType) => (
                <DocumentUploadField
                  key={docType}
                  label={ACCOUNT_DOC_LABELS[docType]}
                  helperText={S.formCards.documentHelperText}
                  value={form.pendingFiles[docType]}
                  onChange={(file) =>
                    form.setPendingFiles((prev) => {
                      const next = { ...prev }
                      if (file) next[docType] = file
                      else delete next[docType]
                      return next
                    })
                  }
                  allowedMimes={ACCOUNT_DOC_ALLOWED_MIMES}
                  maxBytes={ACCOUNT_DOC_MAX_BYTES}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
