// What to do with one replacement line, and where it is swapped — worded the
// same on every screen that shows a unit's request.
import {
  REPLACEMENT_IN_HOUSE_RETURN_LABEL,
  REPLACEMENT_SWAP_LOCATION_LABEL,
} from "../../constants/replacement-request-status";
import { REPLACEMENT_REQUESTS_STRINGS } from "./replacement-requests.strings";

const W = REPLACEMENT_REQUESTS_STRINGS.lineWording;

type LineShape = {
  target: string;
  replacement_decision: string;
  swap_location?: string | null;
  in_house_return?: string | null;
};

/** Replace (with what), repair, or let the engineer decide (spec D14, D15). */
export function lineActionText(line: LineShape, replacementName: string | null | undefined): string {
  switch (line.replacement_decision) {
    case "repair":
      return W.repair;
    case "to_be_decided":
      return W.engineerDecides;
    case "different_part":
      return replacementName ? W.replaceWith(replacementName) : W.replaceDifferent;
    default:
      return line.target === "component" ? W.replaceSame : W.replaceUnitSame;
  }
}

/** Where the swap happens and what was planned to come in (spec D10, D15). */
export function lineWhereText(line: LineShape): string {
  if (line.target !== "component") return W.wholeUnit;
  if (line.swap_location === "on_site") return REPLACEMENT_SWAP_LOCATION_LABEL.on_site;
  const comesIn = line.in_house_return as keyof typeof REPLACEMENT_IN_HOUSE_RETURN_LABEL | null | undefined;
  return comesIn && comesIn in REPLACEMENT_IN_HOUSE_RETURN_LABEL
    ? REPLACEMENT_IN_HOUSE_RETURN_LABEL[comesIn]
    : REPLACEMENT_SWAP_LOCATION_LABEL.in_house;
}
