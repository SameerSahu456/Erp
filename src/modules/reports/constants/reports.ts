/** Roles that may see the Reports menu and routes. Kept for the app shell
 *  (sidebar nav + route guard). The Report Builder is read-only; the backend
 *  enforces the same roles on `GET /reports/catalog/{id}`. */
export const REPORT_ROLES = ["superadmin", "admin"] as const

/** Query-key root for every reports query. */
export const REPORTS_QUERY_KEY = ["reports"] as const
