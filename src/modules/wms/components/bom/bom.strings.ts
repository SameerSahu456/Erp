// User-facing copy for the WMS › BOM sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error text, card labels, and column headers live
// here as one typed `as const` object. Components import via a relative path.
export const BOM_STRINGS = {
  detail: {
    notFound: "BOM Not Found",
    backToBOMs: "Back to BOMs",
    outputProduct: "Output Product",
    sourceProduct: "Source Product",
    componentsRequired: "Components Required",
    componentsRecovered: "Components Recovered",
    componentsSummary: (required: number, optional: number, substitutable: number) =>
      `(${required} required, ${optional} optional, ${substitutable} substitutable)`,
    substitutesAvailable: (count: number) => `${count} substitute(s) available`,
    optional: "Optional",
    assembly: "Assembly",
    disassembly: "Disassembly",
    stats: {
      lineItems: "Line Items",
      totalComponents: "Total Components",
      estTime: "Est. Time",
      estCost: "Est. Cost",
    },
    parentCard: {
      partNo: "Part no:",
    },
    itemBadges: {
      optional: "Optional",
      substitutable: "Substitutable",
    },
    metadata: {
      details: "Details",
      createdBy: "Created By",
      approvedBy: "Approved By",
      created: "Created",
      lastUpdated: "Last Updated",
      notes: "Notes",
    },
  },
  list: {
    title: "Bill of Materials",
    subtitle: "BOM templates used to assemble devices and kits.",
    createBOM: "Create BOM",
    columns: {
      bomNumber: "BOM #",
      name: "Name",
      type: "Type",
      product: "Product",
      components: "Components",
      version: "Ver.",
      estCost: "Est. Cost",
      status: "Status",
      created: "Created",
    },
    stats: {
      totalBOMs: "Total BOMs",
      assembly: "Assembly",
      disassembly: "Disassembly",
      active: "Active",
    },
    tabs: {
      allBOMs: (count: number) => `All BOMs (${count})`,
      assembly: (count: number) => `Assembly (${count})`,
      disassembly: (count: number) => `Disassembly (${count})`,
    },
    typeLabels: {
      assembly: "Assembly",
      disassembly: "Disassembly",
    },
    actions: {
      view: "View",
    },
    empty: {
      title: "No BOMs Yet",
      description:
        "Create a BOM to define the parts and steps needed to assemble a device or kit.",
      action: "Create BOM",
    },
  },
  relatedParts: {
    title: "Related & Replaceable Parts",
    subtitle: "Part alternatives, upgrades, downgrades, and compatibility mappings.",
    stats: {
      totalMappings: "Total Mappings",
      alternatives: "Alternatives",
      upgrades: "Upgrades",
      compatible: "Compatible",
    },
    tabs: {
      all: (count: number) => `All (${count})`,
      alternatives: (count: number) => `Alternatives (${count})`,
      upgrades: (count: number) => `Upgrades (${count})`,
      downgrades: (count: number) => `Downgrades (${count})`,
      compatible: (count: number) => `Compatible (${count})`,
    },
    columns: {
      sourcePart: "Source Part",
      relation: "Relation",
      relatedPart: "Related Part",
      sourceBrand: "Source Brand",
      relatedBrand: "Related Brand",
      category: "Category",
      priority: "Priority",
      notes: "Notes",
      status: "Status",
    },
    empty: {
      title: "No Part Relationships Configured",
      description:
        "Define alternatives, upgrades, and compatibility mappings to help assembly and substitution.",
    },
  },
} as const
