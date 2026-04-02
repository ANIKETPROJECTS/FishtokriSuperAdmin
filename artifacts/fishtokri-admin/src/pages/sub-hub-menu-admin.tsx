import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft, Plus, Edit2, Trash2, Search, X, Package, Tag, Ticket, BarChart3, RefreshCw, Database, AlertCircle, CheckCircle, XCircle,
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

type Tab = "products" | "categories" | "coupons";

export default function SubHubMenuAdmin() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
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
    { label: "Coupons", value: stats?.coupons ?? 0, icon: Ticket, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Orders", value: stats?.orders ?? 0, icon: BarChart3, color: "text-green-600", bg: "bg-green-50" },
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
          <h2 className="text-2xl font-bold text-[#162B4D]">{subHubName || "Sub Hub"} — Menu Admin</h2>
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
            <p className="text-red-500 text-xs mt-1">Go back, edit the sub hub, and set the correct Database Name (e.g. "fishtokri" for Thane).</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loadingStats
          ? [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          : statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4.5 h-4.5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </div>
            </div>
          ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {(["products", "categories", "coupons"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${tab === t ? "border-[#1A56DB] text-[#1A56DB] bg-blue-50/50" : "border-transparent text-gray-500 hover:text-[#162B4D]"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-5">
          {!statsError && tab === "products" && <ProductsTab subHubId={subHubId} />}
          {!statsError && tab === "categories" && <CategoriesTab subHubId={subHubId} onRefreshStats={loadStats} />}
          {!statsError && tab === "coupons" && <CouponsTab subHubId={subHubId} />}
          {statsError && (
            <div className="py-12 text-center text-gray-400 text-sm">
              Fix the database connection to manage this sub hub's menu.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductsTab({ subHubId }: { subHubId: string }) {
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/sub-hubs/${subHubId}/menu/products`);
      setProducts(data.products ?? []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [subHubId, toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter((p) => !search || p.name?.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/sub-hubs/${subHubId}/menu/products/${deleteId}`, { method: "DELETE" });
      toast({ title: "Product deleted" });
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setDeleteId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-[#1A56DB] hover:bg-[#1447B4] text-white h-9 px-4 text-sm font-semibold ml-auto">
          <Plus className="w-4 h-4 mr-1.5" /> Add Product
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">{search ? "No products match your search" : "No products yet"}</p>
          <p className="text-gray-300 text-sm mt-1">{search ? "Try a different search" : 'Click "Add Product" to create the first one'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Available</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => (
                <tr key={String(p._id)} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Package className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-[#162B4D] text-sm">{p.name}</p>
                        {p.unit && <p className="text-xs text-gray-400">{p.unit}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.category || "—"}</td>
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-semibold text-[#162B4D]">₹{p.price ?? 0}</span>
                      {p.mrp && p.mrp > p.price && <span className="text-xs text-gray-400 line-through ml-1">₹{p.mrp}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">{p.stock ?? "—"}</td>
                  <td className="px-4 py-3">
                    {p.isAvailable !== false
                      ? <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle className="w-3 h-3" /> Yes</span>
                      : <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium"><XCircle className="w-3 h-3" /> No</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditing(p); setModalOpen(true); }} className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-[#1A56DB] hover:border-blue-200 hover:bg-blue-50 transition-colors">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => setDeleteId(String(p._id))} className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProductModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        product={editing}
        subHubId={subHubId}
        onSaved={load}
      />
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>This will permanently remove the product from the menu.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductModal({ isOpen, onClose, product, subHubId, onSaved }: { isOpen: boolean; onClose: () => void; product: any; subHubId: string; onSaved: () => void }) {
  const { toast } = useToast();
  const isEditing = !!product;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [unit, setUnit] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setName(product.name ?? ""); setDescription(product.description ?? ""); setPrice(String(product.price ?? ""));
        setMrp(String(product.mrp ?? "")); setUnit(product.unit ?? ""); setStock(String(product.stock ?? ""));
        setCategory(product.category ?? ""); setImageUrl(product.imageUrl ?? ""); setIsAvailable(product.isAvailable !== false);
      } else {
        setName(""); setDescription(""); setPrice(""); setMrp(""); setUnit(""); setStock(""); setCategory(""); setImageUrl(""); setIsAvailable(true);
      }
    }
  }, [isOpen, product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { name, description, price: Number(price) || 0, mrp: Number(mrp) || 0, unit, stock: Number(stock) || 0, category, imageUrl, isAvailable };
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#162B4D]">{isEditing ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Product Name *</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rohu Fish" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" className="h-9" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Price (₹) *</Label>
              <Input required type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">MRP (₹)</Label>
              <Input type="number" min="0" step="0.01" value={mrp} onChange={(e) => setMrp(e.target.value)} placeholder="0" className="h-9" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Unit</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. 500g, 1kg" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Stock</Label>
              <Input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" className="h-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Fish, Prawns" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Image URL</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="h-9" />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <Label className="text-sm">Available on Menu</Label>
            <Switch checked={isAvailable} onCheckedChange={setIsAvailable} className="data-[state=checked]:bg-[#1A56DB]" />
          </div>
          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="h-9">Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4] h-9">
              {isEditing ? "Save Changes" : "Add Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoriesTab({ subHubId, onRefreshStats }: { subHubId: string; onRefreshStats: () => void }) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/sub-hubs/${subHubId}/menu/categories`);
      setCategories(data.categories ?? []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [subHubId, toast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/sub-hubs/${subHubId}/menu/categories/${deleteId}`, { method: "DELETE" });
      toast({ title: "Category deleted" });
      load(); onRefreshStats();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setDeleteId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-[#1A56DB] hover:bg-[#1447B4] text-white h-9 px-4 text-sm font-semibold">
          <Plus className="w-4 h-4 mr-1.5" /> Add Category
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="py-16 text-center">
          <Tag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No categories yet</p>
          <p className="text-gray-300 text-sm mt-1">Click "Add Category" to create the first one</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((c) => (
            <div key={String(c._id)} className="bg-gray-50 rounded-xl border border-gray-100 p-3 flex flex-col gap-2 hover:shadow-sm transition-shadow">
              {c.imageUrl ? (
                <img src={c.imageUrl} alt={c.name} className="w-full h-20 object-cover rounded-lg border border-gray-100" />
              ) : (
                <div className="w-full h-20 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                  <Tag className="w-6 h-6 text-blue-200" />
                </div>
              )}
              <div className="flex items-center justify-between gap-1">
                <p className="font-semibold text-[#162B4D] text-sm truncate flex-1">{c.name}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${c.isActive !== false ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                  {c.isActive !== false ? "Active" : "Off"}
                </span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(c); setModalOpen(true); }} className="flex-1 h-6 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-[#1A56DB] hover:border-blue-200 hover:bg-blue-50 transition-colors">
                  <Edit2 className="w-3 h-3" />
                </button>
                <button onClick={() => setDeleteId(String(c._id))} className="flex-1 h-6 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CategoryModal isOpen={modalOpen} onClose={() => setModalOpen(false)} category={editing} subHubId={subHubId} onSaved={() => { load(); onRefreshStats(); }} />
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>This will permanently remove the category.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryModal({ isOpen, onClose, category, subHubId, onSaved }: { isOpen: boolean; onClose: () => void; category: any; subHubId: string; onSaved: () => void }) {
  const { toast } = useToast();
  const isEditing = !!category;
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (category) { setName(category.name ?? ""); setImageUrl(category.imageUrl ?? ""); setIsActive(category.isActive !== false); }
      else { setName(""); setImageUrl(""); setIsActive(true); }
    }
  }, [isOpen, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { name, imageUrl, isActive };
    try {
      if (isEditing) {
        await apiFetch(`/api/sub-hubs/${subHubId}/menu/categories/${category._id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast({ title: "Category updated" });
      } else {
        await apiFetch(`/api/sub-hubs/${subHubId}/menu/categories`, { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Category added" });
      }
      onSaved(); onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-[#162B4D]">{isEditing ? "Edit Category" : "Add Category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Category Name *</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fish, Prawns" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Image URL</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="h-9" />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <Label className="text-sm">Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-[#1A56DB]" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="h-9">Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4] h-9">
              {isEditing ? "Save Changes" : "Add Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CouponsTab({ subHubId }: { subHubId: string }) {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/sub-hubs/${subHubId}/menu/coupons`);
      setCoupons(data.coupons ?? []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [subHubId, toast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/sub-hubs/${subHubId}/menu/coupons/${deleteId}`, { method: "DELETE" });
      toast({ title: "Coupon deleted" });
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setDeleteId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-[#1A56DB] hover:bg-[#1447B4] text-white h-9 px-4 text-sm font-semibold">
          <Plus className="w-4 h-4 mr-1.5" /> Add Coupon
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : coupons.length === 0 ? (
        <div className="py-16 text-center">
          <Ticket className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No coupons yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => (
            <div key={String(c._id)} className="flex items-center gap-4 bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#1A56DB] text-sm">{c.code}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${c.isActive !== false ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                    {c.isActive !== false ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {c.discountType === "percentage" ? `${c.discount}% off` : `₹${c.discount} off`}
                  {c.minOrder ? ` • Min ₹${c.minOrder}` : ""}
                  {c.expiryDate ? ` • Expires ${new Date(c.expiryDate).toLocaleDateString()}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => { setEditing(c); setModalOpen(true); }} className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-[#1A56DB] hover:border-blue-200 hover:bg-blue-50 transition-colors">
                  <Edit2 className="w-3 h-3" />
                </button>
                <button onClick={() => setDeleteId(String(c._id))} className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CouponModal isOpen={modalOpen} onClose={() => setModalOpen(false)} coupon={editing} subHubId={subHubId} onSaved={load} />
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Coupon</DialogTitle>
            <DialogDescription>This will permanently remove the coupon.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CouponModal({ isOpen, onClose, coupon, subHubId, onSaved }: { isOpen: boolean; onClose: () => void; coupon: any; subHubId: string; onSaved: () => void }) {
  const { toast } = useToast();
  const isEditing = !!coupon;
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "flat">("percentage");
  const [minOrder, setMinOrder] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (coupon) {
        setCode(coupon.code ?? ""); setDiscount(String(coupon.discount ?? "")); setDiscountType(coupon.discountType ?? "percentage");
        setMinOrder(String(coupon.minOrder ?? "")); setMaxDiscount(String(coupon.maxDiscount ?? ""));
        setExpiryDate(coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().split("T")[0] : "");
        setIsActive(coupon.isActive !== false);
      } else {
        setCode(""); setDiscount(""); setDiscountType("percentage"); setMinOrder(""); setMaxDiscount(""); setExpiryDate(""); setIsActive(true);
      }
    }
  }, [isOpen, coupon]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { code, discount: Number(discount) || 0, discountType, minOrder: Number(minOrder) || 0, maxDiscount: Number(maxDiscount) || 0, expiryDate: expiryDate || null, isActive };
    try {
      if (isEditing) {
        await apiFetch(`/api/sub-hubs/${subHubId}/menu/coupons/${coupon._id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast({ title: "Coupon updated" });
      } else {
        await apiFetch(`/api/sub-hubs/${subHubId}/menu/coupons`, { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Coupon created" });
      }
      onSaved(); onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[#162B4D]">{isEditing ? "Edit Coupon" : "Add Coupon"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Coupon Code *</Label>
            <Input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. WELCOME20" className="h-9 font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Discount *</Label>
              <Input required type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Type</Label>
              <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="flat">Flat (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Min Order (₹)</Label>
              <Input type="number" min="0" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="0" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Max Discount (₹)</Label>
              <Input type="number" min="0" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} placeholder="0" className="h-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Expiry Date</Label>
            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="h-9" />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <Label className="text-sm">Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-[#1A56DB]" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="h-9">Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4] h-9">
              {isEditing ? "Save Changes" : "Create Coupon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
