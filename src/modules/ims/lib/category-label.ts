/**
 * Display label for a category in any picker / dropdown.
 *
 * When the category has a parent, the label renders as `"Parent / Category"`
 * so same-named sub-categories under different parents stay distinguishable.
 * Top-level categories render their bare name. Works with both the full
 * `Category` and the slim `CategoryShort` shapes — it only reads `name` and
 * `parent_name`.
 */
export function categoryLabel(category: {
  name: string;
  parent_name?: string | null;
}): string {
  return category.parent_name
    ? `${category.parent_name} / ${category.name}`
    : category.name;
}
