/** Character cap for plain-text cells on every rentals list built on
 *  BusinessMetricsTable (its opt-in `maxCellChars`). Longer values are cut
 *  with an ellipsis and shown in full in the cell's hover tooltip, so a long
 *  account or part name cannot stretch a column. Same mechanism as WMS's
 *  `WMS_LIST_MAX_CELL_CHARS`, a little wider because rentals rows carry
 *  customer names. */
export const RENTALS_LIST_MAX_CELL_CHARS = 25;