import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  addTransferUnits,
  createTransfer,
  flagTransferUnit,
  getTransfer,
  listTransferCandidates,
  listTransfers,
  markTransferUnitLost,
  placeTransferUnit,
  relocateStock,
  removeTransferUnit,
  returnTransferUnitToSource,
  sendTransfer,
  type TransferSend,
} from "../../api";
import { USE_STOCK_TRANSFER_STRINGS as S } from "./use-stock-transfer.strings";
import { imsKeys } from "@modules/ims";
import { PAGINATION } from "@shared/constants/pagination";
import { wmsKeys } from "../keys";
import { invalidateDevice } from "../devices/useDevices";

const K = wmsKeys.transfers;

const onError = (err: unknown) =>
  toast.error((err as { message?: string })?.message || S.errorFallback);

/** Everything a stock move touches: IMS counts (barrel keys), locations, transfers and moved units. */
function useInvalidateStock() {
  const qc = useQueryClient();
  return (stockItemIds: string[] = [], transferId?: string) => {
    void qc.invalidateQueries({ queryKey: imsKeys.stock });
    void qc.invalidateQueries({ queryKey: imsKeys.parts });
    void qc.invalidateQueries({ queryKey: imsKeys.variants });
    void qc.invalidateQueries({ queryKey: wmsKeys.warehouses.details() });
    void qc.invalidateQueries({ queryKey: wmsKeys.locations.details() });
    void qc.invalidateQueries({ queryKey: K.lists() });
    void qc.invalidateQueries({ queryKey: K.counts() });
    // Unit-level actions don't return the transfer id, so refresh all open transfer records.
    void qc.invalidateQueries({
      queryKey: transferId ? K.detail(transferId) : K.details(),
    });
    for (const id of stockItemIds) invalidateDevice(qc, id);
  };
}

// ── queries ──────────────────────────────────────────────────────────────────

export interface WarehouseTransfersParams {
  status?: string;
  overdue?: boolean;
  /** Navbar scope: transfers where ANY of these is the source OR destination. */
  warehouseIds?: string[];
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  dispatched_from?: string;
  dispatched_to?: string;
  expected_from?: string;
  expected_to?: string;
  q?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}

/** One transfer page; `warehouse_ids` only sent when scoped. Pass `page_size: 1` for tab counts. */
export function fetchWarehouseTransfers({
  warehouseIds,
  ...rest
}: WarehouseTransfersParams = {}) {
  return listTransfers({
    ...rest,
    warehouse_ids: warehouseIds?.length ? warehouseIds : undefined,
  });
}

/** Server-paginated transfer list: returns `{ items, total }` (§16.7). */
export function useWarehouseTransfers(
  params: WarehouseTransfersParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: K.list(params),
    queryFn: () => fetchWarehouseTransfers(params),
    // Counts + pagination must not flash to 0/empty mid-fetch (§1.1.H / §13).
    placeholderData: keepPreviousData,
    enabled: options?.enabled,
  });
}

export function useWarehouseTransfer(id: string | undefined) {
  return useQuery({
    queryKey: K.detail(id ?? ""),
    queryFn: () => getTransfer(id as string),
    enabled: Boolean(id),
  });
}

export function useTransferCandidates(id: string | undefined, search?: string) {
  return useQuery({
    queryKey: K.candidates(id ?? "", search ?? ""),
    queryFn: () =>
      listTransferCandidates(id as string, {
        search,
        page_size: PAGINATION.MAX_PAGE_SIZE,
      }),
    enabled: Boolean(id),
  });
}

// ── mutations ────────────────────────────────────────────────────────────────

export interface RelocateInput {
  locationId: string;
  locationLabel: string;
  stockItemIds: string[];
  notes?: string;
}

export function useStockTransferMutations() {
  const invalidate = useInvalidateStock();

  const relocate = useMutation({
    mutationFn: ({ locationId, stockItemIds, notes }: RelocateInput) =>
      relocateStock(locationId, {
        stock_item_ids: stockItemIds,
        notes: notes ?? null,
      }),
    onSuccess: (data, vars) => {
      toast.success(S.relocateSuccess(data.relocated, vars.locationLabel));
      invalidate(vars.stockItemIds);
    },
    onError,
  });

  /** Create -> add units -> send, as one operation from the caller's view. */
  const sendTransferFlow = useMutation({
    mutationFn: async (input: {
      fromWarehouseId: string;
      toWarehouseId: string;
      /** Display name for the success toast — never the raw id. */
      toWarehouseName: string;
      stockItemIds: string[];
      notes?: string;
      delivery: TransferSend;
    }) => {
      const transfer = await createTransfer({
        from_warehouse_id: input.fromWarehouseId,
        to_warehouse_id: input.toWarehouseId,
        notes: input.notes ?? null,
      });
      await addTransferUnits(transfer.id, input.stockItemIds);
      return sendTransfer(transfer.id, input.delivery);
    },
    onSuccess: (_data, vars) => {
      toast.success(
        S.transferSentSuccess(vars.stockItemIds.length, vars.toWarehouseName),
      );
    },
    // Three calls, not one transaction — refresh either way so lists show what really happened.
    onSettled: (_data, _error, vars) => invalidate(vars.stockItemIds),
    onError,
  });

  const placeUnit = useMutation({
    mutationFn: ({
      itemId,
      locationId,
    }: {
      itemId: string;
      locationId: string;
    }) => placeTransferUnit(itemId, locationId),
    onSuccess: (item) => {
      toast.success(S.unitPlaced);
      invalidate([item.stock_item_id]);
    },
    onError,
  });

  const flagUnit = useMutation({
    mutationFn: ({ itemId, reason }: { itemId: string; reason?: string }) =>
      flagTransferUnit(itemId, reason),
    onSuccess: (item) => {
      toast.success(S.unitFlagged);
      invalidate([item.stock_item_id]);
    },
    onError,
  });

  const markLost = useMutation({
    mutationFn: ({ itemId, reason }: { itemId: string; reason: string }) =>
      markTransferUnitLost(itemId, reason),
    onSuccess: (item) => {
      toast.success(S.unitLost);
      invalidate([item.stock_item_id]);
    },
    onError,
  });

  const returnToSource = useMutation({
    mutationFn: ({ itemId, reason }: { itemId: string; reason?: string }) =>
      returnTransferUnitToSource(itemId, reason),
    onSuccess: (item) => {
      toast.success(S.unitReturned);
      invalidate([item.stock_item_id]);
    },
    onError,
  });

  const removeUnit = useMutation({
    mutationFn: (itemId: string) => removeTransferUnit(itemId),
    onSuccess: () => {
      toast.success(S.unitRemoved);
      invalidate();
    },
    onError,
  });

  return {
    relocate: relocate.mutateAsync,
    sendTransfer: sendTransferFlow.mutateAsync,
    placeUnit: placeUnit.mutateAsync,
    flagUnit: flagUnit.mutateAsync,
    markLost: markLost.mutateAsync,
    returnToSource: returnToSource.mutateAsync,
    removeUnit: removeUnit.mutateAsync,
    isPending:
      relocate.isPending ||
      sendTransferFlow.isPending ||
      placeUnit.isPending ||
      flagUnit.isPending ||
      markLost.isPending ||
      returnToSource.isPending ||
      removeUnit.isPending,
  };
}
