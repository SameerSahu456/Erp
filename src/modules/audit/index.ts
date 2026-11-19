// Public surface of the audit module — only export what other modules need.

export { fetchAuditTrailPage } from "./api";
export {
  auditTrailKey,
  useEntityAuditTrail,
  type AuditEntityKind,
  type AuditTrailResource,
} from "./hooks/useEntityAuditTrail";
export { useEntityAuditTrailCount } from "./hooks/useEntityAuditTrailCount";
export { auditEntryToActivity } from "./mappers/toActivity";
export {
  EntityAuditTrailTab,
  LeadAuditTrailTab,
  DealAuditTrailTab,
} from "./components/EntityAuditTrailTab";
export { AUDIT_PERMISSIONS } from "./permissions";
export type { AuditEntry, AuditListResponse, FetchAuditTrailParams } from "./types";
