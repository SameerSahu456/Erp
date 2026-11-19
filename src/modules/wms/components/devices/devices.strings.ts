// User-facing copy for the WMS › devices sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks.
//
// Dynamic copy is expressed as a function member.
export const DEVICES_STRINGS = {
  // A component inside still waits to be checked (inward-verification D8).
  componentsUnchecked: 'Unchecked components',
  // DeviceDetailBody — page header / breadcrumbs
  detail: {
    breadcrumbs: {
      wms: 'WMS',
      devices: 'Devices',
    },
    notFoundTitle: 'Device Not Found',
    notFoundDescription: 'The device you are looking for does not exist.',
    notFoundBack: 'Back',
    // Action buttons
    startInspection: 'Start Inspection',
    startRepair: 'Start Repair',
    startQC: 'Start QC',
    assemble: 'Assemble',
    sendToVendor: 'Send to vendor',
    complete: 'Complete',
    repaint: 'Repaint',
    assignRack: 'Assign Rack',
    reassignRack: 'Reassign Rack',
  },
  // DeviceDetailBody — Device Information card
  deviceInfo: {
    cardTitle: 'Device Information',
    engineerAssignmentsLabel: 'Engineer Assignments',
    l3Engineer: 'L3 Engineer',
    l3EngineerPlaceholder: 'Assign L3 engineer…',
    displayEngineer: 'Display Engineer',
    displayEngineerPlaceholder: 'Assign Display engineer…',
    // BOM Components card
    bomTitle: 'BOM Components',
    // `N component(s)` count badge
    componentCount: (n: number) => `${n} component${n === 1 ? '' : 's'}`,
    bomColumns: {
      partNumber: 'Part Number',
      serialNumber: 'Serial Number',
      position: 'Position',
      qty: 'Qty',
    },
  },
  // DeviceDetailBody — info row field labels
  infoLabels: {
    barcode: 'Barcode',
    serialNo: 'Serial No',
    partNoModel: 'Part No / Model',
    batch: 'Batch',
    location: 'Location',
    category: 'Category',
  },
  // DeviceDetailBody — Timeline entry titles
  timeline: {
    cardTitle: 'Workflow History',
    noActivity: 'No activity yet.',
    received: 'Received',
    // `Device received and added to <batchNumber>.`
    receivedDescription: (batchNumber: string) =>
      `Device received and added to ${batchNumber}.`,
    // `Inspected — N issue(s) found` / `Inspected — all checks passed`
    inspectedIssues: (failures: number) =>
      `Inspected — ${failures} issue(s) found`,
    inspectedPassed: 'Inspected — all checks passed',
    // `<repairType> repair — <status>`
    repairEntry: (repairType: string, status: string) =>
      `${repairType} repair — ${status}`,
    // Paint timeline titles
    paintSentToVendor: (panelLabel: string) =>
      `Paint (${panelLabel}) — sent to vendor`,
    paintSentForRepaint: (panelLabel: string) =>
      `Paint (${panelLabel}) — sent for repaint`,
    paintCompleted: (panelLabel: string) =>
      `Paint (${panelLabel}) — completed`,
    // QC timeline title  `Inward QC — Passed (Grade A)` / `Inward QC — Failed`
    qcPassed: (grade?: string) =>
      `Inward QC — Passed${grade ? ` (Grade ${grade})` : ''}`,
    qcFailed: 'Inward QC — Failed',
    // Device-level QC pass entry (when no qcRecords)
    qcPassedEntry: (grade?: string) =>
      `QC Passed${grade ? ` — Grade ${grade}` : ''}`,
  },
  // DeviceDetailBody — Paint Required card
  paint: {
    cardTitle: 'Paint Required',
    empty: 'No paint work has been logged for this device.',
  },
  // DeviceDetailBody — Workflow Requirements card
  workflowRequirements: {
    cardTitle: 'Workflow Requirements',
    pending: 'Pending',
    done: 'Done',
    issued: 'Issued',
  },
  // DeviceDetailBody — Send to Vendor / Send for Repaint dialog
  sendVendorDialog: {
    titleSend: 'Send to Vendor',
    titleRepaint: 'Send for Repaint',
    deviceLabel: 'Device',
    panelsLabel: 'Panels',
    vendorLabel: 'Vendor',
    vendorPlaceholder: 'Select a paint vendor…',
    notesLabel: 'Notes (optional)',
    notesPlaceholder: 'Special instructions for the vendor…',
    cancel: 'Cancel',
    send: 'Send',
  },
  // DeviceDetailBody toast messages
  toastDevice: {
    openingInspection: (barcode: string) => `Opening inspection for ${barcode}…`,
    openingRepair: (barcode: string) => `Opening repair for ${barcode}…`,
    openingAssembly: (barcode: string) => `Opening assembly for ${barcode}…`,
    paintComplete: (barcode: string) => `Paint complete for ${barcode}`,
    // `<barcode> sent for repaint to <vendorName>`
    sentForRepaint: (barcode: string, vendorName: string) =>
      `${barcode} sent for repaint to ${vendorName}`,
    // `<barcode> sent to <vendorName> (N panel(s))`
    sentToVendor: (barcode: string, vendorName: string, panelCount: number) =>
      `${barcode} sent to ${vendorName} (${panelCount} panel${panelCount > 1 ? 's' : ''})`,
    // Engineer assignment: `<barcode>: L3 engineer set to <name>`
    engineerSet: (barcode: string, role: string, name: string) =>
      `${barcode}: ${role} engineer set to ${name}`,
    vendorRequired: 'Please select a vendor.',
    // Roles displayed in the engineer set toast
    roleL3: 'L3',
    roleDisplay: 'Display',
  },
  // AssignRackDialog
  assignRack: {
    dialogTitle: 'Assign Rack',
    selectedLocation: 'Selected location',
    locationPlaceholder: 'Pick warehouse → row → rack → bin',
    // Grade badge label `Grade A`
    gradeBadge: (grade: string) => `Grade ${grade}`,
    // Field labels
    warehouseLabel: 'Warehouse',
    warehousePlaceholder: 'Select warehouse…',
    rowLabel: 'Row',
    rowPlaceholder: 'Select row…',
    rowPlaceholderPickWarehouse: 'Pick warehouse first',
    rackLabel: 'Rack',
    rackPlaceholder: 'Select rack…',
    rackPlaceholderPickRow: 'Pick row first',
    binLabel: 'Bin',
    binPlaceholder: 'Select bin…',
    binPlaceholderPickRack: 'Pick rack first',
    cancel: 'Cancel',
    assign: 'Assign',
    // Field errors
    warehouseRequired: 'Warehouse is required.',
    rowRequired: 'Row is required.',
    rackRequired: 'Rack is required.',
    binRequired: 'Bin is required.',
    fixHighlighted: 'Please fix the highlighted fields.',
    // `<subjectLabel> assigned to <location> at <warehouse>`
    assignedToast: (subjectLabel: string, location: string, warehouse: string) =>
      `${subjectLabel} assigned to ${location} at ${warehouse}`,
    itemFallback: 'Item',
    // Rack capacity suffix: `<name> · <n>% used`
    rackCapacityUsed: (name: string, capacityUsed: number) =>
      `${name} · ${capacityUsed}% used`,
  },
  // AssignToRackBody — page header / summary
  assignToRack: {
    pageTitle: 'Assign to Rack',
    pageSubtitle: 'Assign QC-passed devices to warehouse rack locations.',
    breadcrumbs: {
      wms: 'WMS',
      assignToRack: 'Assign to Rack',
    },
    summaryAwaitingAssignment: 'Awaiting Assignment',
    summaryAssignedThisSession: 'Assigned This Session',
    summaryAlreadyInRack: 'Already in Rack',
    // Tab label `QC Passed - Unassigned (N)`
    tabLabel: (count: number) => `QC Passed - Unassigned (${count})`,
    columns: {
      barcode: 'Barcode',
      partNo: 'Part No',
      serialNo: 'Serial No',
      biosNo: 'BIOS No',
      category: 'Category',
      brand: 'Brand',
      grade: 'Grade',
      qcPassed: 'QC Passed',
      rackAssignment: 'Rack Assignment',
      actions: 'Actions',
    },
    notAssigned: 'Not assigned',
    actionAssign: 'Assign Rack',
    actionReassign: 'Reassign',
    assemblyAriaLabel: 'Assembly',
  },
  // DevicesAssignmentBody — page header / stats
  assignment: {
    pageTitle: 'Devices',
    pageSubtitle:
      'Store manager assigns each device to an L1/L2, L3, or Display repair engineer, plus a QC engineer.',
    breadcrumbs: {
      wms: 'WMS',
      devices: 'Devices',
    },
    stats: {
      l2Pending: 'L2 Pending',
      l3Pending: 'L3 Pending',
      displayPending: 'Display Pending',
      totalDevices: 'Total Devices',
    },
    // Tab labels — counts injected at runtime
    tabAllDevices: (count: number) => `All Devices (${count})`,
    tabL2Repair: (count: number) => `L2 Repair (${count})`,
    tabL3Repair: (count: number) => `L3 Repair (${count})`,
    tabDisplay: (count: number) => `Display (${count})`,
    // Table columns
    columns: {
      barcode: 'Barcode',
      partNo: 'Part No',
      serialNo: 'Serial No',
      category: 'Category',
      brand: 'Brand',
      batch: 'Batch',
      jobStatus: 'Job Status',
      repairEngineer: 'Repair Engineer',
      qcEngineer: 'QC Engineer',
      status: 'Status',
      inspectionEngineer: 'Inspection Engineer',
      l3Engineer: 'L3 Engineer',
      displayEngineer: 'Display Engineer',
    },
    // Engineer select placeholders
    assignEngineer: 'Assign engineer…',
    assignQcEngineer: 'Assign QC engineer…',
    assignL1L2: 'Assign L1 / L2…',
    assignL3: 'Assign L3…',
    assignDisplay: 'Assign Display…',
    assignQC: 'Assign QC…',
    // Empty state
    emptyTitle: 'No Devices to Assign',
    emptyDescription:
      'Devices appear here after inward receipt — assign repair and QC engineers to move them through the pipeline.',
    // Toast messages
    assignedToast: (barcode: string, engineer: string) =>
      `${barcode} assigned to ${engineer}`,
    assignedQcToast: (barcode: string, engineer: string) =>
      `${barcode} assigned to ${engineer} for QC`,
    // `<barcode>: <roleLabel> engineer set to <engineer>`
    roleEngineerSetToast: (barcode: string, roleLabel: string, engineer: string) =>
      `${barcode}: ${roleLabel} engineer set to ${engineer}`,
    // Role display labels (used in toast)
    roleLabels: {
      l1l2: 'L1 / L2',
      l3: 'L3',
      display: 'Display',
      qc: 'QC',
    },
  },
  // DevicesAssignmentBody — the reconciled real-API Devices queue/hub page
  // (list table + stage tabs + per-cell engineer assign). Mirrors the dispatches
  // `list` convention. NOTE: the `assignment` group above predates this page and
  // is currently unused; it is left untouched to avoid altering shared copy.
  list: {
    title: 'Devices',
    subtitle:
      'Assign an L1/L2 repair engineer and a QC engineer to each device in the pipeline.',
    searchPlaceholder: 'Search by barcode, serial, or part…',
    columns: {
      barcode: 'Barcode',
      partNo: 'Part Number',
      partName: 'Part Name',
      partVariant: 'Variant Name',
      serialNo: 'Serial No',
      category: 'Category',
      batch: 'Batch',
      status: 'Status',
      inspectionEngineer: 'Inspection Engineer',
      repairEngineer: 'Repair Engineer',
      qcEngineer: 'QC Engineer',
    },
    tabs: {
      all: 'All',
      inspection: 'Inspection',
      repair: 'Repair',
      qc: 'QC',
      // Condemned devices. Not a pipeline stage — it filters
      // `stock_items.status`, not `workflow_status` (device-scrap D1).
      scrap: 'Scrap',
    },
    assignEngineerPlaceholder: 'Assign engineer…',
    notReadyInspection: 'Not at inspection',
    notReadyRepair: 'Not at repair',
    notReadyInspectionRepair: 'Assigned at inspection / repair',
    notReadyQc: 'Assigned during QC',
    error: {
      title: 'Couldn’t load devices',
      description: 'Refresh to try again.',
    },
    empty: {
      title: 'No devices found',
      description: 'Devices appear here after an inward batch is finalized.',
    },
  },
  // Banner shown on a device that is currently set aside for a vendor return.
  liveReturn: {
    bannerTitle: 'This device is set aside for a vendor return',
    salesBannerTitle: 'This device came back on a sales return',
    reasonLabel: 'Reason',
  },
} as const
