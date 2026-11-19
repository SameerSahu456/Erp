// User-facing copy for the WMS › devices device-detail body (DeviceDetailBody).
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): the page-header
// title, loading text, and the not-found empty state live here as one typed
// `as const` object instead of being hardcoded ("naked") in JSX.
//
// Dynamic copy is expressed as a function member.
export const DEVICE_DETAIL_BODY_STRINGS = {
  // PageHeader title while loading and on error/not-found
  headerTitle: 'Device',
  // Inward-verification D8: racking is not blocked, so the page says it.
  componentsUnchecked: {
    title: 'Components not checked yet',
    body: 'Some parts recorded inside this device have not been confirmed present or marked missing. Check them on the Components card.',
  },
  // Loading state
  loading: 'Loading device…',
  // Genuine load failure (500 / network) — distinct from a missing record, and
  // offers a Retry rather than claiming the device does not exist (§12).
  loadErrorTitle: "Couldn't load this device",
  loadErrorDescription: 'Something went wrong loading the device. Please try again.',
  retry: 'Retry',
  // Not-found empty state (loaded, but the record is gone)
  notFoundTitle: 'Device Not Found',
  notFoundDescription: 'This device no longer exists or failed to load.',
  // Header subtitle serial prefix `S/N <serial>`
  serialPrefix: (serial: string) => `S/N ${serial}`,
} as const
