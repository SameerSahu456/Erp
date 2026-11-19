import { useState } from "react";

import { BusinessMetricsTable, type CellFormatter } from "@/components/common/tables/BusinessMetricsTable";
import { EntityRef } from "@/components/common/display/EntityRef";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { TruncatedSerial } from "@/components/common/display/TruncatedSerial";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import { Typography } from "@/components/ui/typography";
import { useDebounce } from "@/shared/hooks";
import { EMPTY_VALUE, PAGINATION, UI } from "@/shared/constants";
import { toSortParam } from "@/shared/lib/sort-param";

import { CONDITION_LABELS, CONDITION_VARIANT } from "../../constants/condition";
import { useLocationContents } from "../../hooks/warehouses/useWarehouseLocations";
import { STOCK_STATUS } from "./locationModel";
import { LOCATIONS_STRINGS } from "./locations.strings";

const C = LOCATIONS_STRINGS.contents;

const COLUMNS = [
  { key: "part_name", label: C.columns.partName, sortable: true },
  { key: "variant_name", label: C.columns.variant, sortable: true },
  { key: "serial", label: C.columns.serial, sortable: true },
  { key: "condition", label: C.columns.condition },
  { key: "status", label: C.columns.status },
];

/** Table column key → backend `sort` field (server allow-list). */
const CONTENTS_SORT_FIELDS: Readonly<Record<string, string>> = {
  part_name: "part_name",
  variant_name: "variant_name",
  serial: "internal_serial",
};

type SortState = { column: string | null; direction: "asc" | "desc" | null };

const CONDITION_OPTIONS = Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label }));
const STATUS_OPTIONS = Object.entries(STOCK_STATUS).map(([value, { label }]) => ({ value, label }));

/** Part name and serial open the unit's device page. */
function partNameCell(value: unknown, stockItemId: string) {
  if (!value) return { display: EMPTY_VALUE };
  const name = String(value);
  return {
    display: (
      <EntityRef kind="device" id={stockItemId} value={name}>
        <TruncatedText value={name} />
      </EntityRef>
    ),
  };
}

function serialCell(serial: string, manufacturer: string | null, stockItemId: string) {
  return {
    display: (
      <div className="flex min-w-0 flex-col">
        <EntityRef kind="device" id={stockItemId} value={serial}>
          <TruncatedSerial value={serial} />
        </EntityRef>
        {manufacturer && (
          <Typography variant="caption" tone="muted" asChild>
            <span>
              {C.manufacturerSerial}
              <TruncatedSerial value={manufacturer} className="inline-block align-bottom" />
            </span>
          </Typography>
        )}
      </div>
    ),
  };
}

const formatCell: CellFormatter = (value, key, row) => {
  if (key === "part_name") return partNameCell(value, String(row.id));
  if (key === "variant_name") {
    return { display: <TruncatedText value={String(value ?? EMPTY_VALUE)} /> };
  }
  if (key === "serial") {
    return serialCell(String(value), row.manufacturer_serial as string | null, String(row.id));
  }
  if (key === "condition") {
    if (!value) return { display: EMPTY_VALUE };
    const condition = String(value);
    return {
      display: (
        <StatusBadge variant={CONDITION_VARIANT[condition] ?? "neutral"}>
          {CONDITION_LABELS[condition] ?? condition}
        </StatusBadge>
      ),
    };
  }
  if (key === "status") {
    const status = String(value);
    const known = STOCK_STATUS[status];
    return {
      display: (
        <StatusBadge variant={known?.variant ?? "neutral"}>{known?.label ?? status}</StatusBadge>
      ),
    };
  }
  return null;
};

interface LocationContentsPanelProps {
  locationId: string;
  name: string;
}

/** The stock at one rack or bin, opened in place beneath its row. */
export function LocationContentsPanel({ locationId, name }: LocationContentsPanelProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<SortState>({ column: "serial", direction: "asc" });
  const [filters, setFilters] = useState({ condition: "", status: "" });
  const debouncedSearch = useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS);
  const contentsQ = useLocationContents(locationId, {
    page,
    page_size: pageSize,
    search: debouncedSearch || undefined,
    sort: toSortParam(sort.column, sort.direction, CONTENTS_SORT_FIELDS),
    condition: filters.condition || undefined,
    status: filters.status || undefined,
  });
  const total = contentsQ.data?.total ?? 0;
  const rows = (contentsQ.data?.items ?? []).map((item) => ({
    ...item,
    id: item.stock_item_id,
    serial: item.internal_serial,
  }));

  const changeSearch = (next: string) => {
    setSearch(next);
    setPage(1);
  };
  const clearFilters = () => {
    changeSearch("");
    setFilters({ condition: "", status: "" });
  };

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <header className="flex items-center gap-2">
        <Typography variant="card-title" truncate asChild>
          <span>{name}</span>
        </Typography>
        <Typography variant="caption" tone="muted" numeric asChild>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5">{total}</span>
        </Typography>
      </header>
      <div>
        <BusinessMetricsTable
          tabs={[{ id: "contents", label: name, columns: COLUMNS, data: rows }]}
          cellFormatter={formatCell}
          showIndex={false}
          filterSize="default"
          searchValue={search}
          onSearchChange={changeSearch}
          searchPlaceholder={C.searchPlaceholder}
          toolbarFilters={[
            {
              key: "condition",
              label: C.filters.conditionLabel,
              allLabel: C.filters.conditionAll,
              value: filters.condition,
              options: CONDITION_OPTIONS,
            },
            {
              key: "status",
              label: C.filters.statusLabel,
              allLabel: C.filters.statusAll,
              value: filters.status,
              options: STATUS_OPTIONS,
            },
          ]}
          onToolbarFilterChange={(key, value) => {
            setFilters((current) => ({ ...current, [key]: value }));
            setPage(1);
          }}
          externalFiltersActive={!!debouncedSearch || !!filters.condition || !!filters.status}
          onClearFilters={clearFilters}
          serverPagination={{
            page,
            pageSize,
            total,
            isFetching: contentsQ.isFetching,
            onPageChange: setPage,
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPage(1);
            },
            sort,
            onSortChange: (column, direction) => {
              setSort({ column, direction });
              setPage(1);
            },
          }}
          emptyState={{ title: C.emptyTitle, description: C.emptyDescription }}
          error={
            contentsQ.isError
              ? {
                  title: C.errorTitle,
                  description: C.errorDescription,
                  onRetry: () => void contentsQ.refetch(),
                }
              : undefined
          }
        />
      </div>
    </section>
  );
}
