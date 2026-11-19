const KB = 1024;
const MB = KB * 1024;

/** Human file size: 512 B · 14 KB · 3.2 MB. */
export function formatBytes(n: number): string {
  if (n < KB) return `${n} B`;
  if (n < MB) return `${Math.round(n / KB)} KB`;
  return `${(n / MB).toFixed(1)} MB`;
}
