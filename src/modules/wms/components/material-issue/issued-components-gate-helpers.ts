import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";

/** §0.9 why-tooltips: the first unmet gate per disabled stage button, null when met. */
export function stageBlockReasons(input: {
  hasAddVariant: boolean;
  duplicateSerial: boolean;
  canStageAdd: boolean;
  hasRemoveVariant: boolean;
  scrapNeedsReason?: boolean;
  canStageRemove: boolean;
}) {
  let add: string | null = null;
  if (!input.hasAddVariant) add = S.issuedComponents.stageAddNoPart;
  else if (input.duplicateSerial) add = S.issuedComponents.duplicateSerialError;
  else if (!input.canStageAdd) add = S.form.lines.serialRequired;
  let remove: string | null = null;
  if (!input.hasRemoveVariant) remove = S.issuedComponents.stageRemoveNoPart;
  else if (input.scrapNeedsReason) remove = S.issuedComponents.stageRemoveScrapNoReason;
  else if (!input.canStageRemove) remove = S.issuedComponents.stageRemoveNoLocation;
  return { add, remove };
}
