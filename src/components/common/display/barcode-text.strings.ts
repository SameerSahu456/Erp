// User-facing copy for BarcodeText.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy).
export const BARCODE_TEXT_STRINGS = {
  printBarcode: {
    title: "Print barcode",
    ariaLabel: "Print barcode",
  },
  // toast.error message when the label couldn't be prepared.
  printFailed: "Couldn't prepare the label. Please try again.",
  // The PDF-label preview dialog (device barcode).
  preview: {
    title: "Device label",
    download: "Download PDF",
    done: "Close",
    filename: "device-label.pdf",
  },
} as const
