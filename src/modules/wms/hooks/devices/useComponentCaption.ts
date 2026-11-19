import { useMemo } from "react";

import { formatIST } from "@shared/lib/date";
import { usePermission } from "@shared/rbac";
import type { StockItemComponent } from "@modules/ims";
import { useUsersByIds } from "@modules/users";

import { COMPONENTS_CARD_STRINGS as S } from "../../components/devices/device-detail/components-card.strings";

// Ways in / out worth naming on the row, by the row's source / removal event.
const ADDED_HOW: Record<string, string> = {
  dispatch_component_add: S.row.addedDuringIssue,
};
const REMOVED_HOW: Record<string, string> = {
  returned_for_repair: S.row.sentForRepair,
  replaced_on_site: S.row.replacedOnSite,
  material_issue_pullout: S.row.removedDuringIssue,
};

/** "Added by … · when" / "Removed by … · when" for a device's components.
 *
 *  GET /users/{id} needs `auth:users:read`, which only admins hold, so the
 *  name lookup is skipped when the viewer cannot make it — the name only ever
 *  renders as detail. */
export function useComponentCaption(components: StockItemComponent[]) {
  const { can } = usePermission();
  const canReadUsers = can("auth:users:read");
  const actorIds = useMemo(
    () =>
      Array.from(
        new Set(
          components
            .flatMap((c) => [c.associated_by, c.removed_by])
            .filter((v): v is string => !!v),
        ),
      ),
    [components],
  );
  const { displayNameById } = useUsersByIds(canReadUsers ? actorIds : []);

  return (c: StockItemComponent, isRemoved: boolean): string => {
    const who = (id?: string | null) => (id && displayNameById[id]) || "";
    const when = (ts?: string | null) => (ts ? formatIST(ts) : "");
    const how = isRemoved ? REMOVED_HOW[c.removed_event_type ?? ""] : ADDED_HOW[c.source_event_type];
    const base = isRemoved
      ? S.row.removedBy(who(c.removed_by), when(c.removed_at))
      : S.row.addedBy(who(c.associated_by), when(c.associated_at));
    return how ? `${how} · ${base}` : base;
  };
}
