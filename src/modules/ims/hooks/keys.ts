// ['ims', <feature>, <kind>, …args] — most generic → most specific (§16.9.1).
const feature = <N extends string>(name: N) => {
  const all = ["ims", name] as const;
  return {
    all,
    lists: () => [...all, "list"] as const,
    list: (params: unknown) => [...all, "list", params] as const,
    counts: () => [...all, "count"] as const,
    count: (params: unknown) => [...all, "count", params] as const,
    details: () => [...all, "detail"] as const,
    detail: (id: string) => [...all, "detail", id] as const,
  };
};

const stockAdjustments = feature("stock-adjustments");

/** IMS query-key roots, exported for cross-module invalidation (§16.9). */
export const imsKeys = {
  stock: ["ims", "stock"] as const,
  parts: ["ims", "parts"] as const,
  variants: ["ims", "variants"] as const,
  stockAdjustments: {
    ...stockAdjustments,
    /** Count-pick preview for one draft line (not a record — keyed by the line). */
    linePreview: (params: unknown) => [...stockAdjustments.all, "line-preview", params] as const,
    /** Remove-by-serial picker options for one warehouse + variant + search. */
    removableUnitsAll: () => [...stockAdjustments.all, "removable-units"] as const,
    removableUnits: (params: unknown) =>
      [...stockAdjustments.all, "removable-units", params] as const,
  },
  exports: feature("exports"),
} as const;
