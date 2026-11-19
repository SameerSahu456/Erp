/** WMS query-key factory, the one source of WMS keys (§15 / §16.9). After a write,
 *  invalidate `lists()` + `detail(id)`, never `all`. */
export const WMS_KEY = ["wms"] as const;

function feature<F extends string>(name: F) {
  const all = [...WMS_KEY, name] as const;
  return {
    all,
    /** Prefix of every list page — invalidate after a create / status change. */
    lists: () => [...all, "list"] as const,
    list: (params: unknown) => [...all, "list", params] as const,
    /** Prefix of every tab-count query. */
    counts: () => [...all, "count"] as const,
    count: (params: unknown) => [...all, "count", params] as const,
    /** Prefix of every stats query for this feature. */
    statsAll: () => [...all, "stats"] as const,
    stats: (params: unknown = null) => [...all, "stats", params] as const,
    /** Prefix of every picker / filter option list. */
    optionsAll: () => [...all, "options"] as const,
    /** Picker / filter option lists: `options("batch", whKey, q)`. */
    options: (kind: string, ...args: unknown[]) =>
      [...all, "options", kind, ...args] as const,
    /** Prefix of every record of this feature — for writes whose record id
     *  isn't in the response. */
    details: () => [...all, "detail"] as const,
    /** One record, and every sub-resource nested under it. */
    detail: (id: string) => [...all, "detail", id] as const,
  };
}

/** Sort + join a warehouse selection so the same set always yields the same key. */
export function warehouseScopeKey(ids: readonly string[]): string {
  return [...ids].sort().join(",");
}

const devices = feature("devices");
const warehouses = feature("warehouses");
const locations = feature("locations");
const workAssignments = feature("work-assignments");
const materialIssues = feature("material-issues");
const availableStock = feature("available-stock");
const dispatches = feature("dispatches");
const transfers = feature("transfers");
const purchaseReturns = feature("purchase-returns");
const spares = feature("spares");
const checklists = feature("checklists");
const serviceJobs = feature("service-jobs");

export const wmsKeys = {
  /** GET /wms/my-warehouses — the navbar scope + RBAC source. Its own root so a
   *  device-list refresh never refetches it. */
  myWarehouses: [...WMS_KEY, "my-warehouses"] as const,

  /** Page stat cards: `stats(scope, whKey, assigneeId)`. */
  stats: {
    all: [...WMS_KEY, "stats"] as const,
    scope: (scope: string, whKey: string | null, assigneeId: string | null) =>
      [...WMS_KEY, "stats", scope, whKey, assigneeId] as const,
  },

  /** GET /wms/devices/scrap-pending-placement — the store manager's placement
   *  queue (device-scrap D6). Its own root: it is a manager worklist, not a
   *  slice of the device list, and it must refresh when a scrap or a placement
   *  lands anywhere. */
  scrapPendingPlacementAll: () =>
    [...WMS_KEY, "scrap-pending-placement"] as const,
  scrapPendingPlacement: (scopeKey: string, page = 1) =>
    [...WMS_KEY, "scrap-pending-placement", scopeKey, page] as const,

  devices: {
    ...devices,
    /** Active stage operation on a device (inspection / repair / qc). */
    stageOp: (id: string, stage: "inspection" | "repair" | "qc") =>
      [...devices.detail(id), "op", stage] as const,
    history: (id: string) =>
      [...devices.detail(id), "workflow-history"] as const,
    timeLog: (id: string) => [...devices.detail(id), "time-log"] as const,
    checklistRuns: (id: string) =>
      [...devices.detail(id), "checklist-runs"] as const,
    serviceJobs: (id: string) =>
      [...devices.detail(id), "service-jobs"] as const,
  },

  grnBatches: feature("grn-batches"),
  inwardSources: feature("inward-sources"),
  inwardExceptions: feature("inward-exceptions"),

  warehouses: {
    ...warehouses,
    team: (whId: string) => [...warehouses.detail(whId), "team"] as const,
    teamPage: (whId: string, params: unknown) =>
      [...warehouses.detail(whId), "team", "page", params] as const,
    /** Every location view of one warehouse (tree, racks, utilization, …). */
    locations: (whId: string) =>
      [...warehouses.detail(whId), "locations"] as const,
    locationView: (whId: string, view: string, ...args: unknown[]) =>
      [...warehouses.detail(whId), "locations", view, ...args] as const,
  },

  /** A single location (rack / bin): its bins and its contents. */
  locations: {
    ...locations,
    bins: (rackId: string) => [...locations.detail(rackId), "bins"] as const,
    binOptions: (rackId: string, q: string) =>
      [...locations.detail(rackId), "bin-options", q] as const,
    contents: (locationId: string, params: unknown) =>
      [...locations.detail(locationId), "contents", params] as const,
  },

  /** Cross-warehouse engineer / user pickers. Invalidated with any team write. */
  engineers: feature("engineers"),

  workAssignments: {
    ...workAssignments,
    lines: (id: string, params: unknown) =>
      [...workAssignments.detail(id), "lines", params] as const,
    eligibleAll: () => [...workAssignments.all, "eligible"] as const,
    eligible: (kind: "summary" | "devices" | "engineers", ...args: unknown[]) =>
      [...workAssignments.all, "eligible", kind, ...args] as const,
    stages: () => [...workAssignments.all, "stages"] as const,
  },

  materialIssues: {
    ...materialIssues,
    pullOuts: (id: string) =>
      [...materialIssues.detail(id), "pull-outs"] as const,
    components: (id: string, params: unknown) =>
      [...materialIssues.detail(id), "components", params] as const,
    /** The outward worklist (one row per MI line). */
    linesAll: () => [...materialIssues.all, "lines"] as const,
    lines: (params: unknown) =>
      [...materialIssues.all, "lines", params] as const,
    linesCount: (params: unknown) =>
      [...materialIssues.all, "lines", "count", params] as const,
    issuedLinesAll: () => [...materialIssues.all, "issued-lines"] as const,
    issuedLines: (params: unknown) =>
      [...materialIssues.all, "issued-lines", params] as const,
    demand: (params: unknown) =>
      [...materialIssues.all, "demand", params] as const,
    outwardSources: (...args: unknown[]) =>
      [...materialIssues.all, "outward-sources", ...args] as const,
  },

  availableStock: {
    all: availableStock.all,
    units: (whId: string, variantId: string, q: string) =>
      [...availableStock.all, "units", whId, variantId, q] as const,
    counts: (whId: string, variantIds: readonly string[]) =>
      [...availableStock.all, "counts", whId, variantIds] as const,
  },

  dispatches: {
    ...dispatches,
    lineItems: (id: string) =>
      [...dispatches.detail(id), "line-items"] as const,
    readyUnitsAll: () => [...dispatches.all, "ready-units"] as const,
    readyUnits: (sourceType: string, sourceId: string) =>
      [...dispatches.all, "ready-units", sourceType, sourceId] as const,
  },

  transfers: {
    ...transfers,
    candidates: (id: string, q: string) =>
      [...transfers.detail(id), "candidates", q] as const,
  },

  purchaseReturns: {
    ...purchaseReturns,
    returnableUnits: (poId: string) =>
      [...purchaseReturns.all, "returnable-units", poId] as const,
  },

  spares: {
    ...spares,
    inventoryAll: () => [...spares.all, "inventory"] as const,
    inventory: (params: unknown) =>
      [...spares.all, "inventory", params] as const,
    movements: (reqId: string) =>
      [...spares.detail(reqId), "movements"] as const,
  },

  checklists: {
    ...checklists,
    resolve: (typeCode: string, partId: string) =>
      [...checklists.all, "resolve", typeCode, partId] as const,
    template: (id: string) => [...checklists.all, "template", id] as const,
  },

  /** Kit lists (return-by-count §9): ticked at dispatch, checked on return.
   *  Keyed on the dispatch-request item / GRN line the kit hangs off. */
  kits: {
    all: [...WMS_KEY, "kits"] as const,
    dispatch: (driId: string) =>
      [...WMS_KEY, "kits", "dispatch", driId] as const,
    ret: (grnLineItemId: string) =>
      [...WMS_KEY, "kits", "return", grnLineItemId] as const,
  },

  reports: feature("reports"),

  serviceSections: feature("service-sections"),
  serviceVendors: feature("service-vendors"),
  serviceJobs,
};
