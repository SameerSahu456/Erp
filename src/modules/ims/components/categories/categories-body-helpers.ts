import type { Category } from "../../api";

// Local tree shape mirrors what the demo's mockCategories provided directly.
// The real backend returns a flat list with `parent_id`, so we build the
// nested form once and walk it in CategoryNode just like the demo does.
export interface TreeNode {
  id: string;
  name: string;
  partCount: number;
  isActive: boolean;
  raw: Category;
  subcategories: TreeNode[];
}

export function buildTree(flat: Category[]): TreeNode[] {
  const byParent = new Map<string | null, Category[]>();
  for (const c of flat) {
    const key = (c.parent_id ?? null) as string | null;
    const arr = byParent.get(key) ?? [];
    arr.push(c);
    byParent.set(key, arr);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => {
      const ao = a.display_order ?? 0;
      const bo = b.display_order ?? 0;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    });
  }
  function build(parentId: string | null): TreeNode[] {
    const kids = byParent.get(parentId) ?? [];
    return kids.map((c) => ({
      id: c.id,
      name: c.name,
      partCount: c.part_count ?? 0,
      isActive: c.is_active,
      raw: c,
      subcategories: build(c.id),
    }));
  }
  return build(null);
}

export function collectAllIds(cats: TreeNode[]): string[] {
  const ids: string[] = [];
  const walk = (cat: TreeNode) => {
    ids.push(cat.id);
    cat.subcategories.forEach(walk);
  };
  cats.forEach(walk);
  return ids;
}

export function countDescendants(category: TreeNode): number {
  let total = category.subcategories.length;
  for (const sub of category.subcategories) {
    total += countDescendants(sub);
  }
  return total;
}
