'use client';

import * as React from 'react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpDownIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Columns3Icon,
  FilterIcon,
  RotateCcwIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react';

import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_arrHas,
  filterFn_includesString,
  FlexRender,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type Row,
  type RowData,
  type SortingState,
  type Updater,
} from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from 'cn';

/**
 * Tabla de datos sobre TanStack Table v9 (data-table oficial de shadcn).
 *
 * El componente es la pieza reutilizable del proyecto: resuelve el marco
 * (orden por cabecera, paginación, filtros por columna, búsqueda y columnas
 * ocultables) y deja a cada vista el contenido de las celdas.
 *
 * Decisiones de diseño:
 * - El orden es **por columna** (`aria-sort` en el `TableHead`); no existe un
 *   selector de orden paralelo que pueda contradecirlo.
 * - Los filtros son filtros de columna de verdad: el valor vive en el estado
 *   `columnFilters` de TanStack y la vista pinta su propio `filterFn`.
 * - La búsqueda es filtro global de TanStack sobre el texto que cada vista
 *   declara para su fila (`searchText`).
 */

/** Metadata opcional por columna: alineación y clases adicionales. */
export interface DataTableColumnMeta {
  /** Alineación del encabezado y de las celdas de la columna. */
  align?: 'left' | 'right';
  /** Clases adicionales aplicadas al encabezado y a las celdas. */
  className?: string;
}

/**
 * Conjunto de features de TanStack usado por todas las tablas del proyecto.
 *
 * Sólo se registran las features que el proyecto usa: lo que no se declara se
 * elimina del bundle.
 */
export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { arrHas: filterFn_arrHas, includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric, datetime: sortFn_datetime, text: sortFn_text },
  columnMeta: {} as DataTableColumnMeta,
});

export type DataTableFeatures = typeof dataTableFeatures;

/** Definición de columna aceptada por {@link DataTable}. */
export type DataTableColumn<TData extends RowData> = ColumnDef<DataTableFeatures, TData, unknown>;

/**
 * Helper de columnas ligado al conjunto de features del proyecto.
 *
 * ```tsx
 * const columns = createDataTableColumns<IncidentRow>().columns([...]);
 * ```
 */
export function createDataTableColumns<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>();
}

/** Valor offered by a toolbar filter. */
export interface DataTableFilterOption {
  value: string;
  label: string;
}

/** Toolbar filter bound to a column id. */
export interface DataTableFilter {
  /** Column the filter is applied to. */
  columnId: string;
  /** Label shown on the toolbar button. */
  label: string;
  /** Values offered by the filter. */
  options: readonly DataTableFilterOption[];
}

export interface DataTableProps<TData extends RowData> {
  /** Rows to render. */
  data: readonly TData[];
  /** Column definitions. */
  columns: ReadonlyArray<DataTableColumn<TData>>;
  /** Stable identity per row; defaults to the row index. */
  getRowId?: (row: TData, index: number) => string;
  /** Text the free-text search runs against. */
  searchText?: (row: TData) => string;
  /** Placeholder of the search input. */
  searchPlaceholder?: string;
  /** Column filters rendered in the toolbar. */
  filters?: readonly DataTableFilter[];
  /**
   * Column filter values owned by the parent view, by column id.
   *
   * When present the table stops owning those filters: a view that renders its
   * own controls (a `Select`, for instance) keeps the canonical state and the
   * table only reflects it.
   */
  filterValues?: Readonly<Record<string, readonly string[]>>;
  /** Called whenever a column filter changes. */
  onFilterValuesChange?: (values: Record<string, readonly string[]>) => void;
  /** Sort applied on the first render. */
  initialSorting?: SortingState;
  /** Columns hidden on the first render. */
  initialVisibility?: ColumnVisibilityState;
  /** Rows per page. */
  pageSize?: number;
  /** Noun used by the "N de M" badge, e.g. "cámaras". */
  noun?: string;
  /** Denominator of the "N de M" badge; defaults to the row count. */
  totalCount?: number;
  /** Filters applied outside the table, counted in the "filtros activos" badge. */
  extraActiveFilters?: number;
  /** Extra nodes rendered at the end of the toolbar. */
  toolbarExtra?: React.ReactNode;
  /** Extra class per row. */
  getRowClassName?: (row: Row<DataTableFeatures, TData>) => string | undefined;
  /** Marks a row as selected even when TanStack selection is not involved. */
  isRowSelected?: (row: TData) => boolean;
  /** Message shown when no row matches the current filters. */
  emptyMessage?: string;
  className?: string;
}

const PAGE_SIZES = [10, 20, 30, 50] as const;

export function DataTable<TData extends RowData>({
  data,
  columns,
  getRowId,
  searchText,
  searchPlaceholder = 'Buscar…',
  filters = [],
  filterValues,
  onFilterValuesChange,
  initialSorting = [],
  initialVisibility = {},
  pageSize = 10,
  noun = 'filas',
  totalCount,
  extraActiveFilters = 0,
  toolbarExtra,
  getRowClassName,
  isRowSelected,
  emptyMessage = 'No hay resultados para los filtros aplicados.',
  className,
}: DataTableProps<TData>) {
  const [search, setSearch] = React.useState('');
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>(initialVisibility);
  const [internalColumnFilters, setInternalColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState<Record<string, true>>({});
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize });

  // The effective filters come from the parent view when it owns them.
  const columnFilters = React.useMemo<ColumnFiltersState>(() => {
    if (!filterValues) return internalColumnFilters;
    return Object.entries(filterValues)
      .filter(([, values]) => values.length > 0)
      .map(([id, values]) => ({ id, value: [...values] }));
  }, [filterValues, internalColumnFilters]);

  function handleColumnFiltersChange(updater: Updater<ColumnFiltersState>): void {
    const next = typeof updater === 'function' ? updater(columnFilters) : updater;
    setInternalColumnFilters(next);
    onFilterValuesChange?.(toFilterValues(next));
  }

  // The search text is read through a ref so the filter function identity can
  // stay stable between renders.
  const searchTextRef = React.useRef(searchText);
  searchTextRef.current = searchText;

  const table = useTable<DataTableFeatures, TData>({
    features: dataTableFeatures,
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      rowSelection,
      pagination,
      globalFilter: search,
    },
    getRowId: getRowId ?? ((_row, index) => String(index)),
    enableRowSelection: true,
    globalFilterFn: (row, _columnId, filterValue) => {
      const text = searchTextRef.current?.(row.original);
      if (text === undefined) return true;
      const needle = String(filterValue ?? '')
        .trim()
        .toLowerCase();
      if (needle.length === 0) return true;
      return text.toLowerCase().includes(needle);
    },
    getColumnCanGlobalFilter: () => true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setSearch,
  });

  const filteredCount = table.getFilteredRowModel().rows.length;
  const activeFilters = columnFilters.filter((filter) => {
    const value = filter.value;
    return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== '';
  }).length;
  const activeFilterCount = activeFilters + extraActiveFilters + (search.trim().length > 0 ? 1 : 0);

  function toggleFilterValue(columnId: string, value: string): void {
    const current = columnFilters.find((filter) => filter.id === columnId)?.value;
    const selected = Array.isArray(current) ? (current as string[]) : [];
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    table.getColumn(columnId)?.setFilterValue(next);
  }

  function clearColumnFilter(columnId: string): void {
    table.getColumn(columnId)?.setFilterValue([]);
  }

  function clearAll(): void {
    setSearch('');
    setInternalColumnFilters([]);
    onFilterValuesChange?.({});
  }

  const pageCount = Math.max(1, table.getPageCount());

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-[220px] pr-7 pl-8"
          />
          {search.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="absolute top-1/2 right-0.5 -translate-y-1/2 text-muted-foreground"
              onClick={() => setSearch('')}
              aria-label="Limpiar búsqueda"
            >
              <XIcon />
            </Button>
          ) : null}
        </div>

        {filters.map((filter) => (
          <DataTableFilterButton
            key={filter.columnId}
            filter={filter}
            selected={selectedFilterValues(columnFilters, filter.columnId)}
            onToggle={(value) => toggleFilterValue(filter.columnId, value)}
            onClear={() => clearColumnFilter(filter.columnId)}
          />
        ))}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearAll}
          disabled={activeFilterCount === 0}
        >
          <RotateCcwIcon />
          Limpiar
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {toolbarExtra}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <Columns3Icon className="size-3.5" />
                Columnas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Columnas visibles</DropdownMenuLabel>
              {table
                .getAllLeafColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {columnLabel(column)}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
          <FilterIcon className="size-3" />
          {filteredCount} de {totalCount ?? data.length} {noun}
        </Badge>
        {activeFilterCount > 0 ? (
          <Badge variant="outline" className="border-info/40 bg-info/10 text-info">
            {activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''} activo
            {activeFilterCount > 1 ? 's' : ''}
          </Badge>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const column = header.column;
                  const meta = column.columnDef.meta;
                  const sorted = column.getIsSorted();
                  const canSort = column.getCanSort();
                  const toggle = column.getToggleSortingHandler();

                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      aria-sort={
                        canSort
                          ? sorted === 'asc'
                            ? 'ascending'
                            : sorted === 'desc'
                              ? 'descending'
                              : 'none'
                          : undefined
                      }
                      className={cn(meta?.align === 'right' && 'text-right', meta?.className)}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={toggle}
                          className="group -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          <FlexRender header={header} />
                          {sorted === 'asc' ? (
                            <ArrowUpIcon className="size-3 shrink-0 text-foreground" />
                          ) : sorted === 'desc' ? (
                            <ArrowDownIcon className="size-3 shrink-0 text-foreground" />
                          ) : (
                            <ArrowUpDownIcon className="size-3 shrink-0 opacity-40" />
                          )}
                        </button>
                      ) : (
                        <FlexRender header={header} />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => {
                const selected = row.getIsSelected() || isRowSelected?.(row.original) === true;
                return (
                  <TableRow
                    key={row.id}
                    data-state={selected ? 'selected' : undefined}
                    className={getRowClassName?.(row)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          cell.column.columnDef.meta?.align === 'right' && 'text-right',
                          cell.column.columnDef.meta?.className,
                        )}
                      >
                        <FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
            Filas por página
          </span>
          <Select
            value={`${pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger size="sm" className="w-20" aria-label="Filas por página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs text-muted-foreground tabular-nums">
          Página {pagination.pageIndex + 1} de {pageCount}
        </p>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="Primera página"
          >
            <ChevronsLeftIcon />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Página anterior"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Página siguiente"
          >
            <ChevronRightIcon />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Última página"
          >
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Columna de selección de fila.
 *
 * Se antepone a las columnas de la vista cuando la tabla necesita selección
 * real (la fila marcada recibe `data-state="selected"`).
 */
export function createSelectionColumn<TData extends RowData>(): DataTableColumn<TData> {
  return {
    id: 'select',
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todo"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleccionar fila"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  } as DataTableColumn<TData>;
}

function DataTableFilterButton({
  filter,
  selected,
  onToggle,
  onClear,
}: {
  filter: DataTableFilter;
  selected: readonly string[];
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('gap-1.5', selected.length > 0 && 'text-foreground')}
        >
          <FilterIcon className="size-3.5" />
          {filter.label}
          {selected.length > 0 ? (
            <Badge variant="secondary" className="h-4 px-1 text-[10px] tabular-nums">
              {selected.length}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder={`Buscar ${filter.label.toLowerCase()}`} />
          <CommandList>
            <CommandEmpty>Sin coincidencias.</CommandEmpty>
            <CommandGroup>
              {filter.options.map((option) => {
                const active = selected.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.value}`}
                    onSelect={() => onToggle(option.value)}
                  >
                    <CheckIcon
                      className={cn('size-3.5 shrink-0', active ? 'opacity-100' : 'opacity-0')}
                      aria-hidden="true"
                    />
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        {selected.length > 0 ? (
          <div className="border-t border-border p-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={onClear}
            >
              <XIcon />
              Quitar filtro
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function selectedFilterValues(columnFilters: ColumnFiltersState, columnId: string): string[] {
  const value = columnFilters.find((filter) => filter.id === columnId)?.value;
  return Array.isArray(value) ? (value as string[]) : [];
}

function toFilterValues(columnFilters: ColumnFiltersState): Record<string, readonly string[]> {
  const values: Record<string, readonly string[]> = {};
  for (const filter of columnFilters) {
    if (Array.isArray(filter.value) && filter.value.length > 0) {
      values[filter.id] = filter.value as string[];
    }
  }
  return values;
}

function columnLabel<TData extends RowData>(
  column: Column<DataTableFeatures, TData, unknown>,
): string {
  const header = column.columnDef.header;
  return typeof header === 'string' ? header : column.id;
}
