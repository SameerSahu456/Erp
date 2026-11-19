import type { ChangeEvent } from "react";
import { Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

import { AGREEMENTS_STRINGS } from "./agreements.strings";
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings";

const S = AGREEMENTS_STRINGS.agreement.signatures;

/** What the backend accepts for `rental_agreements` — mirrored only to filter
 *  the picker; the server rejects anything else regardless. */
const ACCEPT = "application/pdf,image/jpeg,image/png";

/** Pick-and-upload one signed agreement file. */
export function DocumentUploadButton({ uploading, onPick }: { uploading: boolean; onPick: (file: File) => void }) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared first: re-picking the same file fires no change event otherwise.
    event.target.value = "";
    if (file) onPick(file);
  }

  return (
    <label className="inline-flex">
      <input type="file" accept={ACCEPT} className="sr-only" onChange={handleChange} disabled={uploading} />
      <Button variant="outline" size="sm" render={<span />} disabled={uploading}>
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {uploading ? C.uploading : S.uploadLabel}
      </Button>
    </label>
  );
}
