import { z } from 'zod'

// device-scrap spec: the backend's ScrapRequest strips whitespace
// (`str_strip_whitespace=True`) before enforcing `min_length=1`, so a
// whitespace-only reason becomes "" server-side and is rejected with a 422.
// `.trim()` BEFORE `.min(1)` mirrors that exactly, turning what would be a
// 422 into inline validation instead.
/** Longest scrap reason the form accepts. */
const SCRAP_REASON_MAX_CHARS = 2000

export const scrapDeviceSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'A reason is required')
    .max(SCRAP_REASON_MAX_CHARS, `Reason should not exceed ${SCRAP_REASON_MAX_CHARS} characters`),
})
export type ScrapDeviceInput = z.infer<typeof scrapDeviceSchema>

/** Longest dispose reason the backend accepts (DisposeRequest.reason). */
const DISPOSE_REASON_MAX_CHARS = 500

export const disposeDeviceSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'A reason is required')
    .max(DISPOSE_REASON_MAX_CHARS, `Reason should not exceed ${DISPOSE_REASON_MAX_CHARS} characters`),
})
export type DisposeDeviceInput = z.infer<typeof disposeDeviceSchema>
