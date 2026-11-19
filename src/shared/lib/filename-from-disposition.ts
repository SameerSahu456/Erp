const FILENAME_RE = /filename="?([^";]+)"?/i;

/** The file name a `Content-Disposition` header names, or null when it names none. */
export function filenameFromDisposition(disposition: string | null | undefined): string | null {
  return FILENAME_RE.exec(disposition ?? "")?.[1] ?? null;
}
