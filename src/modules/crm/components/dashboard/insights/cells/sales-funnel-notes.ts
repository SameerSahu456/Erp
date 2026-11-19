import type { SalesFunnelParams } from "../../../../api/dashboard";
import { INSIGHTS_STRINGS } from "../insights.strings";

const S = INSIGHTS_STRINGS.salesFunnel;

/** The footnote for the one facet that does NOT reach every row: Condition, on
 *  Leads and Deals (they carry no condition column). Category and OEM narrow every
 *  row, and Quotes / Demo Requests follow Condition too, so nothing else needs one.
 *  Derived from `params` rather than taken as a prop so both call sites get it for
 *  free and neither can forget to pass it. */
export const productFacetNotes = (p: SalesFunnelParams): string[] =>
  (p.conditions?.length ?? 0) > 0 ? [S.productFacetNotes.condition] : [];
