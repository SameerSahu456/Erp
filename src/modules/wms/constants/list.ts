import { PAGINATION } from "@/shared/constants";

// §16.6: the single page size for every WMS list.
export const WMS_PAGE_SIZE: number = PAGINATION.DEFAULT_PAGE_SIZE;

// Character cap for plain-text cells on WMS lists (full text in the tooltip).
export const WMS_LIST_MAX_CELL_CHARS = 20;

/** Default fetch size for pickers / scan flows; list tables use WMS_PAGE_SIZE. */
export const DEFAULT_FETCH_LIMIT: number = PAGINATION.PICKER_FETCH_SIZE;

/** Backend max length of the device-list `search` param — a longer paste is
 *  capped client-side so it never 422s the list (§11.1). */
export const DEVICE_SEARCH_MAX_CHARS = 255;

/** Backend max length of the inward-list `q` param (maxLength 50). */
export const INWARD_SEARCH_MAX_CHARS = 50;
