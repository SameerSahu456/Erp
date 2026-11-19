/** Hand a fetched blob to the browser as a download. Files are fetched through
 *  the API client (the token is a header), so an object URL is the only way out. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoked on a delay: Safari cancels an in-flight download whose URL vanishes.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Download a URL the browser may fetch on its own (e.g. a presigned link). */
export function saveUrl(url: string, filename: string): void {
  const link = document.createElement("a");
  link.href = url;
  // Cross-origin hosts ignore `download`; their Content-Disposition names the file.
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
}
