// User-facing copy for FileUpload.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy).
export const FILE_UPLOAD_STRINGS = {
  dropzone: {
    prompt: "Drop files here or click to upload",
    // Dynamic helpers — both optional and joined with " · " when both present.
    accepted: (accept: string) => `Accepted: ${accept}`,
    maxSize: (size: string) => `Max size: ${size}`,
  },
  // Client-side rejection messages — shown inline so the user learns why a file
  // was refused before any upload is attempted.
  errors: {
    tooBig: (name: string, size: string, max: string) =>
      `${name} is ${size} — must be ${max} or less.`,
    badType: (name: string, allowed: string) => `${name} — only ${allowed} are allowed.`,
  },
} as const
