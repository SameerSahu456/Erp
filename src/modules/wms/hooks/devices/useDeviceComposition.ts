/** Record / pull a device's components (D1). Writes also refresh IMS stock: components are real units. */
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { imsKeys } from "@modules/ims";

import {
  addStockItemComponents,
  pullStockItemComponent,
  type SiComponentAddItem,
  type SiComponentsActionPull,
} from "../../api";
import { COMPONENTS_CARD_STRINGS } from "../../components/devices/device-detail/components-card.strings";
import { errMsg } from "../../errorMessage";
import { wmsKeys } from "../keys";
import { invalidateDevice } from "./useDevices";

/** The parent dossier + device worklists/counts (targeted, §16.9 — not the
 *  whole devices tree) and the IMS stock counts. */
export function invalidateComponentSurfaces(qc: QueryClient, stockItemId: string) {
  invalidateDevice(qc, stockItemId);
  void qc.invalidateQueries({ queryKey: wmsKeys.devices.counts() });
  void qc.invalidateQueries({ queryKey: imsKeys.stock });
}

export function useAddStockItemComponents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      stockItemId,
      components,
    }: {
      stockItemId: string;
      components: SiComponentAddItem[];
    }) => addStockItemComponents(stockItemId, components),
    onSuccess: (_o, { stockItemId, components }) => {
      invalidateComponentSurfaces(qc, stockItemId);
      const units = components.reduce((n, c) => n + (c.quantity ?? 1), 0);
      toast.success(COMPONENTS_CARD_STRINGS.toast.added(units));
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}

export function usePullStockItemComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      stockItemId,
      body,
    }: {
      stockItemId: string;
      body: Omit<SiComponentsActionPull, "action">;
    }) => pullStockItemComponent(stockItemId, body),
    onSuccess: (_o, { stockItemId }) => {
      invalidateComponentSurfaces(qc, stockItemId);
      toast.success(COMPONENTS_CARD_STRINGS.toast.pulled);
    },
    onError: (e: Error) => toast.error(errMsg(e)),
  });
}
