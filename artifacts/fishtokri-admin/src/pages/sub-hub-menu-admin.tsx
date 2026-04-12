import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "wouter";
import {
  ArrowLeft, Plus, Edit2, Trash2, Search, X, Package, Tag, Ticket,
  RefreshCw, Database, AlertCircle, CheckCircle, XCircle, Image,
  LayoutList, MapPin, ShoppingBag, ChevronDown, ChevronUp, GripVertical,
  LayoutGrid, List, SlidersHorizontal, ArrowUpDown, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

function getToken() {
  return localStorage.getItem("fishtokri_token") ?? "";
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

type Tab = "products" | "categories" | "combos" | "coupons" | "carousels" | "sections" | "pincodes" | "timeslots";
type Layout = "list" | "grid";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "products", label: "Products", icon: Package },
  { key: "categories", label: "Categories", icon: Tag },
  { key: "combos", label: "Combos", icon: ShoppingBag },
  { key: "coupons", label: "Coupons", icon: Ticket },
  { key: "carousels", label: "Banners", icon: Image },
  { key: "sections", label: "Sections", icon: LayoutList },
  { key: "pincodes", label: "Pincodes", icon: MapPin },
  { key: "timeslots", label: "Time Slots", icon: Clock },
];

// ─── SHARED TOOLBAR ───────────────────────────────────────────────────────────
interface SortOption { value: string; label: string }
interface FilterGroup { key: string; label: string; options: { value: string; label: string }[] }

function TabToolbar({
  search, onSearch,
  sortOptions, sortValue, onSortChange,
  filterGroups = [], filterValues = {}, onFilterChange,
  layout, onLayout,
  addLabel, onAdd,
  resultCount, totalCount,
}: {
  search: string; onSearch: (v: string) => void;
  sortOptions: SortOption[]; sortValue: string; onSortChange: (v: string) => void;
  filterGroups?: FilterGroup[]; filterValues?: Record<string, string>; onFilterChange?: (key: string, v: string) => void;
  layout: Layout; onLayout: (v: Layout) => void;
  addLabel: string; onAdd: () => void;
  resultCount: number; totalCount: number;
}) {
  const activeFilters = filterGroups.filter((g) => filterValues[g.key] && filterValues[g.key] !== "all");
  const currentSort = sortOptions.find((s) => s.value === sortValue);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
          {search && (
            <button onClick={() => onSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 px-3 text-sm gap-1.5 font-medium text-gray-600">
              <ArrowUpDown className="w-3.5 h-3.5" />
              {currentSort?.label ?? "Sort"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-xs text-gray-500">Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sortOptions.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => onSortChange(opt.value)}
                className={`text-sm cursor-pointer ${sortValue === opt.value ? "font-semibold text-[#1A56DB]" : ""}`}
              >
                {sortValue === opt.value && <CheckCircle className="w-3.5 h-3.5 mr-2 text-[#1A56DB]" />}
                {sortValue !== opt.value && <span className="w-3.5 h-3.5 mr-2 inline-block" />}
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filters */}
        {filterGroups.length > 0 && onFilterChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={`h-9 px-3 text-sm gap-1.5 font-medium ${activeFilters.length > 0 ? "border-[#1A56DB] text-[#1A56DB] bg-blue-50" : "text-gray-600"}`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter
                {activeFilters.length > 0 && (
                  <span className="ml-0.5 bg-[#1A56DB] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {activeFilters.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {filterGroups.map((group, gi) => (
                <div key={group.key}>
                  {gi > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuLabel className="text-xs text-gray-500">{group.label}</DropdownMenuLabel>
                  {group.options.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => onFilterChange(group.key, opt.value)}
                      className={`text-sm cursor-pointer ${filterValues[group.key] === opt.value ? "font-semibold text-[#1A56DB]" : ""}`}
                    >
                      {filterValues[group.key] === opt.value
                        ? <CheckCircle className="w-3.5 h-3.5 mr-2 text-[#1A56DB]" />
                        : <span className="w-3.5 h-3.5 mr-2 inline-block" />}
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </div>
              ))}
              {activeFilters.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => filterGroups.forEach((g) => onFilterChange(g.key, "all"))}
                    className="text-xs text-red-500 cursor-pointer font-medium"
                  >
                    <X className="w-3 h-3 mr-2" /> Clear all filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Layout toggle */}
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden ml-auto">
          <button
            onClick={() => onLayout("list")}
            className={`w-9 h-9 flex items-center justify-center transition-colors ${layout === "list" ? "bg-[#1A56DB] text-white" : "text-gray-400 hover:bg-gray-50"}`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => onLayout("grid")}
            className={`w-9 h-9 flex items-center justify-center transition-colors border-l border-gray-200 ${layout === "grid" ? "bg-[#1A56DB] text-white" : "text-gray-400 hover:bg-gray-50"}`}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>

        {/* Add button */}
        <Button onClick={onAdd} className="bg-[#1A56DB] hover:bg-[#1447B4] text-white h-9 px-4 text-sm font-semibold">
          <Plus className="w-4 h-4 mr-1.5" /> {addLabel}
        </Button>
      </div>

      {/* Active filter chips + result count */}
      {(activeFilters.length > 0 || search || resultCount !== totalCount) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400">
            {resultCount === totalCount ? `${totalCount} items` : `${resultCount} of ${totalCount}`}
          </span>
          {activeFilters.map((g) => {
            const opt = g.options.find((o) => o.value === filterValues[g.key]);
            return (
              <span key={g.key} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-[#1A56DB] border border-blue-100 px-2 py-0.5 rounded-full font-medium">
                {g.label}: {opt?.label}
                <button onClick={() => onFilterChange!(g.key, "all")} className="hover:text-red-500 ml-0.5"><X className="w-2.5 h-2.5" /></button>
              </span>
            );
          })}
          {search && (
            <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full font-medium">
              "{search}"
              <button onClick={() => onSearch("")} className="hover:text-red-500 ml-0.5"><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function StatusBadge({ active }: { active: boolean }) {
  return active
    ? <span className="inline-flex items-center gap-1 text-[10px] text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded-full"><CheckCircle className="w-2.5 h-2.5" /> Active</span>
    : <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 font-semibold bg-gray-100 px-1.5 py-0.5 rounded-full"><XCircle className="w-2.5 h-2.5" /> Inactive</span>;
}

function ActionButtons({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={onEdit} className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-[#1A56DB] hover:border-blue-200 hover:bg-blue-50 transition-colors">
        <Edit2 className="w-3 h-3" />
      </button>
      <button onClick={onDelete} className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors">
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

function DeleteDialog({ open, onCancel, onConfirm, title, description }: { open: boolean; onCancel: () => void; onConfirm: () => void; title: string; description: string }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ icon: Icon, message, sub }: { icon: any; message: string; sub?: string }) {
  return (
    <div className="py-16 text-center">
      <Icon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
      <p className="text-gray-400 font-medium">{message}</p>
      {sub && <p className="text-gray-300 text-sm mt-1">{sub}</p>}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function SubHubMenuAdmin() {
  const params = useParams<{ id: string }>();
  const subHubId = params.id;
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("products");
  const [stats, setStats] = useState<any>(null);
  const [subHubName, setSubHubName] = useState("");
  const [dbName, setDbName] = useState("");
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState("");

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError("");
    try {
      const data = await apiFetch(`/api/sub-hubs/${subHubId}/menu/stats`);
      setStats(data.stats);
      setDbName(data.stats.dbName ?? "");
    } catch (err: any) {
      setStatsError(err.message);
    } finally {
      setLoadingStats(false);
    }
  }, [subHubId]);

  useEffect(() => {
    apiFetch("/api/sub-hubs").then((d) => {
      const sub = d.subHubs?.find((s: any) => s.id === subHubId);
      if (sub) { setSubHubName(sub.name); setDbName(sub.dbName); }
    }).catch(() => {});
    loadStats();
  }, [subHubId, loadStats]);

  const statCards = [
    { label: "Products", value: stats?.products ?? 0, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Categories", value: stats?.categories ?? 0, icon: Tag, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Combos", value: stats?.combos ?? 0, icon: ShoppingBag, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Coupons", value: stats?.coupons ?? 0, icon: Ticket, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Banners", value: stats?.carousels ?? 0, icon: Image, color: "text-pink-600", bg: "bg-pink-50" },
    { label: "Sections", value: stats?.sections ?? 0, icon: LayoutList, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "Pincodes", value: stats?.pincodes ?? 0, icon: MapPin, color: "text-green-600", bg: "bg-green-50" },
    { label: "Time Slots", value: stats?.timeslots ?? 0, icon: Clock, color: "text-cyan-600", bg: "bg-cyan-50" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <button
          onClick={() => history.back()}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-[#162B4D] transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-[#162B4D]">{subHubName || "Thane"} — Digital Menu</h2>
          {dbName && (
            <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
              <Database className="w-3 h-3" />
              Database: <span className="font-mono">{dbName}</span>
            </p>
          )}
        </div>
        <button onClick={loadStats} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-[#162B4D] transition-colors" title="Refresh stats">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {statsError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-semibold text-sm">Cannot connect to this sub hub's database</p>
            <p className="text-red-600 text-xs mt-1">{statsError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
        {loadingStats
          ? [1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          : statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <button
              key={label}
              onClick={() => setTab(TABS.find((t) => t.label === label)?.key ?? tab)}
              className={`bg-white rounded-xl border shadow-sm px-3 py-2.5 flex flex-col gap-1 text-left transition-all hover:shadow-md ${tab === TABS.find((t) => t.label === label)?.key ? "border-[#1A56DB] ring-1 ring-[#1A56DB]/20" : "border-gray-100"}`}
            >
              <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
              <p className={`text-lg font-bold ${color} leading-none`}>{value}</p>
              <p className="text-[10px] text-gray-400 font-medium">{label}</p>
            </button>
          ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px flex-shrink-0 ${tab === key ? "border-[#1A56DB] text-[#1A56DB] bg-blue-50/50" : "border-transparent text-gray-500 hover:text-[#162B4D]"}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {!statsError && tab === "products" && <ProductsTab subHubId={subHubId} />}
          {!statsError && tab === "categories" && <CategoriesTab subHubId={subHubId} onRefreshStats={loadStats} />}
          {!statsError && tab === "combos" && <CombosTab subHubId={subHubId} />}
          {!statsError && tab === "coupons" && <CouponsTab subHubId={subHubId} />}
          {!statsError && tab === "carousels" && <CarouselsTab subHubId={subHubId} />}
          {!statsError && tab === "sections" && <SectionsTab subHubId={subHubId} />}
          {!statsError && tab === "pincodes" && <PincodesTab subHubId={subHubId} />}
          {!statsError && tab === "timeslots" && <TimeSlotsTab subHubId={subHubId} />}
          {statsError && <div className="py-12 text-center text-gray-400 text-sm">Fix the database connection to manage this sub hub's menu.</div>}
        </div>
      </div>
    </div>
  );
}

// ─── PRODUCTS TAB ─────────────────────────────────────────────────────────────
function ProductsTab({ subHubId }: { subHubId: string }) {
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortValue, setSortValue] = useState("name_asc");
  const [filters, setFilters] = useState<Record<string, string>>({ status: "all", category: "all" });
  const [layout, setLayout] = useState<Layout>("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pd, cd] = await Promise.all([
        apiFetch(`/api/sub-hubs/${subHubId}/menu/products`),
        apiFetch(`/api/sub-hubs/${subHubId}/menu/categories`),
      ]);
      setProducts(pd.products ?? []);
      setCategories(cd.categories ?? []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [subHubId, toast]);

  useEffect(() => { load(); }, [load]);

  const sortOptions: SortOption[] = [
    { value: "name_asc", label: "Name A→Z" },
    { value: "name_desc", label: "Name Z→A" },
    { value: "price_asc", label: "Price Low→High" },
    { value: "price_desc", label: "Price High→Low" },
    { value: "discount_desc", label: "Discount High→Low" },
    { value: "qty_desc", label: "Stock High→Low" },
  ];

  const catOptions = [{ value: "all", label: "All Categories" }, ...categories.map((c) => ({ value: c.name, label: c.name }))];
  const filterGroups: FilterGroup[] = [
    { key: "status", label: "Status", options: [{ value: "all", label: "All" }, { value: "available", label: "Available" }, { value: "out_of_stock", label: "Out of Stock" }, { value: "archived", label: "Archived" }] },
    { key: "category", label: "Category", options: catOptions },
  ];

  const processed = useMemo(() => {
    let items = [...products];
    if (search) items = items.filter((p) => [p.name, p.category, p.subCategory, p.description].filter(Boolean).some((f: string) => f.toLowerCase().includes(search.toLowerCase())));
    if (filters.status === "available") items = items.filter((p) => p.status === "available" && !p.isArchived);
    if (filters.status === "out_of_stock") items = items.filter((p) => p.status === "out_of_stock");
    if (filters.status === "archived") items = items.filter((p) => p.isArchived === true);
    if (filters.category !== "all") items = items.filter((p) => p.category === filters.category);
    items.sort((a, b) => {
      if (sortValue === "name_asc") return (a.name ?? "").localeCompare(b.name ?? "");
      if (sortValue === "name_desc") return (b.name ?? "").localeCompare(a.name ?? "");
      if (sortValue === "price_asc") return (a.price ?? 0) - (b.price ?? 0);
      if (sortValue === "price_desc") return (b.price ?? 0) - (a.price ?? 0);
      if (sortValue === "discount_desc") return (b.discountPct ?? 0) - (a.discountPct ?? 0);
      if (sortValue === "qty_desc") return (b.quantity ?? 0) - (a.quantity ?? 0);
      return 0;
    });
    return items;
  }, [products, search, filters, sortValue]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/sub-hubs/${subHubId}/menu/products/${deleteId}`, { method: "DELETE" });
      toast({ title: "Product deleted" }); load();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setDeleteId(null); }
  };

  const statusBadge = (p: any) => {
    if (p.isArchived) return <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 font-semibold bg-gray-100 px-1.5 py-0.5 rounded-full"><XCircle className="w-2.5 h-2.5" /> Archived</span>;
    if (p.status === "out_of_stock") return <span className="inline-flex items-center gap-1 text-[10px] text-orange-500 font-semibold bg-orange-50 px-1.5 py-0.5 rounded-full"><AlertCircle className="w-2.5 h-2.5" /> Out of Stock</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded-full"><CheckCircle className="w-2.5 h-2.5" /> Available</span>;
  };

  return (
    <div className="space-y-4">
      <TabToolbar
        search={search} onSearch={setSearch}
        sortOptions={sortOptions} sortValue={sortValue} onSortChange={setSortValue}
        filterGroups={filterGroups} filterValues={filters} onFilterChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        layout={layout} onLayout={setLayout}
        addLabel="Add Product" onAdd={() => { setEditing(null); setModalOpen(true); }}
        resultCount={processed.length} totalCount={products.length}
      />

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : processed.length === 0 ? (
        <EmptyState icon={Package} message="No products found" sub="Try adjusting your search or filters" />
      ) : layout === "list" ? (
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[200px]">Product</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Weight / Unit</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pieces / Serves</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Stock</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Recipes</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {processed.map((p) => (
                <tr key={String(p._id)} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-blue-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#162B4D] text-sm leading-tight">{p.name}</p>
                        {p.description && <p className="text-xs text-gray-400 mt-0.5 leading-tight line-clamp-1">{p.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-gray-600">{p.category || "—"}</p>
                    {p.subCategory && <p className="text-[10px] text-gray-400 mt-0.5">{p.subCategory}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-[#162B4D] text-sm">₹{p.price}</p>
                    {p.originalPrice > p.price && (
                      <p className="text-[10px] text-gray-400">
                        <span className="line-through">₹{p.originalPrice}</span>
                        <span className="ml-1 text-green-600 font-semibold">{p.discountPct}% off</span>
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-600 font-medium">{p.weight || "—"}</p>
                    <p className="text-[10px] text-gray-400">{p.unit || ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-600">{p.pieces || "—"}</p>
                    {p.serves && <p className="text-[10px] text-gray-400">{p.serves}</p>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-bold ${(p.quantity ?? 0) < 10 ? "text-red-500" : "text-[#162B4D]"}`}>{p.quantity ?? 0}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {Array.isArray(p.recipes) && p.recipes.length > 0
                      ? <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full font-semibold">{p.recipes.length} recipes</span>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">{statusBadge(p)}</td>
                  <td className="px-4 py-3"><ActionButtons onEdit={() => { setEditing(p); setModalOpen(true); }} onDelete={() => setDeleteId(String(p._id))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {processed.map((p) => (
            <div key={String(p._id)} className="border border-gray-100 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow">
              <div className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#162B4D] text-sm leading-tight">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.category}{p.subCategory ? ` › ${p.subCategory}` : ""}</p>
                  </div>
                  {statusBadge(p)}
                </div>

                {/* Description */}
                {p.description && <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{p.description}</p>}

                {/* Pricing row */}
                <div className="flex items-center gap-3 bg-blue-50/60 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">PRICE</p>
                    <p className="font-black text-[#1A56DB] text-base leading-tight">₹{p.price}</p>
                  </div>
                  {p.originalPrice > p.price && (
                    <>
                      <div className="w-px h-8 bg-blue-200" />
                      <div>
                        <p className="text-[10px] text-gray-400 font-medium">MRP</p>
                        <p className="text-xs text-gray-400 line-through">₹{p.originalPrice}</p>
                      </div>
                      <div className="ml-auto">
                        <span className="text-xs font-black text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">{p.discountPct}% off</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  {p.weight && <div><span className="text-gray-400">Weight: </span><span className="font-medium text-gray-600">{p.weight}</span></div>}
                  {p.unit && <div><span className="text-gray-400">Unit: </span><span className="font-medium text-gray-600">{p.unit}</span></div>}
                  {p.pieces && <div><span className="text-gray-400">Pieces: </span><span className="font-medium text-gray-600">{p.pieces}</span></div>}
                  {p.serves && <div><span className="text-gray-400">Serves: </span><span className="font-medium text-gray-600">{p.serves}</span></div>}
                  <div><span className="text-gray-400">Stock: </span><span className={`font-bold ${(p.quantity ?? 0) < 10 ? "text-red-500" : "text-gray-700"}`}>{p.quantity ?? 0}</span></div>
                  {Array.isArray(p.recipes) && p.recipes.length > 0 && (
                    <div><span className="text-gray-400">Recipes: </span><span className="font-medium text-blue-600">{p.recipes.length}</span></div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 pt-1 border-t border-gray-50">
                  <button onClick={() => { setEditing(p); setModalOpen(true); }} className="flex-1 h-8 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-[#1A56DB] hover:border-blue-200 hover:bg-blue-50 transition-colors text-xs font-medium">
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => setDeleteId(String(p._id))} className="flex-1 h-8 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors text-xs font-medium">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProductModal isOpen={modalOpen} onClose={() => setModalOpen(false)} product={editing} subHubId={subHubId} categories={categories} onSaved={load} />
      <DeleteDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Product" description="This will permanently remove the product from the menu." />
    </div>
  );
}

// ─── CATEGORIES TAB ───────────────────────────────────────────────────────────
function CategoriesTab({ subHubId, onRefreshStats }: { subHubId: string; onRefreshStats: () => void }) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortValue, setSortValue] = useState("sort_asc");
  const [filters, setFilters] = useState<Record<string, string>>({ status: "all" });
  const [layout, setLayout] = useState<Layout>("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/sub-hubs/${subHubId}/menu/categories`);
      setCategories(data.categories ?? []);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  }, [subHubId, toast]);

  useEffect(() => { load(); }, [load]);

  const sortOptions: SortOption[] = [
    { value: "sort_asc", label: "Sort Order" },
    { value: "name_asc", label: "Name A→Z" },
    { value: "name_desc", label: "Name Z→A" },
    { value: "subcats_desc", label: "Most Sub-categories" },
    { value: "status", label: "Status" },
  ];
  const filterGroups: FilterGroup[] = [
    { key: "status", label: "Status", options: [{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
  ];

  const processed = useMemo(() => {
    let items = [...categories];
    if (search) items = items.filter((c) => c.name?.toLowerCase().includes(search.toLowerCase()));
    if (filters.status === "active") items = items.filter((c) => c.isActive !== false);
    if (filters.status === "inactive") items = items.filter((c) => c.isActive === false);
    items.sort((a, b) => {
      if (sortValue === "name_asc") return (a.name ?? "").localeCompare(b.name ?? "");
      if (sortValue === "name_desc") return (b.name ?? "").localeCompare(a.name ?? "");
      if (sortValue === "sort_asc") return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (sortValue === "subcats_desc") return (b.subCategories?.length ?? 0) - (a.subCategories?.length ?? 0);
      if (sortValue === "status") return (b.isActive === false ? -1 : 1) - (a.isActive === false ? -1 : 1);
      return 0;
    });
    return items;
  }, [categories, search, filters, sortValue]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/sub-hubs/${subHubId}/menu/categories/${deleteId}`, { method: "DELETE" });
      toast({ title: "Category deleted" }); load(); onRefreshStats();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setDeleteId(null); }
  };

  return (
    <div className="space-y-4">
      <TabToolbar
        search={search} onSearch={setSearch}
        sortOptions={sortOptions} sortValue={sortValue} onSortChange={setSortValue}
        filterGroups={filterGroups} filterValues={filters} onFilterChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        layout={layout} onLayout={setLayout}
        addLabel="Add Category" onAdd={() => { setEditing(null); setModalOpen(true); }}
        resultCount={processed.length} totalCount={categories.length}
      />

      {loading ? <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      : processed.length === 0 ? <EmptyState icon={Tag} message="No categories found" />
      : layout === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {processed.map((c) => (
            <div key={String(c._id)} className="border border-gray-100 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow">
              {c.imageUrl ? <img src={c.imageUrl} alt={c.name} className="w-full h-24 object-cover" /> : <div className="w-full h-24 bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center"><Tag className="w-7 h-7 text-purple-200" /></div>}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <p className="font-semibold text-[#162B4D] text-sm truncate">{c.name}</p>
                  <StatusBadge active={c.isActive !== false} />
                </div>
                {Array.isArray(c.subCategories) && c.subCategories.length > 0 && (
                  <p className="text-xs text-gray-400">{c.subCategories.length} sub-categories</p>
                )}
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(c); setModalOpen(true); }} className="flex-1 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-[#1A56DB] hover:border-blue-200 hover:bg-blue-50 transition-colors"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => setDeleteId(String(c._id))} className="flex-1 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {processed.map((c) => {
            const expanded = expandedId === String(c._id);
            return (
              <div key={String(c._id)} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50/50 transition-colors">
                  {c.imageUrl ? <img src={c.imageUrl} alt={c.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center flex-shrink-0"><Tag className="w-4 h-4 text-purple-300" /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#162B4D] text-sm">{c.name}</p>
                      <StatusBadge active={c.isActive !== false} />
                    </div>
                    {Array.isArray(c.subCategories) && c.subCategories.length > 0 && <p className="text-xs text-gray-400 mt-0.5">{c.subCategories.length} sub-categories</p>}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">#{c.sortOrder ?? 0}</span>
                  <div className="flex items-center gap-1">
                    {Array.isArray(c.subCategories) && c.subCategories.length > 0 && (
                      <button onClick={() => setExpandedId(expanded ? null : String(c._id))} className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors">
                        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                    <ActionButtons onEdit={() => { setEditing(c); setModalOpen(true); }} onDelete={() => setDeleteId(String(c._id))} />
                  </div>
                </div>
                {expanded && Array.isArray(c.subCategories) && c.subCategories.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {c.subCategories.map((s: any) => <span key={s.name} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-full">{s.name}</span>)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CategoryModal isOpen={modalOpen} onClose={() => setModalOpen(false)} category={editing} subHubId={subHubId} onSaved={() => { load(); onRefreshStats(); }} />
      <DeleteDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Category" description="This will permanently remove the category." />
    </div>
  );
}

// ─── COMBOS TAB ───────────────────────────────────────────────────────────────
function CombosTab({ subHubId }: { subHubId: string }) {
  const { toast } = useToast();
  const [combos, setCombos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortValue, setSortValue] = useState("sort_asc");
  const [filters, setFilters] = useState<Record<string, string>>({ status: "all" });
  const [layout, setLayout] = useState<Layout>("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/sub-hubs/${subHubId}/menu/combos`);
      setCombos(data.combos ?? []);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  }, [subHubId, toast]);

  useEffect(() => { load(); }, [load]);

  const sortOptions: SortOption[] = [
    { value: "sort_asc", label: "Sort Order" },
    { value: "name_asc", label: "Name A→Z" },
    { value: "name_desc", label: "Name Z→A" },
    { value: "price_asc", label: "Price Low→High" },
    { value: "price_desc", label: "Price High→Low" },
    { value: "discount_desc", label: "Discount High→Low" },
  ];
  const filterGroups: FilterGroup[] = [
    { key: "status", label: "Status", options: [{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
  ];

  const processed = useMemo(() => {
    let items = [...combos];
    if (search) items = items.filter((c) => c.name?.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase()));
    if (filters.status === "active") items = items.filter((c) => c.isActive !== false);
    if (filters.status === "inactive") items = items.filter((c) => c.isActive === false);
    items.sort((a, b) => {
      if (sortValue === "name_asc") return (a.name ?? "").localeCompare(b.name ?? "");
      if (sortValue === "name_desc") return (b.name ?? "").localeCompare(a.name ?? "");
      if (sortValue === "price_asc") return (a.price ?? 0) - (b.price ?? 0);
      if (sortValue === "price_desc") return (b.price ?? 0) - (a.price ?? 0);
      if (sortValue === "discount_desc") return (b.discount ?? 0) - (a.discount ?? 0);
      if (sortValue === "sort_asc") return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      return 0;
    });
    return items;
  }, [combos, search, filters, sortValue]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/sub-hubs/${subHubId}/menu/combos/${deleteId}`, { method: "DELETE" });
      toast({ title: "Combo deleted" }); load();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setDeleteId(null); }
  };

  return (
    <div className="space-y-4">
      <TabToolbar
        search={search} onSearch={setSearch}
        sortOptions={sortOptions} sortValue={sortValue} onSortChange={setSortValue}
        filterGroups={filterGroups} filterValues={filters} onFilterChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        layout={layout} onLayout={setLayout}
        addLabel="Add Combo" onAdd={() => { setEditing(null); setModalOpen(true); }}
        resultCount={processed.length} totalCount={combos.length}
      />

      {loading ? <div className="space-y-2">{[1,2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      : processed.length === 0 ? <EmptyState icon={ShoppingBag} message="No combos found" />
      : layout === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {processed.map((c) => {
            const img = Array.isArray(c.images) && c.images.length > 0 ? c.images[0] : null;
            return (
              <div key={String(c._id)} className="border border-gray-100 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow">
                {c.imageUrl ? <img src={c.imageUrl} alt={c.name} className="w-full h-32 object-cover" /> : <div className="w-full h-32 bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center"><ShoppingBag className="w-9 h-9 text-indigo-200" /></div>}
                <div className="p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-[#162B4D] text-sm">{c.name}</p>
                    <StatusBadge active={c.isActive !== false} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#1A56DB]">₹{c.discountedPrice ?? c.price}</span>
                    {c.originalPrice > (c.discountedPrice ?? c.price) && <span className="text-xs text-gray-400 line-through">₹{c.originalPrice}</span>}
                    {c.discount > 0 && <span className="text-xs bg-green-50 text-green-600 font-semibold px-1.5 py-0.5 rounded-full">{c.discount}% off</span>}
                  </div>
                  {Array.isArray(c.includes) && c.includes.length > 0 && <p className="text-xs text-gray-400">{c.includes.length} items included</p>}
                  <div className="flex gap-1 pt-1">
                    <button onClick={() => { setEditing(c); setModalOpen(true); }} className="flex-1 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-[#1A56DB] hover:border-blue-200 hover:bg-blue-50 transition-colors"><Edit2 className="w-3 h-3" /></button>
                    <button onClick={() => setDeleteId(String(c._id))} className="flex-1 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left">
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Combo</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Discount</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {processed.map((c) => {
                const img = Array.isArray(c.images) && c.images.length > 0 ? c.images[0] : null;
                return (
                  <tr key={String(c._id)} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {c.imageUrl ? <img src={c.imageUrl} alt={c.name} className="w-9 h-9 rounded-lg object-cover border border-gray-100 flex-shrink-0" /> : <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0"><ShoppingBag className="w-4 h-4 text-indigo-200" /></div>}
                        <div>
                          <p className="font-semibold text-[#162B4D] text-sm">{c.name}</p>
                          {c.description && <p className="text-xs text-gray-400 truncate max-w-[180px]">{c.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="font-bold text-[#162B4D]">₹{c.discountedPrice ?? c.price}</span>{c.originalPrice > (c.discountedPrice ?? c.price) && <span className="text-xs text-gray-400 line-through ml-1">₹{c.originalPrice}</span>}</td>
                    <td className="px-4 py-3">{c.discount > 0 ? <span className="text-xs bg-green-50 text-green-600 font-semibold px-1.5 py-0.5 rounded-full">{c.discount}% off</span> : "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{Array.isArray(c.includes) ? c.includes.length : 0}</td>
                    <td className="px-4 py-3"><StatusBadge active={c.isActive !== false} /></td>
                    <td className="px-4 py-3"><ActionButtons onEdit={() => { setEditing(c); setModalOpen(true); }} onDelete={() => setDeleteId(String(c._id))} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ComboModal isOpen={modalOpen} onClose={() => setModalOpen(false)} combo={editing} subHubId={subHubId} onSaved={load} />
      <DeleteDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Combo" description="This will permanently remove the combo." />
    </div>
  );
}

// ─── COUPONS TAB ──────────────────────────────────────────────────────────────
function CouponsTab({ subHubId }: { subHubId: string }) {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortValue, setSortValue] = useState("code_asc");
  const [filters, setFilters] = useState<Record<string, string>>({ status: "all", type: "all" });
  const [layout, setLayout] = useState<Layout>("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/sub-hubs/${subHubId}/menu/coupons`);
      setCoupons(data.coupons ?? []);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  }, [subHubId, toast]);

  useEffect(() => { load(); }, [load]);

  const sortOptions: SortOption[] = [
    { value: "code_asc", label: "Code A→Z" },
    { value: "discount_desc", label: "Discount High→Low" },
    { value: "used_desc", label: "Most Used" },
    { value: "minorder_asc", label: "Min Order Low→High" },
    { value: "expiry_asc", label: "Expiry Soonest" },
  ];
  const filterGroups: FilterGroup[] = [
    { key: "status", label: "Status", options: [{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
    { key: "type", label: "Type", options: [{ value: "all", label: "All Types" }, { value: "percentage", label: "Percentage" }, { value: "flat", label: "Flat" }] },
    { key: "firstTime", label: "Eligibility", options: [{ value: "all", label: "All" }, { value: "yes", label: "First Time Only" }] },
  ];

  const processed = useMemo(() => {
    let items = [...coupons];
    if (search) items = items.filter((c) => c.code?.toLowerCase().includes(search.toLowerCase()));
    if (filters.status === "active") items = items.filter((c) => c.isActive !== false);
    if (filters.status === "inactive") items = items.filter((c) => c.isActive === false);
    if (filters.type !== "all") items = items.filter((c) => c.type === filters.type);
    if (filters.firstTime === "yes") items = items.filter((c) => c.isFirstTimeOnly === true);
    items.sort((a, b) => {
      if (sortValue === "code_asc") return (a.code ?? "").localeCompare(b.code ?? "");
      if (sortValue === "discount_desc") return (b.discountValue ?? 0) - (a.discountValue ?? 0);
      if (sortValue === "used_desc") return (b.usedCount ?? 0) - (a.usedCount ?? 0);
      if (sortValue === "minorder_asc") return (a.minOrderAmount ?? 0) - (b.minOrderAmount ?? 0);
      if (sortValue === "expiry_asc") return new Date(a.expiresAt ?? "9999").getTime() - new Date(b.expiresAt ?? "9999").getTime();
      return 0;
    });
    return items;
  }, [coupons, search, filters, sortValue]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/sub-hubs/${subHubId}/menu/coupons/${deleteId}`, { method: "DELETE" });
      toast({ title: "Coupon deleted" }); load();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setDeleteId(null); }
  };

  return (
    <div className="space-y-4">
      <TabToolbar
        search={search} onSearch={setSearch}
        sortOptions={sortOptions} sortValue={sortValue} onSortChange={setSortValue}
        filterGroups={filterGroups} filterValues={filters} onFilterChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        layout={layout} onLayout={setLayout}
        addLabel="Add Coupon" onAdd={() => { setEditing(null); setModalOpen(true); }}
        resultCount={processed.length} totalCount={coupons.length}
      />

      {loading ? <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      : processed.length === 0 ? <EmptyState icon={Ticket} message="No coupons found" />
      : layout === "list" ? (
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left">
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Discount</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Min Order</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Used</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Expires</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {processed.map((c) => (
                <tr key={String(c._id)} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-[#162B4D] text-sm tracking-wider bg-gray-100 px-2 py-0.5 rounded">{c.code}</span>
                    {c.isFirstTimeOnly && <span className="ml-2 text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full font-semibold">1st Time</span>}
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-500 text-xs">{c.type}</td>
                  <td className="px-4 py-3 font-semibold text-[#162B4D]">{c.type === "percentage" ? `${c.discountValue}%` : `₹${c.discountValue}`}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">₹{c.minOrderAmount}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.usedCount ?? 0}{c.maxUsage ? ` / ${c.maxUsage}` : ""}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-IN") : "No expiry"}</td>
                  <td className="px-4 py-3"><StatusBadge active={c.isActive !== false} /></td>
                  <td className="px-4 py-3"><ActionButtons onEdit={() => { setEditing(c); setModalOpen(true); }} onDelete={() => setDeleteId(String(c._id))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {processed.map((c) => (
            <div key={String(c._id)} className="border border-dashed border-orange-200 rounded-xl bg-orange-50/30 p-4 hover:shadow-sm transition-shadow relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-400 rounded-l-xl" />
              <div className="pl-2 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-black text-[#162B4D] text-base tracking-widest">{c.code}</span>
                    {c.isFirstTimeOnly && <span className="ml-2 text-[10px] text-purple-600 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded-full font-semibold">1st Time</span>}
                  </div>
                  <StatusBadge active={c.isActive !== false} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-orange-500">{c.type === "percentage" ? `${c.discountValue}%` : `₹${c.discountValue}`}</span>
                  <span className="text-xs text-gray-500 capitalize">{c.type} off</span>
                </div>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>Min: ₹{c.minOrderAmount}</span>
                  <span>Used: {c.usedCount ?? 0}{c.maxUsage ? `/${c.maxUsage}` : ""}</span>
                </div>
                {c.expiresAt && <p className="text-xs text-gray-400">Expires: {new Date(c.expiresAt).toLocaleDateString("en-IN")}</p>}
                <div className="flex gap-1 pt-1">
                  <button onClick={() => { setEditing(c); setModalOpen(true); }} className="flex-1 h-7 flex items-center justify-center rounded border border-gray-200 bg-white text-gray-400 hover:text-[#1A56DB] hover:border-blue-200 hover:bg-blue-50 transition-colors"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => setDeleteId(String(c._id))} className="flex-1 h-7 flex items-center justify-center rounded border border-gray-200 bg-white text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CouponModal isOpen={modalOpen} onClose={() => setModalOpen(false)} coupon={editing} subHubId={subHubId} onSaved={load} />
      <DeleteDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Coupon" description="This will permanently remove the coupon." />
    </div>
  );
}

// ─── CAROUSELS TAB ────────────────────────────────────────────────────────────
function CarouselsTab({ subHubId }: { subHubId: string }) {
  const { toast } = useToast();
  const [carousels, setCarousels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortValue, setSortValue] = useState("order_asc");
  const [filters, setFilters] = useState<Record<string, string>>({ status: "all" });
  const [layout, setLayout] = useState<Layout>("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/sub-hubs/${subHubId}/menu/carousels`);
      setCarousels(data.carousels ?? []);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  }, [subHubId, toast]);

  useEffect(() => { load(); }, [load]);

  const sortOptions: SortOption[] = [
    { value: "order_asc", label: "Display Order" },
    { value: "title_asc", label: "Title A→Z" },
    { value: "status", label: "Status" },
  ];
  const filterGroups: FilterGroup[] = [
    { key: "status", label: "Status", options: [{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
  ];

  const processed = useMemo(() => {
    let items = [...carousels];
    if (search) items = items.filter((c) => c.title?.toLowerCase().includes(search.toLowerCase()) || c.imageUrl?.toLowerCase().includes(search.toLowerCase()));
    if (filters.status === "active") items = items.filter((c) => c.isActive !== false);
    if (filters.status === "inactive") items = items.filter((c) => c.isActive === false);
    items.sort((a, b) => {
      if (sortValue === "order_asc") return (a.order ?? 0) - (b.order ?? 0);
      if (sortValue === "title_asc") return (a.title ?? "").localeCompare(b.title ?? "");
      if (sortValue === "status") return (b.isActive === false ? -1 : 1) - (a.isActive === false ? -1 : 1);
      return 0;
    });
    return items;
  }, [carousels, search, filters, sortValue]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/sub-hubs/${subHubId}/menu/carousels/${deleteId}`, { method: "DELETE" });
      toast({ title: "Banner deleted" }); load();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setDeleteId(null); }
  };

  return (
    <div className="space-y-4">
      <TabToolbar
        search={search} onSearch={setSearch}
        sortOptions={sortOptions} sortValue={sortValue} onSortChange={setSortValue}
        filterGroups={filterGroups} filterValues={filters} onFilterChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        layout={layout} onLayout={setLayout}
        addLabel="Add Banner" onAdd={() => { setEditing(null); setModalOpen(true); }}
        resultCount={processed.length} totalCount={carousels.length}
      />

      {loading ? <div className="space-y-2">{[1,2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      : processed.length === 0 ? <EmptyState icon={Image} message="No banners found" />
      : layout === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {processed.map((c) => (
            <div key={String(c._id)} className="border border-gray-100 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow">
              <div className="relative h-36 bg-gray-100">
                {c.imageUrl ? <img src={c.imageUrl} alt={c.title ?? "Banner"} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Image className="w-8 h-8 text-gray-300" /></div>}
                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full font-semibold">#{c.order}</div>
                <div className="absolute top-2 right-2"><StatusBadge active={c.isActive !== false} /></div>
              </div>
              <div className="p-3 space-y-1.5">
                <p className="font-semibold text-[#162B4D] text-sm">{c.title || <span className="text-gray-400 font-normal italic">No title</span>}</p>
                {c.linkUrl && <p className="text-xs text-gray-400 truncate">{c.linkUrl}</p>}
                <div className="flex gap-1 pt-0.5">
                  <button onClick={() => { setEditing(c); setModalOpen(true); }} className="flex-1 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-[#1A56DB] hover:border-blue-200 hover:bg-blue-50 transition-colors"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => setDeleteId(String(c._id))} className="flex-1 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {processed.map((c) => (
            <div key={String(c._id)} className="border border-gray-100 rounded-xl overflow-hidden flex gap-3 bg-white p-3 hover:shadow-sm transition-shadow items-center">
              <div className="flex items-center gap-2 text-gray-300 flex-shrink-0">
                <GripVertical className="w-4 h-4" />
                <span className="text-xs font-bold text-gray-400">#{c.order}</span>
              </div>
              <div className="w-28 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                {c.imageUrl ? <img src={c.imageUrl} alt={c.title ?? "Banner"} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Image className="w-4 h-4 text-gray-300" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#162B4D] text-sm">{c.title || <span className="text-gray-400 font-normal italic">No title</span>}</p>
                {c.linkUrl && <p className="text-xs text-gray-400 truncate">{c.linkUrl}</p>}
              </div>
              <StatusBadge active={c.isActive !== false} />
              <ActionButtons onEdit={() => { setEditing(c); setModalOpen(true); }} onDelete={() => setDeleteId(String(c._id))} />
            </div>
          ))}
        </div>
      )}

      <CarouselModal isOpen={modalOpen} onClose={() => setModalOpen(false)} carousel={editing} subHubId={subHubId} onSaved={load} />
      <DeleteDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Banner" description="This will permanently remove the banner from the carousel." />
    </div>
  );
}

// ─── SECTIONS TAB ─────────────────────────────────────────────────────────────
function SectionsTab({ subHubId }: { subHubId: string }) {
  const { toast } = useToast();
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortValue, setSortValue] = useState("sort_asc");
  const [filters, setFilters] = useState<Record<string, string>>({ status: "all", type: "all" });
  const [layout, setLayout] = useState<Layout>("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/sub-hubs/${subHubId}/menu/sections`);
      setSections(data.sections ?? []);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  }, [subHubId, toast]);

  useEffect(() => { load(); }, [load]);

  const sortOptions: SortOption[] = [
    { value: "sort_asc", label: "Sort Order" },
    { value: "title_asc", label: "Title A→Z" },
    { value: "title_desc", label: "Title Z→A" },
    { value: "type", label: "Content Type" },
  ];
  const filterGroups: FilterGroup[] = [
    { key: "status", label: "Status", options: [{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
    { key: "type", label: "Content Type", options: [{ value: "all", label: "All Types" }, { value: "products", label: "Products" }, { value: "combos", label: "Combos" }, { value: "categories", label: "Categories" }, { value: "carousels", label: "Carousels" }] },
  ];

  const TYPE_COLORS: Record<string, string> = {
    products: "bg-blue-50 text-blue-600 border-blue-100",
    combos: "bg-indigo-50 text-indigo-600 border-indigo-100",
    categories: "bg-purple-50 text-purple-600 border-purple-100",
    carousels: "bg-pink-50 text-pink-600 border-pink-100",
  };

  const processed = useMemo(() => {
    let items = [...sections];
    if (search) items = items.filter((s) => s.title?.toLowerCase().includes(search.toLowerCase()));
    if (filters.status === "active") items = items.filter((s) => s.isActive !== false);
    if (filters.status === "inactive") items = items.filter((s) => s.isActive === false);
    if (filters.type !== "all") items = items.filter((s) => s.type === filters.type);
    items.sort((a, b) => {
      if (sortValue === "title_asc") return (a.title ?? "").localeCompare(b.title ?? "");
      if (sortValue === "title_desc") return (b.title ?? "").localeCompare(a.title ?? "");
      if (sortValue === "type") return (a.type ?? "").localeCompare(b.type ?? "");
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
    return items;
  }, [sections, search, filters, sortValue]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/sub-hubs/${subHubId}/menu/sections/${deleteId}`, { method: "DELETE" });
      toast({ title: "Section deleted" }); load();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setDeleteId(null); }
  };

  return (
    <div className="space-y-4">
      <TabToolbar
        search={search} onSearch={setSearch}
        sortOptions={sortOptions} sortValue={sortValue} onSortChange={setSortValue}
        filterGroups={filterGroups} filterValues={filters} onFilterChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        layout={layout} onLayout={setLayout}
        addLabel="Add Section" onAdd={() => { setEditing(null); setModalOpen(true); }}
        resultCount={processed.length} totalCount={sections.length}
      />

      {loading ? <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      : processed.length === 0 ? <EmptyState icon={LayoutList} message="No sections found" />
      : layout === "list" ? (
        <div className="space-y-2">
          {processed.map((s) => (
            <div key={String(s._id)} className="flex items-center gap-3 border border-gray-100 rounded-xl px-4 py-3 bg-white hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center gap-2 text-gray-300 flex-shrink-0">
                <GripVertical className="w-4 h-4" />
                <span className="text-xs font-bold text-gray-400">#{s.sortOrder}</span>
              </div>
              <p className="font-semibold text-[#162B4D] text-sm flex-1 min-w-0 truncate">{s.title}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize border flex-shrink-0 ${TYPE_COLORS[s.type] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>{s.type}</span>
              <StatusBadge active={s.isActive !== false} />
              <ActionButtons onEdit={() => { setEditing(s); setModalOpen(true); }} onDelete={() => setDeleteId(String(s._id))} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {processed.map((s) => (
            <div key={String(s._id)} className="border border-gray-100 rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-[#162B4D] text-sm">{s.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Order #{s.sortOrder}</p>
                </div>
                <StatusBadge active={s.isActive !== false} />
              </div>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold capitalize border mb-3 ${TYPE_COLORS[s.type] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>{s.type}</span>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(s); setModalOpen(true); }} className="flex-1 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-[#1A56DB] hover:border-blue-200 hover:bg-blue-50 transition-colors"><Edit2 className="w-3 h-3" /></button>
                <button onClick={() => setDeleteId(String(s._id))} className="flex-1 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SectionModal isOpen={modalOpen} onClose={() => setModalOpen(false)} section={editing} subHubId={subHubId} onSaved={load} />
      <DeleteDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Section" description="This will permanently remove this homepage section." />
    </div>
  );
}

// ─── PINCODES TAB ─────────────────────────────────────────────────────────────
function PincodesTab({ subHubId }: { subHubId: string }) {
  const { toast } = useToast();
  const [pincodes, setPincodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortValue, setSortValue] = useState("pincode_asc");
  const [filters, setFilters] = useState<Record<string, string>>({ status: "all", city: "all" });
  const [layout, setLayout] = useState<Layout>("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/sub-hubs/${subHubId}/menu/pincodes`);
      setPincodes(data.pincodes ?? []);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  }, [subHubId, toast]);

  useEffect(() => { load(); }, [load]);

  const cities = useMemo(() => {
    const unique = [...new Set(pincodes.map((p) => p.city).filter(Boolean))].sort();
    return [{ value: "all", label: "All Cities" }, ...unique.map((c) => ({ value: c, label: c }))];
  }, [pincodes]);

  const sortOptions: SortOption[] = [
    { value: "pincode_asc", label: "Pincode A→Z" },
    { value: "area_asc", label: "Area A→Z" },
    { value: "city_asc", label: "City A→Z" },
    { value: "status", label: "Status" },
  ];
  const filterGroups: FilterGroup[] = [
    { key: "status", label: "Status", options: [{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
    { key: "city", label: "City", options: cities },
  ];

  const processed = useMemo(() => {
    let items = [...pincodes];
    if (search) items = items.filter((p) => p.pincode?.includes(search) || p.area?.toLowerCase().includes(search.toLowerCase()) || p.city?.toLowerCase().includes(search.toLowerCase()));
    if (filters.status === "active") items = items.filter((p) => p.isActive !== false);
    if (filters.status === "inactive") items = items.filter((p) => p.isActive === false);
    if (filters.city !== "all") items = items.filter((p) => p.city === filters.city);
    items.sort((a, b) => {
      if (sortValue === "pincode_asc") return (a.pincode ?? "").localeCompare(b.pincode ?? "");
      if (sortValue === "area_asc") return (a.area ?? "").localeCompare(b.area ?? "");
      if (sortValue === "city_asc") return (a.city ?? "").localeCompare(b.city ?? "");
      if (sortValue === "status") return (b.isActive === false ? -1 : 1) - (a.isActive === false ? -1 : 1);
      return 0;
    });
    return items;
  }, [pincodes, search, filters, sortValue]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/sub-hubs/${subHubId}/menu/pincodes/${deleteId}`, { method: "DELETE" });
      toast({ title: "Pincode deleted" }); load();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setDeleteId(null); }
  };

  return (
    <div className="space-y-4">
      <TabToolbar
        search={search} onSearch={setSearch}
        sortOptions={sortOptions} sortValue={sortValue} onSortChange={setSortValue}
        filterGroups={filterGroups} filterValues={filters} onFilterChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        layout={layout} onLayout={setLayout}
        addLabel="Add Pincode" onAdd={() => { setEditing(null); setModalOpen(true); }}
        resultCount={processed.length} totalCount={pincodes.length}
      />

      {loading ? <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      : processed.length === 0 ? <EmptyState icon={MapPin} message="No pincodes found" />
      : layout === "list" ? (
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left">
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pincode</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Area</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">City</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {processed.map((p) => (
                <tr key={String(p._id)} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3"><span className="font-mono font-bold text-[#162B4D]">{p.pincode}</span></td>
                  <td className="px-4 py-3 text-gray-600 text-sm">{p.area || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.city || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge active={p.isActive !== false} /></td>
                  <td className="px-4 py-3"><ActionButtons onEdit={() => { setEditing(p); setModalOpen(true); }} onDelete={() => setDeleteId(String(p._id))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {processed.map((p) => (
            <div key={String(p._id)} className="border border-gray-100 rounded-xl p-3 bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-1 mb-2">
                <div>
                  <p className="font-mono font-black text-[#162B4D] text-lg leading-none">{p.pincode}</p>
                  {p.area && <p className="text-xs text-gray-500 mt-1">{p.area}</p>}
                  {p.city && <p className="text-[10px] text-gray-400">{p.city}</p>}
                </div>
                <div className="mt-0.5"><StatusBadge active={p.isActive !== false} /></div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(p); setModalOpen(true); }} className="flex-1 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-[#1A56DB] hover:border-blue-200 hover:bg-blue-50 transition-colors"><Edit2 className="w-3 h-3" /></button>
                <button onClick={() => setDeleteId(String(p._id))} className="flex-1 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PincodeModal isOpen={modalOpen} onClose={() => setModalOpen(false)} pincode={editing} subHubId={subHubId} onSaved={load} />
      <DeleteDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Pincode" description="This will remove the pincode from the service area." />
    </div>
  );
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
const BLANK_RECIPE = () => ({
  title: "", description: "", image: "",
  totalTime: "", prepTime: "", cookTime: "",
  servings: 2, difficulty: "Medium",
  ingredients: [""], method: [""],
});

function RecipeEditor({ recipe, onChange, onRemove }: { recipe: any; onChange: (r: any) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [imageUploading, setImageUploading] = useState(false);
  const upd = (k: string, v: any) => onChange({ ...recipe, [k]: v });

  const handleImageFile = async (file: File) => {
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload?folder=fishtokri/recipes", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Upload failed");
      upd("image", data.url);
    } catch (err: any) {
      alert(err.message ?? "Upload failed");
    } finally {
      setImageUploading(false);
    }
  };
  const updList = (k: string, i: number, v: string) => onChange({ ...recipe, [k]: recipe[k].map((x: string, idx: number) => idx === i ? v : x) });
  const addItem = (k: string) => onChange({ ...recipe, [k]: [...recipe[k], ""] });
  const removeItem = (k: string, i: number) => onChange({ ...recipe, [k]: recipe[k].filter((_: any, idx: number) => idx !== i) });

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/50 hover:bg-gray-50 transition-colors text-left">
        <div className="flex items-center gap-2 min-w-0">
          <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
          <p className="font-medium text-[#162B4D] text-sm truncate">{recipe.title || <span className="text-gray-400 italic font-normal">Untitled Recipe</span>}</p>
          {recipe.totalTime && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">{recipe.totalTime}</span>}
          {recipe.difficulty && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">{recipe.difficulty}</span>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="p-4 space-y-4 border-t border-gray-100">
          {/* Title + Description */}
          <div className="space-y-2">
            <div className="space-y-1"><Label className="text-xs font-semibold text-gray-500">Recipe Title *</Label><Input value={recipe.title} onChange={(e) => upd("title", e.target.value)} placeholder="e.g. Classic Chicken Curry" className="h-8 text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs font-semibold text-gray-500">Description</Label><textarea value={recipe.description} onChange={(e) => upd("description", e.target.value)} placeholder="Brief description of this recipe..." className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB]/30 outline-none resize-none h-16" /></div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-500">Recipe Image</Label>
              <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg w-fit mb-1.5">
                <button type="button" onClick={() => setImageMode("url")} className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${imageMode === "url" ? "bg-white text-[#162B4D] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>URL</button>
                <button type="button" onClick={() => setImageMode("upload")} className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${imageMode === "upload" ? "bg-white text-[#162B4D] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Upload</button>
              </div>
              {imageMode === "url" ? (
                <Input value={recipe.image} onChange={(e) => upd("image", e.target.value)} placeholder="https://..." className="h-8 text-sm" />
              ) : (
                <div className="space-y-1.5">
                  <label className={`flex items-center justify-center gap-2 h-9 px-3 rounded-lg border-2 border-dashed cursor-pointer text-sm transition-colors ${imageUploading ? "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed" : "border-gray-200 hover:border-[#1A56DB] text-gray-500 hover:text-[#1A56DB]"}`}>
                    {imageUploading ? <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> Uploading...</> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" /></svg> Choose image from device</>}
                    <input type="file" accept="image/*" className="hidden" disabled={imageUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ""; }} />
                  </label>
                  {recipe.image && <p className="text-[10px] text-green-600 truncate">Uploaded: {recipe.image}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Timing + Serving */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Timing & Servings</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="space-y-1"><Label className="text-[10px] font-semibold text-gray-500">Prep Time</Label><Input value={recipe.prepTime} onChange={(e) => upd("prepTime", e.target.value)} placeholder="15 min" className="h-8 text-sm" /></div>
              <div className="space-y-1"><Label className="text-[10px] font-semibold text-gray-500">Cook Time</Label><Input value={recipe.cookTime} onChange={(e) => upd("cookTime", e.target.value)} placeholder="35 min" className="h-8 text-sm" /></div>
              <div className="space-y-1"><Label className="text-[10px] font-semibold text-gray-500">Total Time</Label><Input value={recipe.totalTime} onChange={(e) => upd("totalTime", e.target.value)} placeholder="50 min" className="h-8 text-sm" /></div>
              <div className="space-y-1"><Label className="text-[10px] font-semibold text-gray-500">Servings</Label><Input type="number" min="1" value={recipe.servings} onChange={(e) => upd("servings", Number(e.target.value))} className="h-8 text-sm" /></div>
              <div className="space-y-1 sm:col-span-2"><Label className="text-[10px] font-semibold text-gray-500">Difficulty</Label>
                <Select value={recipe.difficulty} onValueChange={(v) => upd("difficulty", v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Easy">Easy</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Hard">Hard</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Ingredients</p>
              <button type="button" onClick={() => addItem("ingredients")} className="text-xs text-[#1A56DB] font-medium flex items-center gap-1 hover:underline"><Plus className="w-3 h-3" /> Add</button>
            </div>
            <div className="space-y-1.5">
              {(recipe.ingredients ?? []).map((ing: string, i: number) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-gray-300 w-5 flex-shrink-0 text-right">{i + 1}.</span>
                  <Input value={ing} onChange={(e) => updList("ingredients", i, e.target.value)} placeholder={`e.g. 500g chicken curry cut`} className="h-7 text-sm flex-1" />
                  {(recipe.ingredients?.length ?? 0) > 1 && <button type="button" onClick={() => removeItem("ingredients", i)} className="text-gray-300 hover:text-red-500 flex-shrink-0"><X className="w-3 h-3" /></button>}
                </div>
              ))}
            </div>
          </div>

          {/* Method */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Method Steps</p>
              <button type="button" onClick={() => addItem("method")} className="text-xs text-[#1A56DB] font-medium flex items-center gap-1 hover:underline"><Plus className="w-3 h-3" /> Add step</button>
            </div>
            <div className="space-y-2">
              {(recipe.method ?? []).map((step: string, i: number) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-[10px] font-bold text-gray-300 w-5 flex-shrink-0 text-right mt-1.5">{i + 1}.</span>
                  <textarea value={step} onChange={(e) => updList("method", i, e.target.value)} placeholder={`Step ${i + 1}...`} className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB]/30 outline-none resize-none h-14" />
                  {(recipe.method?.length ?? 0) > 1 && <button type="button" onClick={() => removeItem("method", i)} className="text-gray-300 hover:text-red-500 flex-shrink-0 mt-1.5"><X className="w-3 h-3" /></button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductModal({ isOpen, onClose, product, subHubId, categories, onSaved }: any) {
  const { toast } = useToast();
  const isEditing = !!product;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [unit, setUnit] = useState("per kg");
  const [weight, setWeight] = useState("");
  const [grossWeight, setGrossWeight] = useState("");
  const [netWeight, setNetWeight] = useState("");
  const [pieces, setPieces] = useState("");
  const [serves, setServes] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [status, setStatus] = useState("available");
  const [isArchived, setIsArchived] = useState(false);
  const [imageUrl, setProductImageUrl] = useState("");
  const [recipes, setRecipes] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const discountPct = useMemo(() => {
    const p = Number(price), op = Number(originalPrice);
    return op > p && p > 0 ? Math.round(((op - p) / op) * 100) : 0;
  }, [price, originalPrice]);

  useEffect(() => {
    if (!isOpen) return;
    if (product) {
      setName(product.name ?? "");
      setDescription(product.description ?? "");
      setCategory(product.category ?? "");
      setSubCategory(product.subCategory ?? "");
      setPrice(String(product.price ?? ""));
      setOriginalPrice(String(product.originalPrice ?? ""));
      setUnit(product.unit ?? "per kg");
      setWeight(product.weight ?? "");
      setGrossWeight(product.grossWeight ?? "");
      setNetWeight(product.netWeight ?? "");
      setPieces(product.pieces ?? "");
      setServes(product.serves ?? "");
      setQuantity(String(product.quantity ?? 0));
      setStatus(product.status ?? "available");
      setIsArchived(product.isArchived === true);
      setProductImageUrl(product.imageUrl ?? "");
      setRecipes(Array.isArray(product.recipes) ? product.recipes.map((r: any) => ({
        title: r.title ?? "", description: r.description ?? "", image: r.image ?? "",
        totalTime: r.totalTime ?? "", prepTime: r.prepTime ?? "", cookTime: r.cookTime ?? "",
        servings: r.servings ?? 2, difficulty: r.difficulty ?? "Medium",
        ingredients: Array.isArray(r.ingredients) && r.ingredients.length > 0 ? r.ingredients : [""],
        method: Array.isArray(r.method) && r.method.length > 0 ? r.method : [""],
      })) : []);
    } else {
      setName(""); setDescription(""); setCategory(""); setSubCategory("");
      setPrice(""); setOriginalPrice(""); setUnit("per kg"); setWeight("");
      setGrossWeight(""); setNetWeight(""); setPieces(""); setServes(""); setQuantity("0"); setStatus("available");
      setIsArchived(false); setProductImageUrl(""); setRecipes([]);
    }
  }, [isOpen, product]);

  const selectedCat = categories?.find((c: any) => c.name === category);
  const subCats: string[] = selectedCat?.subCategories?.map((s: any) => s.name ?? s) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const cleanedRecipes = recipes.map((r) => ({
      ...r,
      ingredients: r.ingredients.filter((s: string) => s.trim()),
      method: r.method.filter((s: string) => s.trim()),
    }));
    const payload = {
      name, description, category, subCategory,
      price: Number(price) || 0,
      originalPrice: Number(originalPrice) || Number(price) || 0,
      discountPct,
      unit, weight, grossWeight, netWeight, pieces, serves,
      quantity: Number(quantity) || 0,
      status, isArchived, imageUrl,
      recipes: cleanedRecipes,
    };
    try {
      if (isEditing) {
        await apiFetch(`/api/sub-hubs/${subHubId}/menu/products/${product._id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast({ title: "Product updated" });
      } else {
        await apiFetch(`/api/sub-hubs/${subHubId}/menu/products`, { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Product added" });
      }
      onSaved(); onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#162B4D]">{isEditing ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-1">

          {/* ── BASIC INFO ─────────────────────────────────── */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2 after:flex-1 after:h-px after:bg-gray-100">Basic Info</p>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Product Name *</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken Curry Cut" className="h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Description</Label><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this product..." className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB]/30 outline-none resize-none h-16" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select category..." /></SelectTrigger>
                  <SelectContent>{categories?.map((c: any) => <SelectItem key={String(c._id)} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* ── PRICING ────────────────────────────────────── */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2 after:flex-1 after:h-px after:bg-gray-100">Pricing</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Sale Price (₹) *</Label>
                  <Input required type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Original Price / MRP (₹)</Label>
                  <Input type="number" min="0" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="0" className="h-9" />
                </div>
              </div>
              {discountPct > 0 && (
                <div className="flex items-center gap-2 text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-green-700 font-semibold">Customer saves {discountPct}% — ₹{Number(originalPrice) - Number(price)} off</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Unit</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["per kg", "per 500g", "per 250g", "per 100g", "per tray", "per pack", "per piece"].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Weight / Qty Label</Label><Input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 500 g" className="h-9" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Gross Weight</Label><Input value={grossWeight} onChange={(e) => setGrossWeight(e.target.value)} placeholder="e.g. 550g" className="h-9" /></div>
                <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Net Weight</Label><Input value={netWeight} onChange={(e) => setNetWeight(e.target.value)} placeholder="e.g. 500g" className="h-9" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Pieces</Label><Input value={pieces} onChange={(e) => setPieces(e.target.value)} placeholder="e.g. 8–10 Pieces" className="h-9" /></div>
                <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Serves</Label><Input value={serves} onChange={(e) => setServes(e.target.value)} placeholder="e.g. Serves 4" className="h-9" /></div>
                <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Stock (Qty)</Label><Input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-9" /></div>
              </div>
            </div>
          </section>

          {/* ── STATUS ─────────────────────────────────────── */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2 after:flex-1 after:h-px after:bg-gray-100">Status & Media</p>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Product Image URL</Label><Input value={imageUrl} onChange={(e) => setProductImageUrl(e.target.value)} placeholder="https://..." className="h-9" /></div>
              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Availability</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end pb-0.5">
                  <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 h-9 px-4">
                    <Label className="text-sm text-gray-600">Archived</Label>
                    <Switch checked={isArchived} onCheckedChange={setIsArchived} className="data-[state=checked]:bg-red-500" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── RECIPES ────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recipes ({recipes.length})</p>
              <button
                type="button"
                onClick={() => setRecipes([...recipes, BLANK_RECIPE()])}
                className="text-xs text-[#1A56DB] font-semibold flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3 h-3" /> Add Recipe
              </button>
            </div>
            {recipes.length === 0
              ? <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">No recipes yet. Click "Add Recipe" to include cooking instructions.</div>
              : <div className="space-y-2">{recipes.map((r, i) => (
                  <RecipeEditor
                    key={i}
                    recipe={r}
                    onChange={(updated) => setRecipes(recipes.map((x, idx) => idx === i ? updated : x))}
                    onRemove={() => setRecipes(recipes.filter((_, idx) => idx !== i))}
                  />
                ))}</div>}
          </section>

          <DialogFooter className="pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose} className="h-9">Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4] h-9 px-6">
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Add Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoryModal({ isOpen, onClose, category, subHubId, onSaved }: any) {
  const { toast } = useToast();
  const isEditing = !!category;
  const [name, setName] = useState(""); const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true); const [sortOrder, setSortOrder] = useState("0");
  const [subCatInput, setSubCatInput] = useState(""); const [subCategories, setSubCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (category) { setName(category.name ?? ""); setImageUrl(category.imageUrl ?? ""); setIsActive(category.isActive !== false); setSortOrder(String(category.sortOrder ?? 0)); setSubCategories(Array.isArray(category.subCategories) ? category.subCategories.map((s: any) => s.name ?? s) : []); }
      else { setName(""); setImageUrl(""); setIsActive(true); setSortOrder("0"); setSubCategories([]); }
      setSubCatInput("");
    }
  }, [isOpen, category]);

  const addSubCat = () => { const v = subCatInput.trim(); if (v && !subCategories.includes(v)) setSubCategories([...subCategories, v]); setSubCatInput(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const payload = { name, imageUrl, isActive, sortOrder: Number(sortOrder) || 0, subCategories: subCategories.map((s) => ({ name: s, imageUrl: null })) };
    try {
      if (isEditing) { await apiFetch(`/api/sub-hubs/${subHubId}/menu/categories/${category._id}`, { method: "PUT", body: JSON.stringify(payload) }); toast({ title: "Category updated" }); }
      else { await apiFetch(`/api/sub-hubs/${subHubId}/menu/categories`, { method: "POST", body: JSON.stringify(payload) }); toast({ title: "Category added" }); }
      onSaved(); onClose();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-[#162B4D]">{isEditing ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Category Name *</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fish" className="h-9" /></div>
          <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Image URL</Label><Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="h-9" /></div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-600">Sub-Categories</Label>
            <div className="flex gap-2"><Input value={subCatInput} onChange={(e) => setSubCatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubCat())} placeholder="Type and press Enter or Add" className="h-8 text-sm flex-1" /><Button type="button" onClick={addSubCat} variant="outline" className="h-8 px-3 text-xs">Add</Button></div>
            {subCategories.length > 0 && <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 rounded-lg">{subCategories.map((s) => <span key={s} className="inline-flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-full">{s}<button type="button" onClick={() => setSubCategories(subCategories.filter((x) => x !== s))} className="text-gray-400 hover:text-red-500"><X className="w-2.5 h-2.5" /></button></span>)}</div>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Sort Order</Label><Input type="number" min="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="h-9" /></div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><Label className="text-sm">Active</Label><Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-[#1A56DB]" /></div>
          </div>
          <DialogFooter className="pt-1"><Button type="button" variant="outline" onClick={onClose} className="h-9">Cancel</Button><Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4] h-9">{isEditing ? "Save Changes" : "Add Category"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ComboModal({ isOpen, onClose, combo, subHubId, onSaved }: any) {
  const { toast } = useToast();
  const isEditing = !!combo;
  const [name, setName] = useState(""); const [description, setDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [discountedPrice, setDiscountedPrice] = useState(""); const [originalPrice, setOriginalPrice] = useState("");
  const [serves, setServes] = useState(""); const [weight, setWeight] = useState("");
  const [imageUrl, setImageUrl] = useState(""); const [tagsStr, setTagsStr] = useState("");
  const [isActive, setIsActive] = useState(true); const [sortOrder, setSortOrder] = useState("0");
  const [includesStr, setIncludesStr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (combo) {
        setName(combo.name ?? ""); setDescription(combo.description ?? "");
        setFullDescription(combo.fullDescription ?? "");
        setDiscountedPrice(String(combo.discountedPrice ?? combo.price ?? ""));
        setOriginalPrice(String(combo.originalPrice ?? ""));
        setServes(combo.serves ?? ""); setWeight(combo.weight ?? "");
        setImageUrl(combo.imageUrl ?? (Array.isArray(combo.images) ? combo.images[0] ?? "" : ""));
        setTagsStr(Array.isArray(combo.tags) ? combo.tags.join(", ") : "");
        setIncludesStr(Array.isArray(combo.includes) ? combo.includes.map((i: any) => i.label ?? i).join(", ") : "");
        setIsActive(combo.isActive !== false); setSortOrder(String(combo.sortOrder ?? 0));
      } else {
        setName(""); setDescription(""); setFullDescription(""); setDiscountedPrice(""); setOriginalPrice("");
        setServes(""); setWeight(""); setImageUrl(""); setTagsStr(""); setIncludesStr(""); setIsActive(true); setSortOrder("0");
      }
    }
  }, [isOpen, combo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const dp = Number(discountedPrice) || 0; const op = Number(originalPrice) || 0;
    const includesParsed = includesStr.split(",").map((s) => s.trim()).filter(Boolean).map((label) => ({ label }));
    const payload = {
      name, description, fullDescription, serves, weight,
      discountedPrice: dp, originalPrice: op,
      discount: op > dp ? Math.round(((op - dp) / op) * 100) : 0,
      imageUrl, includes: includesParsed,
      tags: tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
      isActive, sortOrder: Number(sortOrder) || 0,
    };
    try {
      if (isEditing) { await apiFetch(`/api/sub-hubs/${subHubId}/menu/combos/${combo._id}`, { method: "PUT", body: JSON.stringify(payload) }); toast({ title: "Combo updated" }); }
      else { await apiFetch(`/api/sub-hubs/${subHubId}/menu/combos`, { method: "POST", body: JSON.stringify(payload) }); toast({ title: "Combo added" }); }
      onSaved(); onClose();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-[#162B4D]">{isEditing ? "Edit Combo" : "Add Combo"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Combo Name *</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Family Fish Combo" className="h-9" /></div>
          <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Short Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief tagline" className="h-9" /></div>
          <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Full Description</Label><Input value={fullDescription} onChange={(e) => setFullDescription(e.target.value)} placeholder="Detailed description" className="h-9" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Discounted Price (₹) *</Label><Input required type="number" min="0" value={discountedPrice} onChange={(e) => setDiscountedPrice(e.target.value)} placeholder="0" className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Original Price (₹)</Label><Input type="number" min="0" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="0" className="h-9" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Serves</Label><Input value={serves} onChange={(e) => setServes(e.target.value)} placeholder="e.g. 2-3 persons" className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Weight</Label><Input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 500g" className="h-9" /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Image URL</Label><Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="h-9" /></div>
          <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Includes <span className="font-normal text-gray-400">(comma-separated labels)</span></Label><Input value={includesStr} onChange={(e) => setIncludesStr(e.target.value)} placeholder="Rohu Fillet, Prawn Masala, Hilsa" className="h-9" /></div>
          <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Tags <span className="font-normal text-gray-400">(comma-separated)</span></Label><Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="Family Size, Value" className="h-9" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Sort Order</Label><Input type="number" min="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="h-9" /></div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><Label className="text-sm">Active</Label><Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-[#1A56DB]" /></div>
          </div>
          <DialogFooter className="pt-1"><Button type="button" variant="outline" onClick={onClose} className="h-9">Cancel</Button><Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4] h-9">{isEditing ? "Save Changes" : "Add Combo"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CouponModal({ isOpen, onClose, coupon, subHubId, onSaved }: any) {
  const { toast } = useToast();
  const isEditing = !!coupon;
  const [code, setCode] = useState(""); const [title, setTitle] = useState("");
  const [description, setDescription] = useState(""); const [color, setColor] = useState("");
  const [type, setType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState(""); const [minOrderAmount, setMinOrderAmount] = useState("");
  const [maxUsage, setMaxUsage] = useState(""); const [isFirstTimeOnly, setIsFirstTimeOnly] = useState(false);
  const [isActive, setIsActive] = useState(true); const [expiresAt, setExpiresAt] = useState("");
  const [applicableCategoriesStr, setApplicableCategoriesStr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (coupon) {
        setCode(coupon.code ?? ""); setTitle(coupon.title ?? ""); setDescription(coupon.description ?? ""); setColor(coupon.color ?? "");
        setType(coupon.type ?? "percentage"); setDiscountValue(String(coupon.discountValue ?? ""));
        setMinOrderAmount(String(coupon.minOrderAmount ?? "")); setMaxUsage(coupon.maxUsage ? String(coupon.maxUsage) : "");
        setIsFirstTimeOnly(coupon.isFirstTimeOnly === true); setIsActive(coupon.isActive !== false);
        setExpiresAt(coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split("T")[0] : "");
        setApplicableCategoriesStr(Array.isArray(coupon.applicableCategories) ? coupon.applicableCategories.join(", ") : "");
      } else {
        setCode(""); setTitle(""); setDescription(""); setColor(""); setType("percentage");
        setDiscountValue(""); setMinOrderAmount(""); setMaxUsage(""); setIsFirstTimeOnly(false);
        setIsActive(true); setExpiresAt(""); setApplicableCategoriesStr("");
      }
    }
  }, [isOpen, coupon]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const payload: any = {
      code, title, description, color, type,
      discountValue: Number(discountValue) || 0, minOrderAmount: Number(minOrderAmount) || 0,
      applicableCategories: applicableCategoriesStr.split(",").map((s) => s.trim()).filter(Boolean),
      isFirstTimeOnly, isActive,
    };
    if (maxUsage) payload.maxUsage = Number(maxUsage);
    if (expiresAt) payload.expiresAt = expiresAt;
    try {
      if (isEditing) { await apiFetch(`/api/sub-hubs/${subHubId}/menu/coupons/${coupon._id}`, { method: "PUT", body: JSON.stringify(payload) }); toast({ title: "Coupon updated" }); }
      else { await apiFetch(`/api/sub-hubs/${subHubId}/menu/coupons`, { method: "POST", body: JSON.stringify(payload) }); toast({ title: "Coupon added" }); }
      onSaved(); onClose();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-[#162B4D]">{isEditing ? "Edit Coupon" : "Add Coupon"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Coupon Code *</Label><Input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. FISH10" className="h-9 font-mono" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Display Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekend Deal" className="h-9" /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short coupon description" className="h-9" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Discount Type</Label><Select value={type} onValueChange={setType}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="flat">Flat (₹)</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Discount Value *</Label><Input required type="number" min="0" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={type === "percentage" ? "10" : "50"} className="h-9" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Min Order (₹)</Label><Input type="number" min="0" value={minOrderAmount} onChange={(e) => setMinOrderAmount(e.target.value)} placeholder="0" className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Max Usage</Label><Input type="number" min="0" value={maxUsage} onChange={(e) => setMaxUsage(e.target.value)} placeholder="Unlimited" className="h-9" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Color Class</Label><Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. bg-orange-400" className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Expiry Date</Label><Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="h-9" /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Applicable Categories <span className="font-normal text-gray-400">(comma-separated IDs)</span></Label><Input value={applicableCategoriesStr} onChange={(e) => setApplicableCategoriesStr(e.target.value)} placeholder="Leave empty for all categories" className="h-9" /></div>
          <div className="flex gap-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg flex-1"><Label className="text-sm">First Time Only</Label><Switch checked={isFirstTimeOnly} onCheckedChange={setIsFirstTimeOnly} className="data-[state=checked]:bg-[#1A56DB]" /></div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg flex-1"><Label className="text-sm">Active</Label><Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-[#1A56DB]" /></div>
          </div>
          <DialogFooter className="pt-1"><Button type="button" variant="outline" onClick={onClose} className="h-9">Cancel</Button><Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4] h-9">{isEditing ? "Save Changes" : "Add Coupon"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CarouselModal({ isOpen, onClose, carousel, subHubId, onSaved }: any) {
  const { toast } = useToast();
  const isEditing = !!carousel;
  const [imageUrl, setImageUrl] = useState(""); const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState(""); const [order, setOrder] = useState("0");
  const [isActive, setIsActive] = useState(true); const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (carousel) { setImageUrl(carousel.imageUrl ?? ""); setTitle(carousel.title ?? ""); setLinkUrl(carousel.linkUrl ?? ""); setOrder(String(carousel.order ?? 0)); setIsActive(carousel.isActive !== false); }
      else { setImageUrl(""); setTitle(""); setLinkUrl(""); setOrder("0"); setIsActive(true); }
    }
  }, [isOpen, carousel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const payload = { imageUrl, title: title || null, linkUrl: linkUrl || null, order: Number(order) || 0, isActive };
    try {
      if (isEditing) { await apiFetch(`/api/sub-hubs/${subHubId}/menu/carousels/${carousel._id}`, { method: "PUT", body: JSON.stringify(payload) }); toast({ title: "Banner updated" }); }
      else { await apiFetch(`/api/sub-hubs/${subHubId}/menu/carousels`, { method: "POST", body: JSON.stringify(payload) }); toast({ title: "Banner added" }); }
      onSaved(); onClose();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader><DialogTitle className="text-[#162B4D]">{isEditing ? "Edit Banner" : "Add Banner"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Image URL *</Label><Input required value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="h-9" />{imageUrl && <img src={imageUrl} alt="Preview" className="w-full h-24 object-cover rounded-lg border border-gray-100 mt-1" onError={(e) => { (e.target as any).style.display = "none"; }} />}</div>
          <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional title" className="h-9" /></div>
          <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Link URL</Label><Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://... (optional)" className="h-9" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Display Order</Label><Input type="number" min="0" value={order} onChange={(e) => setOrder(e.target.value)} className="h-9" /></div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><Label className="text-sm">Active</Label><Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-[#1A56DB]" /></div>
          </div>
          <DialogFooter className="pt-1"><Button type="button" variant="outline" onClick={onClose} className="h-9">Cancel</Button><Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4] h-9">{isEditing ? "Save Changes" : "Add Banner"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionModal({ isOpen, onClose, section, subHubId, onSaved }: any) {
  const { toast } = useToast();
  const isEditing = !!section;
  const [title, setTitle] = useState(""); const [type, setType] = useState("products");
  const [sortOrder, setSortOrder] = useState("0"); const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (section) { setTitle(section.title ?? ""); setType(section.type ?? "products"); setSortOrder(String(section.sortOrder ?? 0)); setIsActive(section.isActive !== false); }
      else { setTitle(""); setType("products"); setSortOrder("0"); setIsActive(true); }
    }
  }, [isOpen, section]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const payload = { title, type, sortOrder: Number(sortOrder) || 0, isActive };
    try {
      if (isEditing) { await apiFetch(`/api/sub-hubs/${subHubId}/menu/sections/${section._id}`, { method: "PUT", body: JSON.stringify(payload) }); toast({ title: "Section updated" }); }
      else { await apiFetch(`/api/sub-hubs/${subHubId}/menu/sections`, { method: "POST", body: JSON.stringify(payload) }); toast({ title: "Section added" }); }
      onSaved(); onClose();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader><DialogTitle className="text-[#162B4D]">{isEditing ? "Edit Section" : "Add Section"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Section Title *</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Today's Special" className="h-9" /></div>
          <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Content Type</Label><Select value={type} onValueChange={setType}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="products">Products</SelectItem><SelectItem value="combos">Combos</SelectItem><SelectItem value="categories">Categories</SelectItem><SelectItem value="carousels">Carousels</SelectItem></SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Sort Order</Label><Input type="number" min="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="h-9" /></div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><Label className="text-sm">Active</Label><Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-[#1A56DB]" /></div>
          </div>
          <DialogFooter className="pt-1"><Button type="button" variant="outline" onClick={onClose} className="h-9">Cancel</Button><Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4] h-9">{isEditing ? "Save Changes" : "Add Section"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PincodeModal({ isOpen, onClose, pincode, subHubId, onSaved }: any) {
  const { toast } = useToast();
  const isEditing = !!pincode;
  const [code, setCode] = useState(""); const [area, setArea] = useState("");
  const [city, setCity] = useState("Thane"); const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (pincode) { setCode(pincode.pincode ?? ""); setArea(pincode.area ?? ""); setCity(pincode.city ?? ""); setIsActive(pincode.isActive !== false); }
      else { setCode(""); setArea(""); setCity("Thane"); setIsActive(true); }
    }
  }, [isOpen, pincode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const payload = { pincode: code, area, city, isActive };
    try {
      if (isEditing) { await apiFetch(`/api/sub-hubs/${subHubId}/menu/pincodes/${pincode._id}`, { method: "PUT", body: JSON.stringify(payload) }); toast({ title: "Pincode updated" }); }
      else { await apiFetch(`/api/sub-hubs/${subHubId}/menu/pincodes`, { method: "POST", body: JSON.stringify(payload) }); toast({ title: "Pincode added" }); }
      onSaved(); onClose();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader><DialogTitle className="text-[#162B4D]">{isEditing ? "Edit Pincode" : "Add Pincode"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Pincode *</Label><Input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 400601" maxLength={6} className="h-9 font-mono" /></div>
          <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Area</Label><Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Thane West" className="h-9" /></div>
          <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Thane" className="h-9" /></div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><Label className="text-sm">Active</Label><Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-[#1A56DB]" /></div>
          <DialogFooter className="pt-1"><Button type="button" variant="outline" onClick={onClose} className="h-9">Cancel</Button><Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4] h-9">{isEditing ? "Save Changes" : "Add Pincode"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── TIME SLOTS TAB ────────────────────────────────────────────────────────────
function TimeSlotsTab({ subHubId }: { subHubId: string }) {
  const [timeslots, setTimeslots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/sub-hubs/${subHubId}/menu/timeslots`);
      setTimeslots(data.timeslots ?? []);
    } catch { setTimeslots([]); } finally { setLoading(false); }
  }, [subHubId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/sub-hubs/${subHubId}/menu/timeslots/${deleteId}`, { method: "DELETE" });
      toast({ title: "Time slot deleted" });
      load();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setDeleteId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[#162B4D]">Time Slots <span className="text-gray-400 font-normal text-sm">({timeslots.length})</span></h3>
        <Button size="sm" className="bg-[#1A56DB] hover:bg-[#1447B4] h-8 gap-1.5" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="w-3.5 h-3.5" /> Add Slot
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : timeslots.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-gray-200 rounded-xl">
          <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No time slots yet.</p>
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="mt-2 text-sm text-[#1A56DB] font-semibold hover:underline">Add your first slot</button>
        </div>
      ) : (
        <div className="space-y-2">
          {timeslots.map((s) => (
            <div key={String(s._id)} className="flex items-center gap-4 p-3.5 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-cyan-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-[#162B4D] text-sm">{s.label}</p>
                  {s.isInstant && <span className="text-[10px] bg-orange-50 text-orange-600 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Instant</span>}
                  <StatusBadge active={s.isActive !== false} />
                </div>
                <p className="text-xs text-gray-400">{s.startTime} – {s.endTime}{s.extraCharge > 0 ? ` · +₹${s.extraCharge}` : ""}</p>
              </div>
              <ActionButtons onEdit={() => { setEditing(s); setModalOpen(true); }} onDelete={() => setDeleteId(String(s._id))} />
            </div>
          ))}
        </div>
      )}

      <TimeslotModal isOpen={modalOpen} onClose={() => setModalOpen(false)} timeslot={editing} subHubId={subHubId} onSaved={load} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Slot?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TimeslotModal({ isOpen, onClose, timeslot, subHubId, onSaved }: any) {
  const { toast } = useToast();
  const isEditing = !!timeslot;
  const [label, setLabel] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isInstant, setIsInstant] = useState(false);
  const [extraCharge, setExtraCharge] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (timeslot) {
        setLabel(timeslot.label ?? ""); setStartTime(timeslot.startTime ?? ""); setEndTime(timeslot.endTime ?? "");
        setIsInstant(timeslot.isInstant === true); setExtraCharge(String(timeslot.extraCharge ?? 0));
        setIsActive(timeslot.isActive !== false); setSortOrder(String(timeslot.sortOrder ?? 0));
      } else {
        setLabel(""); setStartTime(""); setEndTime(""); setIsInstant(false); setExtraCharge("0"); setIsActive(true); setSortOrder("0");
      }
    }
  }, [isOpen, timeslot]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const payload = { label, startTime, endTime, isInstant, extraCharge: Number(extraCharge) || 0, isActive, sortOrder: Number(sortOrder) || 0 };
    try {
      if (isEditing) { await apiFetch(`/api/sub-hubs/${subHubId}/menu/timeslots/${timeslot._id}`, { method: "PUT", body: JSON.stringify(payload) }); toast({ title: "Time slot updated" }); }
      else { await apiFetch(`/api/sub-hubs/${subHubId}/menu/timeslots`, { method: "POST", body: JSON.stringify(payload) }); toast({ title: "Time slot added" }); }
      onSaved(); onClose();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle className="text-[#162B4D]">{isEditing ? "Edit Time Slot" : "Add Time Slot"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Label *</Label><Input required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Morning Delivery" className="h-9" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Start Time *</Label><Input required type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">End Time *</Label><Input required type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-9" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Extra Charge (₹)</Label><Input type="number" min="0" value={extraCharge} onChange={(e) => setExtraCharge(e.target.value)} className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-600">Sort Order</Label><Input type="number" min="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="h-9" /></div>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg flex-1"><Label className="text-sm">Instant Delivery</Label><Switch checked={isInstant} onCheckedChange={setIsInstant} className="data-[state=checked]:bg-orange-500" /></div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg flex-1"><Label className="text-sm">Active</Label><Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-[#1A56DB]" /></div>
          </div>
          <DialogFooter className="pt-1"><Button type="button" variant="outline" onClick={onClose} className="h-9">Cancel</Button><Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4] h-9">{isEditing ? "Save Changes" : "Add Slot"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
