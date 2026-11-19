const LOADING = "…";
const DASH = "—";

interface TemplateLike {
  type_code: string;
  target_type: string;
  target_id: string;
  target_name?: string | null;
  target_path?: string | null;
}

/** The template's type label, falling back to its raw code. */
export function typeLabelFor(
  template: TemplateLike | undefined,
  types: readonly { code: string; label: string }[] | undefined,
): string | null {
  if (!template) return null;
  return (types ?? []).find((t) => t.code === template.type_code)?.label ?? template.type_code;
}

interface TargetLookup {
  categories: readonly { id: string; name?: string | null }[] | undefined;
  categoriesLoading: boolean;
  part: { part_number: string; name: string } | undefined;
  partLoading: boolean;
}

/** The target's display name: an ellipsis while in flight, an em-dash if it
 *  resolves to nothing, never the raw id (§0.7). A part prefers the name
 *  denormalised onto the template (survives a deleted part), then the lookup. */
export function targetNameFor(template: TemplateLike | undefined, lookup: TargetLookup): string {
  if (!template) return "";
  if (template.target_type === "category") {
    const name = (lookup.categories ?? []).find((c) => c.id === template.target_id)?.name;
    return describeTarget(lookup.categoriesLoading, name);
  }
  const denorm = [template.target_path, template.target_name].filter(Boolean).join(" · ");
  const looked = lookup.part ? `${lookup.part.part_number} · ${lookup.part.name}` : null;
  return describeTarget(!denorm && lookup.partLoading, denorm || looked);
}

const describeTarget = (loading: boolean, name: string | null | undefined) =>
  loading ? LOADING : (name || DASH);
