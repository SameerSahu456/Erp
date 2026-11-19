// Channel-tag allow-list — mirrors backend `ROLE_CHANNEL_TAGS` /
// `LEAD_CHANNEL_TYPES` in `app/modules/crm/enums.py`. Used by:
//
//   • The Channel Tags multi-select on the Role admin form (create + edit).
//   • Any future list-view badge renderer.
//
// If the backend allow-list changes, update this constant and regenerate
// the API types — the backend will raise `INVALID_CHANNEL_TAG` (422) on
// any value not in its own list, so silent drift surfaces as a save
// failure rather than a silent miss.
//
// See `comprint-erp-docs/modules/foundation/roles/spec-v2-channel-tags-fe.md`.

export const CHANNEL_TAG_OPTIONS = [
  'End Customer',
  'Channel Partner',
  'Cloud / Data Center',
  'End User',
] as const

export type ChannelTag = (typeof CHANNEL_TAG_OPTIONS)[number]

// Channel type → the role channel tags whose users may be Assigned To / Owner
// of a record of that type. A Channel Partner record may also go to an End User
// user, so picking Channel Partner lists both pools. Types not listed here map
// to themselves. Drives the user pickers (`?channel_tags=`) AND the save-time
// "does not deal in" checks, so the two can never disagree.
const ASSIGNABLE_TAGS_BY_TYPE: Partial<Record<ChannelTag, readonly ChannelTag[]>> = {
  'Channel Partner': ['Channel Partner', 'End User'],
}

/** Channel tags to scope a user picker by for a record of `type`. */
export function assignableChannelTags(type: string): string[] {
  return [...(ASSIGNABLE_TAGS_BY_TYPE[type as ChannelTag] ?? [type])]
}

/**
 * True when a user with role `channelTags` may own / be assigned a record of
 * `type`. `null` / `undefined` tags (superuser, role with empty tags) do not
 * explicitly deal in any channel → false; callers exempt admins separately.
 */
export function dealsInChannel(
  channelTags: readonly string[] | null | undefined,
  type: string,
): boolean {
  if (channelTags == null) return false
  return assignableChannelTags(type).some((t) => channelTags.includes(t))
}
