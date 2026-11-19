import type { POExpectedLine } from "../../../api";
import { DEVICE_IDENTITY_STRINGS as S } from "./device-identity.strings";

/** Display label for a PO line — never its raw id (PAGE-UI §7.2). */
export const relinkLineLabel = (l: POExpectedLine) =>
  l.part_variant_id
    ? `${l.part_number ?? ""} · ${l.part_name ?? l.variant_name ?? ""}`.trim()
    : `${S.relink.descriptionOnlyLabel} — ${l.description ?? ""}`.trim();
