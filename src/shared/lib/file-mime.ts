// Defensive wrapper that guarantees a multipart file part lands with a real
// `Content-Type` header. Browsers normally sniff `file.type` from the OS for
// any file picked via `<input type="file">` — but edge cases (file with no
// extension, drag-drop on certain platforms) leave `file.type` as the empty
// string, which makes the multipart boundary default to
// `application/octet-stream` and breaks MIME-allow-list backends.
//
// Usage:
//   form.append('field', withInferredMime(file), file.name)
//
// When `file.type` is already set the original File is returned unchanged
// (File is a Blob, so callers can hand it straight to FormData.append).
// When it's empty, the file bytes get re-wrapped as a Blob carrying the
// best guess inferred from the filename extension.
export function withInferredMime(file: File): Blob {
  if (file.type) return file

  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  const inferred = EXT_TO_MIME[ext] ?? "application/octet-stream"
  return new Blob([file], { type: inferred })
}
// Mapping covers the formats accepted by the backend's CRM_ACCOUNT and IMS
// (PART / PART_VARIANT) attachment policies. Extend in lockstep when new
// MIMEs come online server-side.
const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
}
