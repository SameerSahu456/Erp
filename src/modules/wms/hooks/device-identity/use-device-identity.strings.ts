// Toast copy for the three device-identity mutations (Coding-guideline §16.12).
export const USE_DEVICE_IDENTITY_STRINGS = {
  toasts: {
    serialRecorded: "Serial number saved",
    serialCorrected: "Serial number corrected",
    deviceReidentified: "Part re-identified",
    poLineRelinked: "Purchase order line updated",
    rerunRequired:
      "A different checklist now applies — this device must be re-inspected before it can be racked.",
  },
} as const;
