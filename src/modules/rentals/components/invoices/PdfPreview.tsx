import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import { INVOICE_STRINGS as S } from "./invoices.strings";

const P = S.preview;

type Loader = () => Promise<Blob>;

export interface PdfPreviewProps {
  /** Fetches the PDF's bytes. Its IDENTITY decides when the preview reloads,
   *  so it must be stable per input (see `useInvoicePdfLoader`). */
  load: Loader;
  /** Accessible name for the viewer frame. */
  title: string;
  className?: string;
}

/** What one `load` produced. Tagged with that loader so a result from a
 *  superseded one is never shown. */
interface Loaded {
  load: Loader;
  url: string | null;
}

/**
 * A PDF, rendered by the browser's own viewer — the FILE, not an HTML
 * reconstruction, so the preview cannot differ from what downloads.
 *
 * The bytes are fetched, never linked: the token is an Authorization header,
 * so an `<iframe>` at the API URL would arrive unauthenticated. The object
 * URL is revoked when the loader changes or the viewer goes away.
 */
export function PdfPreview({ load, title, className }: PdfPreviewProps) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    // Stale = the loader changed or the viewer unmounted while in flight.
    // The api has no AbortSignal, so the request runs on; its result is dropped.
    let stale = false;
    let objectUrl: string | null = null;
    load().then(
      (blob) => {
        if (stale) return;
        objectUrl = URL.createObjectURL(blob);
        setLoaded({ load, url: objectUrl });
      },
      () => {
        if (!stale) setLoaded({ load, url: null });
      },
    );
    return () => {
      stale = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [load]);

  // Derived, not reset in the effect: a result for an older loader is "loading".
  const current = loaded?.load === load ? loaded : null;

  if (!current) return <Skeleton className={cn("rounded-none", className)} />;
  if (!current.url) {
    return (
      <div className={cn("flex items-center justify-center p-6", className)}>
        <Typography variant="body" tone="danger">
          {P.loadError}
        </Typography>
      </div>
    );
  }
  return <iframe src={current.url} title={title} className={cn("border-0", className)} />;
}

export default PdfPreview;
