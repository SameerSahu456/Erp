import { useState } from "react";

import type { StockItemComponent, VariantListItem } from "@modules/ims";
import type { ScanOption } from "../../components/material-issue/ScanSelect";
import { variantPlainLabel } from "../../components/material-issue/variant-labels";
import type { PullOutDestination } from "../../components/material-issue/issued-components-panel-helpers";

/** "Not in the list" on the recorded-part picker. */
export const PULL_OUT_OTHER_PART = "__other__";

/** Label of a part recorded inside a unit: its name and serial. */
export function recordedPartLabel(c: StockItemComponent): string {
  return [c.part_name || c.description, c.internal_serial ?? c.manufacturer_serial]
    .filter(Boolean)
    .join(" · ");
}

/** The Pull-Out editor: source unit, recorded part or picked part, optional
 *  serial, where it goes next, destination, note. */
export function usePullOutForm() {
  const [source, setSourceRaw] = useState("");
  // A recorded contents row of the source, PULL_OUT_OTHER_PART, or "" (not chosen).
  const [recordedChoice, setRecordedChoice] = useState("");
  const [recorded, setRecorded] = useState<StockItemComponent | null>(null);
  const [destination, setDestination] = useState<PullOutDestination>("available");
  const [variant, setVariant] = useState<ScanOption | null>(null);
  const [serial, setSerial] = useState("");
  const [location, setLocation] = useState("");
  const [rackName, setRackName] = useState("");
  const [binName, setBinName] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const clearLocation = () => {
    setLocation("");
    setRackName("");
    setBinName(null);
  };
  const clear = () => {
    setVariant(null);
    setSerial("");
    setNote("");
    setRecordedChoice("");
    setRecorded(null);
    setDestination("available");
    clearLocation();
  };
  const setSource = (id: string) => {
    setSourceRaw(id);
    setRecordedChoice("");
    setRecorded(null);
  };
  const pickRecorded = (choice: string, component: StockItemComponent | null) => {
    setRecordedChoice(choice);
    setRecorded(component);
    setVariant(null);
    setSerial("");
  };
  const pickVariant = (item: VariantListItem) => {
    setVariant({ id: item.id, label: variantPlainLabel(item) });
    setSerial("");
  };
  const pickLocation = (p: { locationId: string; rackName: string; binName: string | null }) => {
    setLocation(p.locationId);
    setRackName(p.rackName);
    setBinName(p.binName);
  };
  return {
    source,
    recordedChoice,
    recorded,
    destination,
    setDestination,
    pickRecorded,
    variant,
    serial,
    location,
    rackName,
    binName,
    note,
    setSource,
    setSerial,
    setLocation,
    setNote,
    clear,
    clearLocation,
    pickVariant,
    pickLocation,
  };
}

