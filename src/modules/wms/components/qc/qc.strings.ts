// User-facing copy for the WMS › QC sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, labels, helper text, and toast messages live here as
// one typed `as const` object instead of being hardcoded in JSX/hooks.
// Dynamic copy is expressed as a function member.
export const QC_STRINGS = {
  page: {
    title: 'Quality Control',
    subtitle: 'Inward QC gates rack assignment. Failed devices are sent back to repair.',
    breadcrumbWms: 'WMS',
    breadcrumbQc: 'QC',
  },
  inwardSection: {
    heading: 'Inward QC',
    description: 'Quality check on repaired devices before rack assignment.',
  },
  table: {
    emptyTitle: 'No Devices Awaiting Inward QC',
    emptyDescription: 'Repaired devices will appear here once ready for a quality check.',
    assignPlaceholder: 'Assign...',
    startInwardQC: 'Start Inward QC',
    assemblyAriaLabel: 'Assembly',
    resultPass: 'Pass',
    resultFail: 'Fail',
  },
  checklistGroup: {
    passPill: 'pass',
    failPill: 'fail',
  },
  dialog: {
    // Title is dynamic: "Inward QC: <barcode>"
    titlePrefix: 'Inward QC: ',
    deviceFieldModel: 'Model:',
    deviceFieldBrand: 'Brand:',
    deviceFieldSerial: 'Serial:',
    deviceFieldBios: 'BIOS:',
    progressLabel: 'Progress',
    checklistPassBtn: 'Pass',
    checklistFailBtn: 'Fail',
    checklistNaBtn: 'N/A',
    issuePlaceholder: 'Describe the issue...',
    qcResultLabel: 'QC Result',
    qcPassBtn: 'Pass',
    qcFailBtn: 'Fail',
    gradeLabel: 'Grade',
    gradeABtn: 'Grade A - Excellent',
    gradeBBtn: 'Grade B - Good',
    failAlert:
      'Device will be sent back to repair. Current inward QC fail count:',
    additionalNotesLabel: 'Additional Notes',
    additionalNotesPlaceholder: 'Additional observations, comments...',
    attachmentsLabel: 'Attachments',
    attachmentsHelper: 'JPG, PNG, or PDF files (max 5 MB each)',
    addAttachment: 'Add Attachment',
    cancel: 'Cancel',
    submitQcResult: 'Submit QC Result',
  },
  toast: {
    fileTooLarge: (name: string) => `"${name}" exceeds 5 MB limit.`,
    fileUnsupportedType: (name: string) =>
      `"${name}" is not a supported file type (jpg, png, pdf only).`,
    checklistIncomplete: 'Please complete all checklist items.',
    noResultSelected: 'Please select a QC result (Pass/Fail).',
    noGradeSelected: 'Please select a grade.',
    passedResult: (barcode: string, grade: string, gradeLabel: string) =>
      `Inward QC passed for ${barcode} - Grade ${grade} (${gradeLabel}) — ready for rack assignment`,
    failedResult: (barcode: string) =>
      `Inward QC failed for ${barcode} - sent back to repair`,
    assigned: (barcode: string, engineer: string) =>
      `${barcode} assigned to ${engineer}`,
  },

  // Queue view (QCBody.tsx — the QC worklist page). Kept as its own
  // self-contained group: this screen's subtitle and empty-state copy differ
  // from the dialog-oriented `page` / `table` groups above (which drifted), so
  // its keys are byte-exact to what QCBody renders and reuse nothing from them.
  body: {
    title: 'Quality Control',
    subtitle:
      'Devices pending or under quality control. Start QC and record a grade on completion.',
    tabs: {
      pendingQc: 'Pending QC',
      underQc: 'Under QC',
      completed: 'Completed',
    },
    columns: {
      barcode: 'Barcode',
      partNo: 'Part Number',
      partName: 'Part Name',
      partVariant: 'Variant Name',
      serialNo: 'Serial No',
      category: 'Category',
      brand: 'Brand',
      rework: 'Rework',
      received: 'Received',
      assignedTo: 'Assigned To',
      actions: 'Actions',
    },
    searchPlaceholder: 'Search by barcode, serial, or part…',
    startInwardQc: 'Start Inward QC',
    scrap: 'Scrap',
    empty: {
      errorTitle: 'Couldn’t load the queue',
      errorDescription: 'Refresh to try again.',
      clearTitle: 'QC queue is clear',
      clearDescription: 'No devices are pending or under QC right now.',
    },
  },

  // Complete-QC form (QcCompleteDialog.tsx). Runs the shared inward-QC checklist
  // (or an explicit Pass/Fail), records a grade on a pass, and routes fails back
  // to repair. Its own group so this copy stays independent of the legacy,
  // drifted `dialog` group above.
  completeDialog: {
    title: 'Complete QC',
    cancel: 'Cancel',
    submit: 'Complete QC',
    // Why Complete is disabled — shown in a tooltip so the operator knows which
    // condition is unmet (§0.9/§9).
    blocked: {
      checklist: 'Answer all required checklist items to continue.',
      checklistUnavailable: 'The checklist for this part couldn’t be loaded. Close and reopen to try again.',
      result: 'Select a Pass or Fail result to continue.',
      photo: 'Add at least one QC photo to continue.',
      grade: 'Select a grade for this pass to continue.',
    },
    loadingChecklist: 'Loading checklist…',
    checklistLabel: 'Checklist',
    requiredProgress: (answered: number, total: number) =>
      `${answered}/${total} required`,
    resultLabel: 'QC result',
    resultHelperNoPassFail:
      'This checklist has no Pass/Fail item — set the result explicitly. A fail routes the device to repair.',
    resultHelperNoChecklist:
      'No checklist applies — set the result. A fail routes the device to repair.',
    passBtn: 'Pass',
    failBtn: 'Fail',
    gradeLabel: 'Grade',
    gradePlaceholder: 'Select a grade…',
    gradeOption: (grade: string) => `Grade ${grade}`,
    photoLabel: 'QC photo',
    notesLabel: 'Notes',
    notesPlaceholder: 'Optional QC notes (findings, defects, observations)…',
    submitHelper: 'On submit, the device advances out of QC.',
    discardTitle: 'Discard Changes?',
    discardDescription:
      'Are you sure you want to discard the changes? Anything you entered on this form will be cleared.',
    discardConfirm: 'Discard',
    discardStay: 'Keep editing',
    photoUploadFailed: 'Failed to upload the QC photo.',
  },
} as const
