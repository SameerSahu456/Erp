import type { ServiceSection, VendorJobSummary } from "../../api/service-jobs";
import type { VendorJobDialogKind } from "../../hooks/vendor-jobs/useVendorJobsList";
import { ReceiveVendorJobDialog } from "./ReceiveVendorJobDialog";
import { SendVendorJobDialog } from "./SendVendorJobDialog";
import { CancelVendorJobDialog } from "./CancelVendorJobDialog";

interface Props {
  dialog: { kind: VendorJobDialogKind; job: VendorJobSummary } | null;
  section: ServiceSection | undefined;
  onClose: () => void;
}

/** The one open row-action dialog (send / send again / receive / cancel). */
export function VendorJobActionDialog({ dialog, section, onClose }: Props) {
  const deviceId = dialog?.job.stock_item_id;
  if (!dialog || !deviceId) return null;
  const { kind, job } = dialog;

  if (kind === "cancel") {
    return <CancelVendorJobDialog deviceId={deviceId} job={job} onClose={onClose} />;
  }
  // Send / receive need the job's own section; without it nothing opens.
  if (!section) return null;
  if (kind === "receive") {
    return <ReceiveVendorJobDialog deviceId={deviceId} job={job} section={section} onClose={onClose} />;
  }
  return <SendVendorJobDialog deviceId={deviceId} job={job} section={section} mode={kind} onClose={onClose} />;
}
