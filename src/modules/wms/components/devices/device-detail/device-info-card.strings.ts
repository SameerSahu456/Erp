// User-facing copy for the WMS › devices › Device Information card.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): the card title
// and every icon-grid field label live here as one typed `as const` object
// instead of being hardcoded ("naked") in the component.
//
// NOT included (correctly sourced elsewhere): the Batch link route path, the
// InfoField className strings, and the resolved cell values (partModel, batch,
// location, category) which are computed data passed in as props.
export const DEVICE_INFO_CARD_STRINGS = {
  card: {
    title: 'Device Information',
  },

  // Icon-grid field labels.
  fields: {
    barcode: 'Barcode',
    serialNo: 'Serial No',
    partModel: 'Part No / Model',
    variantName: 'Variant Name',
    batch: 'Batch',
    workAssignment: 'Work Assignment',
    location: 'Location',
    category: 'Category',
  },

  // Inline affordances on the Serial No field (device-identity spec §7).
  actions: {
    addSerial: 'Add',
    editSerial: 'Edit',
  },
} as const
