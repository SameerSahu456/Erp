import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import type { DispatchCreateLogisticsState } from "../../hooks/dispatches/useDispatchCreateLogistics";
import type { DispatchStagedDocsState } from "../../hooks/dispatches/useDispatchStagedDocs";
import { SectionHeader } from "../shared/section-primitives";
import { FormField } from "../shared/FormField";
import { DISPATCH_CREATE_STRINGS as S } from "./dispatch-create.strings";
import { DispatchDocumentsField } from "./DispatchDocumentsField";
import { DispatchCreateLogisticsFields } from "./DispatchCreateLogisticsFields";

/** Documents — pick a type, then drop the file(s) in. Staged now, uploaded
 *  once the dispatch exists. */
function StagedDocumentsBlock({ docs }: { docs: DispatchStagedDocsState }) {
  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <Typography variant="card-title">{S.docsHeading}</Typography>
        <Typography variant="caption" tone="muted">
          {S.docsAttached(docs.stagedDocs.length)}
        </Typography>
      </div>

      <DispatchDocumentsField
        docType={docs.docType}
        onDocTypeChange={docs.setDocType}
        rows={docs.docRows}
        onAddFiles={docs.addDocs}
        onRemove={(row) => docs.removeDocById(row.key)}
      />
    </div>
  );
}

/** Step 0 · 2 — Logistics (optional), documents and notes. */
export function DispatchCreateLogisticsCard({
  logistics,
  docs,
}: {
  logistics: DispatchCreateLogisticsState;
  docs: DispatchStagedDocsState;
}) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          step={2}
          title={S.logisticsHeading}
          description={S.logisticsHint}
        />
      </CardHeader>
      <CardContent>
        <DispatchCreateLogisticsFields logistics={logistics} />
        <StagedDocumentsBlock docs={docs} />
        <FormField label={S.notesLabel} className="mt-6">
          <Textarea
            value={logistics.notes}
            onChange={(e) => logistics.setNotes(e.target.value)}
            placeholder={S.notesPlaceholder}
            rows={3}
          />
        </FormField>
      </CardContent>
    </Card>
  );
}
