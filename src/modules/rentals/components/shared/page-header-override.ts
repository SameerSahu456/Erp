import type { ReactNode } from "react"

/** A page that hosts a list body supplies its own title and a toolbar (the
 *  Approvals page: "Approvals" + the Early exit | PO switch). Omitted, the
 *  body renders its own title as a standalone page. */
export interface PageHeaderOverride {
  title: string
  toolbar?: ReactNode
}

/** The header a list body renders: the host page's, else its own title. */
export function resolvePageHeader(
  header: PageHeaderOverride | undefined,
  ownTitle: string,
): PageHeaderOverride {
  return { title: header?.title ?? ownTitle, toolbar: header?.toolbar }
}
