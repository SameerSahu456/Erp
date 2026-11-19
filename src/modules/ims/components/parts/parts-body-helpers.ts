// Backend stores condition as snake_case (`new`, `refurbished`, `new_pull`)
// but the demo's column vocabulary uses title-case strings. Map at row
// assembly so the cellFormatter's badge logic (`'New'`, `'Refurbished'`,
// `'New Pull'`) keeps working unchanged.
export const CONDITION_DISPLAY: Record<string, string> = {
  new: "New",
  refurbished: "Refurbished",
  new_pull: "New Pull",
};

export function conditionVariant(c: string): "success" | "info" | "warning" | "neutral" {
  if (c === "New") return "success";
  if (c === "Refurbished") return "info";
  if (c === "New Pull") return "warning";
  return "neutral";
}
