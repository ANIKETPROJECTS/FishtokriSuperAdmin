import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Boxes, CheckCircle2, FolderPlus, Pencil, Plus, Search, SlidersHorizontal, Store, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type VendorCategory = {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  linkedSubHubCategoryName?: string;
  linkedSubHubCategoryNames?: string[];
  linkedProductCount?: number;
  subHubs?: string[];
  subHubCount?: number;
};

type SubHubCategory = {
  name: string;
  subHubs: string[];
  subHubCount: number;
  productCount: number;
};

type VendorItem = {
  id: string;
  name: string;
  itemCode: string;
  itemType: string;
  categoryId: string;
  categoryName: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  openingStock: number;
  currentStock: number;
  description: string;
  status: "active" | "inactive";
  notes: string;
};

type HubEntry = {
  subHubId: string;
  subHubName: string;
  dbName: string;
  productId: string;
  quantity: number;
  price: number;
  unit: string;
  status: string;
};

type HubProduct = {
  name: string;
  category: string;
  totalQuantity: number;
  hubs: HubEntry[];
};

type DisplayItem =
  | { source: "master"; item: VendorItem }
  | { source: "hub"; product: HubProduct; vendorCategory: VendorCategory };

const units = ["kg", "g", "pcs", "box", "tray", "crate", "litre", "pack", "bag", "unt", "pac", "per kg", "per pcs"];
const itemTypes = ["Raw Material", "Fish", "Mutton", "Packaging", "Equipment", "Cleaning", "Consumable", "Other"];

function getToken() {
  return localStorage.getItem("fishtokri_token") ?? "";
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? "Request failed");
  return data;
}

function formatRupees(value: number) {
  return Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getDisplayName(d: DisplayItem) {
  return d.source === "master" ? d.item.name : d.product.name;
}

function getDisplayCategory(d: DisplayItem) {
  return d.source === "master" ? d.item.categoryName : d.vendorCategory.name;
}

function getLinkedSubHubCategoryNames(category: Pick<VendorCategory, "linkedSubHubCategoryName" | "linkedSubHubCategoryNames">) {
  const names = category.linkedSubHubCategoryNames?.length
    ? category.linkedSubHubCategoryNames
    : category.linkedSubHubCategoryName
      ? [category.linkedSubHubCategoryName]
      : [];
  return Array.from(new Set(names.map((name) => String(name).trim()).filter(Boolean)));
}

function formatLinkedSubHubCategoryNames(category: Pick<VendorCategory, "linkedSubHubCategoryName" | "linkedSubHubCategoryNames">) {
  const names = getLinkedSubHubCategoryNames(category);
  if (names.length === 0) return "";
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

export default function VendorItems() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [subHubCategories, setSubHubCategories] = useState<SubHubCategory[]>([]);
  const [masterItems, setMasterItems] = useState<VendorItem[]>([]);
  const [hubProducts, setHubProducts] = useState<HubProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "master" | "hub">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "code" | "stock" | "purchase" | "selling">("name");
  const [loading, setLoading] = useState(true);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [hubModalOpen, setHubModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<VendorCategory | null>(null);
  const [editingItem, setEditingItem] = useState<VendorItem | null>(null);
  const [editingHubProduct, setEditingHubProduct] = useState<HubProduct | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [catData, itemData, hubData, subHubCategoryData] = await Promise.all([
        apiFetch("/api/vendor-items/categories"),
        apiFetch("/api/vendor-items/items"),
        apiFetch("/api/vendor-items/hub-products"),
        apiFetch("/api/vendor-items/sub-hub-categories"),
      ]);
      setCategories(catData.categories ?? []);
      setSubHubCategories(subHubCategoryData.categories ?? []);
      setMasterItems((itemData.items ?? []).map((item: Partial<VendorItem>) => ({
        id: item.id ?? "",
        name: item.name ?? "",
        itemCode: item.itemCode ?? "",
        itemType: item.itemType ?? "Raw Material",
        categoryId: item.categoryId ?? "",
        categoryName: item.categoryName ?? "",
        unit: item.unit ?? "kg",
        purchasePrice: Number(item.purchasePrice) || 0,
        sellingPrice: Number(item.sellingPrice) || 0,
        openingStock: Number(item.openingStock) || 0,
        currentStock: Number(item.currentStock) || 0,
        description: item.description ?? "",
        status: item.status ?? "active",
        notes: item.notes ?? "",
      })));
      setHubProducts(hubData.products ?? []);
    } catch (err: any) {
      toast({ title: "Could not load vendor items", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const linkedCategoryIds = useMemo(() => new Set(categories.filter((c) => getLinkedSubHubCategoryNames(c).length > 0).map((c) => c.id)), [categories]);
  const vendorOnlyCategories = useMemo(() => categories.filter((c) => getLinkedSubHubCategoryNames(c).length === 0), [categories]);
  const selectedCategoryInfo = useMemo(() => categories.find((c) => c.id === selectedCategory), [categories, selectedCategory]);
  const selectedCategoryIsLinked = Boolean(selectedCategoryInfo && getLinkedSubHubCategoryNames(selectedCategoryInfo).length > 0);

  const allDisplayItems: DisplayItem[] = useMemo(() => {
    const linkedBySubHubCategory = new Map<string, VendorCategory[]>();
    for (const category of categories) {
      for (const name of getLinkedSubHubCategoryNames(category)) {
        const key = name.toLowerCase();
        linkedBySubHubCategory.set(key, [...(linkedBySubHubCategory.get(key) ?? []), category]);
      }
    }
    const result: DisplayItem[] = masterItems
      .filter((item) => !linkedCategoryIds.has(item.categoryId))
      .map((item) => ({ source: "master", item }));
    for (const p of hubProducts) {
      const vendorCategories = linkedBySubHubCategory.get(String(p.category ?? "").trim().toLowerCase()) ?? [];
      for (const vendorCategory of vendorCategories) {
        result.push({ source: "hub", product: p, vendorCategory });
      }
    }
    return result;
  }, [masterItems, hubProducts, categories, linkedCategoryIds]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = allDisplayItems.filter((d) => {
      if (sourceFilter !== "all" && d.source !== sourceFilter) return false;
      const name = getDisplayName(d).toLowerCase();
      const cat = getDisplayCategory(d).toLowerCase();
      if (q && !name.includes(q) && !cat.includes(q)) {
        if (d.source === "master") {
          const item = d.item;
          if (![item.itemCode, item.itemType, item.description, item.notes].some((v) => v.toLowerCase().includes(q))) return false;
        } else {
          return false;
        }
      }
      if (selectedCategory !== "all") {
        if (selectedCategoryIsLinked) return d.source === "hub" && d.vendorCategory.id === selectedCategory;
        return d.source === "master" && d.item.categoryId === selectedCategory;
      }
      if (selectedType !== "all" && d.source === "master" && d.item.itemType !== selectedType) return false;
      return true;
    });
    return [...result].sort((a, b) => {
      if (sortBy === "stock") {
        const sa = a.source === "master" ? a.item.currentStock : a.product.totalQuantity;
        const sb = b.source === "master" ? b.item.currentStock : b.product.totalQuantity;
        return sb - sa;
      }
      if (sortBy === "purchase" && a.source === "master" && b.source === "master") return b.item.purchasePrice - a.item.purchasePrice;
      if (sortBy === "selling") {
        const pa = a.source === "master" ? a.item.sellingPrice : (a.product.hubs[0]?.price ?? 0);
        const pb = b.source === "master" ? b.item.sellingPrice : (b.product.hubs[0]?.price ?? 0);
        return pb - pa;
      }
      return getDisplayName(a).localeCompare(getDisplayName(b));
    });
  }, [allDisplayItems, selectedCategory, selectedCategoryIsLinked, selectedType, sourceFilter, search, sortBy]);

  const activeItems = masterItems.filter((i) => i.status === "active").length;
  const groupedCount = vendorOnlyCategories.filter((c) => masterItems.some((i) => i.categoryId === c.id)).length;
  const linkedCount = categories.filter((c) => getLinkedSubHubCategoryNames(c).length > 0).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#162B4D]">Vendor Items</h1>
          <p className="text-sm text-gray-500 mt-1">Vendor-only categories use item columns. Linked categories show matching products from one or more sub-hub categories.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setEditingCategory(null); setCategoryModalOpen(true); }} className="gap-2">
            <FolderPlus className="w-4 h-4" /> Add Category
          </Button>
          <Button onClick={() => { setEditingItem(null); setItemModalOpen(true); }} className="gap-2 bg-[#1A56DB] hover:bg-[#1447B4]" disabled={vendorOnlyCategories.length === 0 || selectedCategoryIsLinked}>
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Categories" value={categories.length} helper={`${linkedCount} linked, ${groupedCount} vendor-only with items`} />
        <SummaryCard label="Vendor Items" value={masterItems.length} helper={`${activeItems} active`} />
        <SummaryCard label="Linked Products" value={allDisplayItems.filter((d) => d.source === "hub").length} helper="From linked sub-hub categories" />
        <SummaryCard label="In View" value={filteredItems.length} helper="Shown in current view" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-col xl:flex-row xl:items-center gap-3 justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <div>
              <h2 className="font-bold text-[#162B4D] leading-none">Items</h2>
              <p className="text-xs text-gray-500 mt-1">{allDisplayItems.length} total</p>
            </div>
            <Button size="sm" variant={selectedCategory === "all" ? "default" : "outline"} onClick={() => setSelectedCategory("all")} className={selectedCategory === "all" ? "bg-[#162B4D] hover:bg-[#1e3a6e]" : ""}>
              All Items
            </Button>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-9 w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{getLinkedSubHubCategoryNames(c).length > 0 ? ` → ${formatLinkedSubHubCategoryNames(c)}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="pl-9 h-9 w-48" />
            </div>
            <Select value={sourceFilter} onValueChange={(v: any) => setSourceFilter(v)}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="master">Vendor Items</SelectItem>
                <SelectItem value="hub">Hub Products</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-9 w-36">
                <Boxes className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Item Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Item Type</SelectItem>
                {itemTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="h-9 w-36">
                <SlidersHorizontal className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="code">Code A-Z</SelectItem>
                <SelectItem value="stock">Stock High</SelectItem>
                <SelectItem value="purchase">Purchase High</SelectItem>
                <SelectItem value="selling">Sale High</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => { setEditingItem(null); setItemModalOpen(true); }} disabled={vendorOnlyCategories.length === 0 || selectedCategoryIsLinked} className="h-9 gap-2 bg-[#1A56DB] hover:bg-[#1447B4]">
              Add Item
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className={`w-full ${selectedCategoryIsLinked ? "min-w-[850px]" : "min-w-[1100px]"} text-sm`}>
            <thead>
              <tr className="bg-gray-50 text-left border-b border-gray-100">
                {selectedCategoryIsLinked ? (
                  <>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sub-Hub Category</th>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Sale Price</th>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Stock</th>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Hubs</th>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Actions</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Purchase</th>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Sale</th>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Stock</th>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Hubs</th>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.map((d, idx) => {
                if (selectedCategoryIsLinked && d.source === "hub") {
                  const p = d.product;
                  const avgPrice = p.hubs.length > 0 ? p.hubs.reduce((s, h) => s + h.price, 0) / p.hubs.length : 0;
                  const primaryUnit = p.hubs[0]?.unit ?? "kg";
                  const allActive = p.hubs.every((h) => h.status !== "inactive");
                  return (
                    <tr key={`linked:${p.name}:${idx}`} className="hover:bg-blue-50/30 transition-colors bg-blue-50/10">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${allActive ? "bg-emerald-500" : "bg-amber-500"}`} />
                          <p className="font-medium text-gray-800 truncate">{p.name}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-600">{p.category || "—"}</td>
                      <td className="px-3 py-3 text-right"><span className="inline-flex justify-end min-w-16 rounded-md border border-gray-200 px-2 py-0.5 text-gray-700 bg-white text-xs">{formatRupees(avgPrice)}</span></td>
                      <td className="px-3 py-3 text-right text-gray-700">{p.totalQuantity} <span className="text-xs text-gray-400">{primaryUnit}</span></td>
                      <td className="px-3 py-3">
                        <button onClick={() => { setEditingHubProduct(p); setHubModalOpen(true); }} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors" title={p.hubs.map((h) => h.subHubName).join(", ")}>
                          <Store className="w-3 h-3" /> {p.hubs.length} hub{p.hubs.length !== 1 ? "s" : ""}
                        </button>
                      </td>
                      <td className="px-3 py-3"><span className={`inline-flex items-center gap-1 text-xs font-semibold ${allActive ? "text-emerald-700" : "text-amber-600"}`}><CheckCircle2 className="w-3 h-3" /> {allActive ? "Active" : "Partial"}</span></td>
                      <td className="px-3 py-3"><Button size="sm" variant="outline" onClick={() => { setEditingHubProduct(p); setHubModalOpen(true); }} className="h-8 w-8 p-0"><Pencil className="w-3.5 h-3.5" /></Button></td>
                    </tr>
                  );
                }
                if (d.source === "master") {
                  const item = d.item;
                  const hubProduct = hubProducts.find((p) => p.name.toLowerCase() === item.name.toLowerCase());
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.status === "active" ? "bg-emerald-500" : "bg-red-500"}`} />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">{item.name}</p>
                            {item.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{item.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-600 font-mono text-xs">{item.itemCode || "—"}</td>
                      <td className="px-3 py-3 text-gray-600">{item.itemType || "—"}</td>
                      <td className="px-3 py-3 text-gray-600">{item.categoryName || "—"}</td>
                      <td className="px-3 py-3 text-right text-gray-700">{formatRupees(item.purchasePrice)}</td>
                      <td className="px-3 py-3 text-right">
                        <span className="inline-flex justify-end min-w-16 rounded-md border border-gray-200 px-2 py-0.5 text-gray-700 bg-white text-xs">{formatRupees(item.sellingPrice)}</span>
                      </td>
                      <td className="px-3 py-3 text-right text-gray-700">{item.currentStock} <span className="text-xs text-gray-400 uppercase">{item.unit}</span></td>
                      <td className="px-3 py-3">
                        {hubProduct ? (
                          <button
                            onClick={() => { setEditingHubProduct(hubProduct); setHubModalOpen(true); }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors"
                            title={hubProduct.hubs.map((h) => h.subHubName).join(", ")}
                          >
                            <Store className="w-3 h-3" />
                            {hubProduct.hubs.length} hub{hubProduct.hubs.length !== 1 ? "s" : ""}
                          </button>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${item.status === "active" ? "text-emerald-700" : "text-red-600"}`}>
                          <CheckCircle2 className="w-3 h-3" /> {item.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => { setEditingItem(item); setItemModalOpen(true); }} className="h-8 w-8 p-0">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => deleteItem(item)} className="h-8 w-8 p-0 text-gray-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                } else {
                  const p = d.product;
                  const avgPrice = p.hubs.length > 0 ? p.hubs.reduce((s, h) => s + h.price, 0) / p.hubs.length : 0;
                  const primaryUnit = p.hubs[0]?.unit ?? "kg";
                  const allActive = p.hubs.every((h) => h.status !== "inactive");
                  return (
                    <tr key={`hub:${p.name}:${idx}`} className="hover:bg-blue-50/30 transition-colors bg-blue-50/10">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${allActive ? "bg-emerald-500" : "bg-amber-500"}`} />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">{p.name}</p>
                            <span className="text-[10px] font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">Hub Product</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-400 text-xs">—</td>
                      <td className="px-3 py-3 text-gray-400 text-xs">—</td>
                      <td className="px-3 py-3 text-gray-600">{p.category || "—"}</td>
                      <td className="px-3 py-3 text-right text-gray-400">—</td>
                      <td className="px-3 py-3 text-right">
                        <span className="inline-flex justify-end min-w-16 rounded-md border border-gray-200 px-2 py-0.5 text-gray-700 bg-white text-xs">{formatRupees(avgPrice)}</span>
                      </td>
                      <td className="px-3 py-3 text-right text-gray-700">{p.totalQuantity} <span className="text-xs text-gray-400">{primaryUnit}</span></td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => { setEditingHubProduct(p); setHubModalOpen(true); }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors"
                          title={p.hubs.map((h) => h.subHubName).join(", ")}
                        >
                          <Store className="w-3 h-3" />
                          {p.hubs.length} hub{p.hubs.length !== 1 ? "s" : ""}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${allActive ? "text-emerald-700" : "text-amber-600"}`}>
                          <CheckCircle2 className="w-3 h-3" /> {allActive ? "Active" : "Partial"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Button size="sm" variant="outline" onClick={() => { setEditingHubProduct(p); setHubModalOpen(true); }} className="h-8 w-8 p-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
          {!loading && filteredItems.length === 0 && (
            <div className="text-center py-16">
              <Boxes className="w-10 h-10 mx-auto text-gray-300" />
              <p className="text-sm font-semibold text-gray-500 mt-3">No items found</p>
              <p className="text-xs text-gray-400 mt-1">Add vendor items or check sub hub menus for products.</p>
            </div>
          )}
          {loading && <div className="text-center py-16 text-sm text-gray-400">Loading items...</div>}
        </div>

        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" /> Active</span>
            <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1" /> Inactive</span>
            <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-1" /> Hub Product</span>
          </div>
          <span>Showing {filteredItems.length} of {allDisplayItems.length} items</span>
        </div>
      </div>

      <CategoryModal
        open={categoryModalOpen}
        category={editingCategory}
        subHubCategories={subHubCategories}
        onClose={() => setCategoryModalOpen(false)}
        onSaved={() => { setCategoryModalOpen(false); setEditingCategory(null); load(); }}
      />
      <ItemModal
        open={itemModalOpen}
        item={editingItem}
        categories={vendorOnlyCategories}
        defaultCategoryId={selectedCategory === "all" || selectedCategoryIsLinked ? vendorOnlyCategories[0]?.id ?? "" : selectedCategory}
        onClose={() => setItemModalOpen(false)}
        onSaved={() => { setItemModalOpen(false); setEditingItem(null); load(); }}
      />
      <HubProductModal
        open={hubModalOpen}
        product={editingHubProduct}
        onClose={() => { setHubModalOpen(false); setEditingHubProduct(null); }}
        onSaved={() => { setHubModalOpen(false); setEditingHubProduct(null); load(); }}
      />
    </div>
  );

  async function deleteItem(item: VendorItem) {
    if (!confirm(`Delete item "${item.name}"?`)) return;
    try {
      await apiFetch(`/api/vendor-items/items/${item.id}`, { method: "DELETE" });
      toast({ title: "Item deleted" });
      load();
    } catch (err: any) {
      toast({ title: "Could not delete item", description: err.message, variant: "destructive" });
    }
  }
}

function SummaryCard({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-[#162B4D] mt-2">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{helper}</p>
    </div>
  );
}

function HubProductModal({ open, product, onClose, onSaved }: {
  open: boolean;
  product: HubProduct | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [hubEdits, setHubEdits] = useState<Record<string, { quantity: string; price: string; unit: string }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !product) return;
    const edits: Record<string, { quantity: string; price: string; unit: string }> = {};
    for (const h of product.hubs) {
      edits[`${h.subHubId}:${h.productId}`] = {
        quantity: String(h.quantity),
        price: String(h.price),
        unit: h.unit,
      };
    }
    setHubEdits(edits);
  }, [open, product]);

  const updateEdit = (key: string, field: "quantity" | "price" | "unit", value: string) => {
    setHubEdits((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setSaving(true);
    try {
      await Promise.all(
        product.hubs.map(async (h) => {
          const key = `${h.subHubId}:${h.productId}`;
          const edit = hubEdits[key];
          if (!edit) return;
          await apiFetch(`/api/vendor-items/hub-products/${h.subHubId}/${h.productId}`, {
            method: "PUT",
            body: JSON.stringify({
              quantity: Number(edit.quantity) || 0,
              price: Number(edit.price) || 0,
              unit: edit.unit,
            }),
          });
        })
      );
      toast({ title: "Hub product updated", description: `Updated ${product.name} across ${product.hubs.length} hub(s)` });
      onSaved();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Hub Product — {product.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="text-sm text-gray-500">
            Manage stock quantity and price for <span className="font-semibold text-[#162B4D]">{product.name}</span> across {product.hubs.length} sub hub{product.hubs.length !== 1 ? "s" : ""}.
            {product.category && <span> Category: <span className="font-medium text-gray-700">{product.category}</span></span>}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">
              <span>Sub Hub</span>
              <span>Quantity / Stock</span>
              <span>Price (₹)</span>
              <span>Unit</span>
            </div>
            {product.hubs.map((h) => {
              const key = `${h.subHubId}:${h.productId}`;
              const edit = hubEdits[key] ?? { quantity: String(h.quantity), price: String(h.price), unit: h.unit };
              return (
                <div key={key} className="grid grid-cols-4 gap-2 items-center bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Store className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 truncate">{h.subHubName}</span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={edit.quantity}
                    onChange={(e) => updateEdit(key, "quantity", e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={edit.price}
                    onChange={(e) => updateEdit(key, "price", e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Select value={edit.unit} onValueChange={(v) => updateEdit(key, "unit", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>

          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
            Total stock across all hubs: <span className="font-bold">{product.hubs.reduce((s, h) => {
              const key = `${h.subHubId}:${h.productId}`;
              return s + (Number(hubEdits[key]?.quantity) || 0);
            }, 0)}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4]">
              {saving ? "Saving..." : "Update All Hubs"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoryModal({ open, category, subHubCategories, onClose, onSaved }: { open: boolean; category: VendorCategory | null; subHubCategories: SubHubCategory[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [linkedSubHubCategoryNames, setLinkedSubHubCategoryNames] = useState<string[]>([]);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setLinkedSubHubCategoryNames(category ? getLinkedSubHubCategoryNames(category) : []);
    setStatus(category?.status ?? "active");
  }, [open, category]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name, description, linkedSubHubCategoryNames, status };
      if (category) {
        await apiFetch(`/api/vendor-items/categories/${category.id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast({ title: "Category updated" });
      } else {
        await apiFetch("/api/vendor-items/categories", { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Category added" });
      }
      onSaved();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Edit Vendor Item Category" : "Add Vendor Item Category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Category Name *</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Raw Chicken, Whole Fish, Packaging" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1A56DB]" rows={3} placeholder="What type of vendor items belong here?" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Link to Sub-Hub Categories</Label>
              {linkedSubHubCategoryNames.length > 0 && (
                <button type="button" onClick={() => setLinkedSubHubCategoryNames([])} className="text-xs text-gray-400 hover:text-gray-700">Clear all</button>
              )}
            </div>
            <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 bg-white">
              {subHubCategories.length === 0 ? (
                <p className="px-3 py-3 text-xs text-gray-400">No sub-hub categories found.</p>
              ) : subHubCategories.map((cat) => {
                const checked = linkedSubHubCategoryNames.includes(cat.name);
                return (
                  <label key={cat.name} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setLinkedSubHubCategoryNames((current) => event.target.checked
                          ? Array.from(new Set([...current, cat.name]))
                          : current.filter((name) => name !== cat.name)
                        );
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="flex-1 text-gray-700">{cat.name}</span>
                    <span className="text-xs text-gray-400">{cat.subHubCount} hub{cat.subHubCount !== 1 ? "s" : ""}, {cat.productCount} products</span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-gray-400">Linked categories show matching sub-hub products. Unlinked categories keep normal vendor item columns.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(value: "active" | "inactive") => setStatus(value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4]">{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ItemModal({ open, item, categories, defaultCategoryId, onClose, onSaved }: { open: boolean; item: VendorItem | null; categories: VendorCategory[]; defaultCategoryId: string; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [itemType, setItemType] = useState("Raw Material");
  const [categoryId, setCategoryId] = useState("");
  const [unit, setUnit] = useState("kg");
  const [purchasePrice, setPurchasePrice] = useState("0");
  const [sellingPrice, setSellingPrice] = useState("0");
  const [openingStock, setOpeningStock] = useState("0");
  const [currentStock, setCurrentStock] = useState("0");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? "");
    setItemCode(item?.itemCode ?? "");
    setItemType(item?.itemType ?? "Raw Material");
    setCategoryId(item?.categoryId ?? defaultCategoryId);
    setUnit(item?.unit ?? "kg");
    setPurchasePrice(String(item?.purchasePrice ?? 0));
    setSellingPrice(String(item?.sellingPrice ?? 0));
    setOpeningStock(String(item?.openingStock ?? 0));
    setCurrentStock(String(item?.currentStock ?? item?.openingStock ?? 0));
    setDescription(item?.description ?? "");
    setStatus(item?.status ?? "active");
    setNotes(item?.notes ?? "");
  }, [open, item, defaultCategoryId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name, itemCode, itemType, categoryId, unit, purchasePrice, sellingPrice, openingStock, currentStock, description, status, notes };
      if (item) {
        await apiFetch(`/api/vendor-items/items/${item.id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast({ title: "Item updated" });
      } else {
        await apiFetch("/api/vendor-items/items", { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Item added" });
      }
      onSaved();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Vendor Item" : "Add Vendor Item"}</DialogTitle>
        </DialogHeader>
        {categories.length === 0 ? (
          <div className="text-center py-8">
            <X className="w-8 h-8 mx-auto text-gray-300" />
            <p className="text-sm font-semibold text-gray-600 mt-3">Add a category first</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Item Name *</Label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Crab Female, Plastic Bags" />
              </div>
              <div className="space-y-1.5">
                <Label>Item Code / SKU</Label>
                <Input value={itemCode} onChange={(e) => setItemCode(e.target.value)} placeholder="e.g. GMCC500" />
              </div>
              <div className="space-y-1.5">
                <Label>Item Type</Label>
                <Select value={itemType} onValueChange={setItemType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {itemTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="space-y-1.5">
                <Label>Purchase Price</Label>
                <Input type="number" min="0" step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Selling Price</Label>
                <Input type="number" min="0" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Opening Stock</Label>
                <Input type="number" min="0" step="0.01" value={openingStock} onChange={(e) => setOpeningStock(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Current Stock</Label>
                <Input type="number" min="0" step="0.01" value={currentStock} onChange={(e) => setCurrentStock(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Description</Label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1A56DB] resize-none" rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1A56DB] resize-none" rows={2} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value: "active" | "inactive") => setStatus(value)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4]">{saving ? "Saving..." : item ? "Update" : "Add Item"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
