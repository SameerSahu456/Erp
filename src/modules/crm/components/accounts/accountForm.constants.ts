// PAN — 10 chars: 5 uppercase letters + 4 digits + 1 uppercase letter
// (e.g. ABCDE1234F). Optional. Backend regex `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`.
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
export const PAN_LENGTH = 10

// GST — 15 chars: 2-digit state code + PAN + entity number + Z + check digit
// (e.g. 27ABCDE1234F1Z5). Optional. Backend regex
// `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`.
export const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
export const GST_LENGTH = 15
