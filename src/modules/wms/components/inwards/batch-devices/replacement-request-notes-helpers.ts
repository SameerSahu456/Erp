// GRN page's replacement-request card: one line's subject, action and place.
import type { ReplacementRequestItemWire } from "@modules/crm";

import { partLabel } from "../../replacement-requests/replacement-request-detail-helpers";
import {
  lineActionText,
  lineWhereText,
} from "../../replacement-requests/replacement-line-wording";
import { REPLACEMENT_REQUESTS_STRINGS } from "../../replacement-requests/replacement-requests.strings";

/** The faulty part (or unit) this line is about. */
export const lineSubject = (item: ReplacementRequestItemWire): string =>
  partLabel(item.original_part_name, item.original_variant_name) ||
  item.component_description ||
  REPLACEMENT_REQUESTS_STRINGS.lineWording.unknownPart;

/** What to do with it: replace (with what), repair, or let the engineer decide. */
export const lineAction = (item: ReplacementRequestItemWire): string =>
  lineActionText(item, partLabel(item.replacement_part_name, item.replacement_variant_name));

/** Where the swap happens and what was planned to come in. */
export const lineWhere = (item: ReplacementRequestItemWire): string => lineWhereText(item);

/** Lines still in play: a rejected line or one closed as not needed says nothing
 *  about the unit on this GRN. */
export const isLiveLine = (item: ReplacementRequestItemWire): boolean =>
  item.approval_status !== "rejected" && item.dispatch_status !== "not_needed";
