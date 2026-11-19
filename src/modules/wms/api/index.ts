// Barrel for the WMS API layer, split out of the former monolithic `api.ts`
// by sub-feature (§14.1). Import site is unchanged: `from '../../api'` still
// resolves here and re-exports every endpoint wrapper + type.
// NOTE: `./dispatch` was already a standalone module imported directly via
// `from '../../api/dispatch'`; it is intentionally NOT re-exported here to
// preserve the existing import paths (and avoid duplicate-export clashes).
export * from './warehouses'
export * from './warehouse-team'
export * from './inward'
export * from './rental-return-inward'
export * from './inward-exceptions'
export * from './kits'
export * from './devices'
export * from './device-identity'
export * from './device-contents'
export * from './stages'
export * from './service-jobs'
export * from './spares'
export * from './material-issue'
export * from './material-issue-outward'
export * from './purchase-returns'
export * from './stock'
export * from "./stock-transfer";
