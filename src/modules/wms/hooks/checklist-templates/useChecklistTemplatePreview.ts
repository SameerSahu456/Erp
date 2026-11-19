import { useParams } from "react-router-dom";

import { asUuid } from "@shared/lib/validation";
import { usePermission } from "@shared/rbac";
import {
  imsCan,
  useAllCategoriesShort,
  useChecklist,
  useChecklistTypes,
  usePart,
} from "@modules/ims";

import { wmsCan } from "../../permissions";
import { targetNameFor, typeLabelFor } from "./checklist-template-preview-helpers";

/** Data owner for the checklist-template preview page (§17). */
export function useChecklistTemplatePreview() {
  // §11.1 — the route `:id` is untrusted. A malformed id keeps the query
  // disabled and lands on the not-found body, never a 422.
  const { id: rawId } = useParams<{ id: string }>();
  const templateQuery = useChecklist(asUuid(rawId) ?? "");
  const template = templateQuery.data;
  // Author rights: ims:manage OR wms:checklist_write — same gate as the list's
  // Edit affordance and the edit route.
  const canManage = usePermission().can([...imsCan.write, ...wmsCan.checklistManage]);

  const { data: types } = useChecklistTypes();
  const typeLabel = typeLabelFor(template, types);

  // Resolve the target (category or part) to a human name. Both lookups are
  // cheap and cached.
  const { data: categories, isLoading: categoriesLoading } = useAllCategoriesShort();
  const partQuery = usePart(template?.target_type === "part" ? template.target_id : "");

  const targetName = targetNameFor(template, {
    categories,
    categoriesLoading,
    part: partQuery.data,
    partLoading: partQuery.isLoading,
  });

  return { templateQuery, template, typeLabel, targetName, canManage };
}
