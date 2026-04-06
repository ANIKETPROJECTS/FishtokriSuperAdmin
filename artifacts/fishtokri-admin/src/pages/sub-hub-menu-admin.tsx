import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft, Plus, Edit2, Trash2, Search, X, Package, Tag, Ticket,
  RefreshCw, Database, AlertCircle, CheckCircle, XCircle, Image,
  LayoutList, MapPin, ShoppingBag, ChevronDown, ChevronUp, GripVertical,
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

type Tab = "products" | "categories" | "combos" | "coupons" | "carousels" | "sections" | "pincodes";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "products", label: "Products", icon: Package },
  { key: "categories", label: "Categories", icon: Tag },
  { key: "combos", label: "Combos", icon: ShoppingBag },
  { key: "coupons", label: "Coupons", icon: Ticket },
  { key: "carousels", label: "Banners", icon: Image },
  { key: "sections", label: "Sections", icon: LayoutList },
  { key: "pincodes", label: "Pincodes", icon: MapPin },
];

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
    { label: "Combos", value: stats?.combos ?? 0, icon: ShoppingBag, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Coupons", value: stats?.coupons ?? 0, icon: Ticket, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Banners", value: stats?.carousels ?? 0, icon: Image, color: "text-pink-600", bg: "bg-pink-50" },
    { label: "Sections", value: stats?.sections ?? 0, icon: LayoutList, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "Pincodes", value: stats?.pincodes ?? 0, icon: MapPin, color: "text-green-600", bg: "bg-green-50" },
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
            <p className="text-red-500 text-xs mt-1">Go back, edit the sub hub, and set the correct Database Name (e.g. "fishtokri" for Thane).</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
        {loadingStats
          ? [1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          : statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5 flex flex-col gap-1">
              <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
              <p className={`text-lg font-bold ${color} leading-none`}>{value}</p>
              <p className="text-[10px] text-gray-400 font-medium">{label}</p>
            </div>
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

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return active
    ? <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> Active</span>
    : <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded-full"><XCircle className="w-3 h-3" /> Inactive</span>;
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

// ─── PRODUCTS TAB ─────────────────────────────────────────────────────────────
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

  const firstPrice = (p: any) => {
    if (Array.isArray(p.priceVariants) && p.priceVariants.length > 0) return p.priceVariants[0];
    return null;
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
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">{search ? "No products match" : "No products yet"}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Variants</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tags</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => {
                const variant = firstPrice(p);
                const img = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : p.imageUrl;
                return (
                  <tr key={String(p._id)} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {img ? (
                          <img src={img} alt={p.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Package className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-[#162B4D] text-sm">{p.name}</p>
                          {p.subCategory && <p className="text-xs text-gray-400">{p.subCategory}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.category || "—"}</td>
                    <td className="px-4 py-3">
                      {variant ? (
                        <div className="text-xs">
                          <span className="font-semibold text-[#162B4D]">₹{variant.price}</span>
                          {variant.mrp > variant.price && <span className="text-gray-400 line-through ml-1">₹{variant.mrp}</span>}
                          <span className="text-gray-400 ml-1">/ {variant.weight}</span>
                          {Array.isArray(p.priceVariants) && p.priceVariants.length > 1 && (
                            <span className="ml-1 text-[10px] bg-blue-50 text-blue-600 px-1 rounded">+{p.priceVariants.length - 1} more</span>
                          )}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-0.5">
                        {Array.isArray(p.tags) && p.tags.slice(0, 2).map((t: string) => (
                          <span key={t} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge active={p.isActive !== false} /></td>
                    <td className="px-4 py-3">
                      <ActionButtons onEdit={() => { setEditing(p); setModalOpen(true); }} onDelete={() => setDeleteId(String(p._id))} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ProductModal isOpen={modalOpen} onClose={() => setModalOpen(false)} product={editing} subHubId={subHubId} onSaved={load} />
      <DeleteDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Product" description="This will permanently remove the product from the menu." />
    </div>
  );
}

function ProductModal({ isOpen, onClose, product, subHubId, onSaved }: any) {
  const { toast } = useToast();
  const isEditing = !!product;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [imageUrl, setImageUrl] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [variants, setVariants] = useState([{ weight: "", price: "", mrp: "" }]);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    apiFetch(`/api/sub-hubs/${subHubId}/menu/categories`).then((d) => setCategories(d.categories ?? [])).catch(() => {});
  }, [subHubId]);

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setName(product.name ?? "");
        setDescription(product.description ?? "");
        setCategory(product.category ?? "");
        setSubCategory(product.subCategory ?? "");
        setIsActive(product.isActive !== false);
        setSortOrder(String(product.sortOrder ?? 0));
        const imgs = Array.isArray(product.images) ? product.images : product.imageUrl ? [product.imageUrl] : [];
        setImageUrl(imgs[0] ?? "");
        setTagsStr(Array.isArray(product.tags) ? product.tags.join(", ") : "");
        setVariants(Array.isArray(product.priceVariants) && product.priceVariants.length > 0
          ? product.priceVariants.map((v: any) => ({ weight: v.weight ?? "", price: String(v.price ?? ""), mrp: String(v.mrp ?? "") }))
          : [{ weight: "", price: "", mrp: "" }]);
      } else {
        setName(""); setDescription(""); setCategory(""); setSubCategory("");
        setIsActive(true); setSortOrder("0"); setImageUrl(""); setTagsStr("");
        setVariants([{ weight: "", price: "", mrp: "" }]);
      }
    }
  }, [isOpen, product]);

  const addVariant = () => setVariants([...variants, { weight: "", price: "", mrp: "" }]);
  const removeVariant = (i: number) => setVariants(variants.filter((_, idx) => idx !== i));
  const updateVariant = (i: number, field: string, val: string) => {
    setVariants(variants.map((v, idx) => idx === i ? { ...v, [field]: val } : v));
  };

  const selectedCat = categories.find((c) => c.name === category);
  const subCats: string[] = selectedCat?.subCategories?.map((s: any) => s.name) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const priceVariants = variants.filter((v) => v.weight || v.price).map((v) => ({
      weight: v.weight,
      price: Number(v.price) || 0,
      mrp: Number(v.mrp) || 0,
      discount: v.mrp && v.price ? Math.round(((Number(v.mrp) - Number(v.price)) / Number(v.mrp)) * 100) : 0,
    }));
    const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
    const images = imageUrl ? [imageUrl] : [];
    const payload = { name, description, category, subCategory, priceVariants, images, tags, isActive, sortOrder: Number(sortOrder) || 0 };
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
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#162B4D]">{isEditing ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Product Name *</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Silver Pomfret" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" className="h-9" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Category</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setSubCategory(""); }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={String(c._id)} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Sub-Category</Label>
              {subCats.length > 0 ? (
                <Select value={subCategory} onValueChange={setSubCategory}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {subCats.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={subCategory} onChange={(e) => setSubCategory(e.target.value)} placeholder="e.g. Silver Pomfret" className="h-9" />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-gray-600">Price Variants</Label>
              <button type="button" onClick={addVariant} className="text-xs text-[#1A56DB] font-medium hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Variant
              </button>
            </div>
            {variants.map((v, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 items-center">
                <Input value={v.weight} onChange={(e) => updateVariant(i, "weight", e.target.value)} placeholder="Weight (e.g. 500g)" className="h-8 text-sm" />
                <Input type="number" value={v.price} onChange={(e) => updateVariant(i, "price", e.target.value)} placeholder="Price ₹" className="h-8 text-sm" />
                <div className="flex gap-1">
                  <Input type="number" value={v.mrp} onChange={(e) => updateVariant(i, "mrp", e.target.value)} placeholder="MRP ₹" className="h-8 text-sm" />
                  {variants.length > 1 && (
                    <button type="button" onClick={() => removeVariant(i)} className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 flex-shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Image URL</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Tags <span className="font-normal text-gray-400">(comma-separated)</span></Label>
            <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="e.g. Fresh, Bestseller, Family Size" className="h-9" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Sort Order</Label>
              <Input type="number" min="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="h-9" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <Label className="text-sm">Active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-[#1A56DB]" />
            </div>
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

// ─── CATEGORIES TAB ───────────────────────────────────────────────────────────
function CategoriesTab({ subHubId, onRefreshStats }: { subHubId: string; onRefreshStats: () => void }) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : categories.length === 0 ? (
        <div className="py-16 text-center"><Tag className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No categories yet</p></div>
      ) : (
        <div className="space-y-2">
          {categories.map((c) => {
            const expanded = expandedId === String(c._id);
            return (
              <div key={String(c._id)} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50/50 transition-colors">
                  {c.imageUrl ? (
                    <img src={c.imageUrl} alt={c.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Tag className="w-4 h-4 text-blue-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#162B4D] text-sm">{c.name}</p>
                      <StatusBadge active={c.isActive !== false} />
                    </div>
                    {Array.isArray(c.subCategories) && c.subCategories.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">{c.subCategories.length} sub-categories</p>
                    )}
                  </div>
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
                    <p className="text-xs font-semibold text-gray-500 mb-2">Sub-Categories</p>
                    <div className="flex flex-wrap gap-1.5">
                      {c.subCategories.map((s: any) => (
                        <span key={s.name} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-full">{s.name}</span>
                      ))}
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

function CategoryModal({ isOpen, onClose, category, subHubId, onSaved }: any) {
  const { toast } = useToast();
  const isEditing = !!category;
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [subCatInput, setSubCatInput] = useState("");
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setName(category.name ?? "");
        setImageUrl(category.imageUrl ?? "");
        setIsActive(category.isActive !== false);
        setSortOrder(String(category.sortOrder ?? 0));
        setSubCategories(Array.isArray(category.subCategories) ? category.subCategories.map((s: any) => s.name ?? s) : []);
      } else {
        setName(""); setImageUrl(""); setIsActive(true); setSortOrder("0"); setSubCategories([]);
      }
      setSubCatInput("");
    }
  }, [isOpen, category]);

  const addSubCat = () => {
    const v = subCatInput.trim();
    if (v && !subCategories.includes(v)) { setSubCategories([...subCategories, v]); }
    setSubCatInput("");
  };
  const removeSubCat = (s: string) => setSubCategories(subCategories.filter((x) => x !== s));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { name, imageUrl, isActive, sortOrder: Number(sortOrder) || 0, subCategories: subCategories.map((s) => ({ name: s, imageUrl: null })) };
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
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-[#162B4D]">{isEditing ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Category Name *</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fish" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Image URL</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="h-9" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-600">Sub-Categories</Label>
            <div className="flex gap-2">
              <Input value={subCatInput} onChange={(e) => setSubCatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubCat())} placeholder="Type and press Enter or Add" className="h-8 text-sm flex-1" />
              <Button type="button" onClick={addSubCat} variant="outline" className="h-8 px-3 text-xs">Add</Button>
            </div>
            {subCategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 rounded-lg">
                {subCategories.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-full">
                    {s}
                    <button type="button" onClick={() => removeSubCat(s)} className="text-gray-400 hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Sort Order</Label>
              <Input type="number" min="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="h-9" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <Label className="text-sm">Active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-[#1A56DB]" />
            </div>
          </div>
          <DialogFooter className="pt-1">
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

// ─── COMBOS TAB ───────────────────────────────────────────────────────────────
function CombosTab({ subHubId }: { subHubId: string }) {
  const { toast } = useToast();
  const [combos, setCombos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/sub-hubs/${subHubId}/menu/combos`);
      setCombos(data.combos ?? []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [subHubId, toast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/sub-hubs/${subHubId}/menu/combos/${deleteId}`, { method: "DELETE" });
      toast({ title: "Combo deleted" });
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setDeleteId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-[#1A56DB] hover:bg-[#1447B4] text-white h-9 px-4 text-sm font-semibold">
          <Plus className="w-4 h-4 mr-1.5" /> Add Combo
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : combos.length === 0 ? (
        <div className="py-16 text-center"><ShoppingBag className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No combos yet</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {combos.map((c) => {
            const img = Array.isArray(c.images) && c.images.length > 0 ? c.images[0] : null;
            return (
              <div key={String(c._id)} className="border border-gray-100 rounded-xl p-4 flex gap-3 hover:shadow-sm transition-shadow bg-white">
                {img ? (
                  <img src={img} alt={c.name} className="w-16 h-16 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-6 h-6 text-indigo-200" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#162B4D] text-sm">{c.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-sm font-bold text-[#162B4D]">₹{c.price}</span>
                        {c.originalPrice > c.price && <span className="text-xs text-gray-400 line-through">₹{c.originalPrice}</span>}
                        {c.discount > 0 && <span className="text-xs text-green-600 font-semibold">{c.discount}% off</span>}
                      </div>
                      {Array.isArray(c.items) && c.items.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">{c.items.length} items</p>
                      )}
                      {Array.isArray(c.tags) && c.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.tags.map((t: string) => <span key={t} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">{t}</span>)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge active={c.isActive !== false} />
                      <ActionButtons onEdit={() => { setEditing(c); setModalOpen(true); }} onDelete={() => setDeleteId(String(c._id))} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ComboModal isOpen={modalOpen} onClose={() => setModalOpen(false)} combo={editing} subHubId={subHubId} onSaved={load} />
      <DeleteDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Combo" description="This will permanently remove the combo." />
    </div>
  );
}

function ComboModal({ isOpen, onClose, combo, subHubId, onSaved }: any) {
  const { toast } = useToast();
  const isEditing = !!combo;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (combo) {
        setName(combo.name ?? ""); setDescription(combo.description ?? "");
        setPrice(String(combo.price ?? "")); setOriginalPrice(String(combo.originalPrice ?? ""));
        const imgs = Array.isArray(combo.images) ? combo.images : [];
        setImageUrl(imgs[0] ?? "");
        setTagsStr(Array.isArray(combo.tags) ? combo.tags.join(", ") : "");
        setIsActive(combo.isActive !== false); setSortOrder(String(combo.sortOrder ?? 0));
      } else {
        setName(""); setDescription(""); setPrice(""); setOriginalPrice("");
        setImageUrl(""); setTagsStr(""); setIsActive(true); setSortOrder("0");
      }
    }
  }, [isOpen, combo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const p = Number(price) || 0;
    const op = Number(originalPrice) || 0;
    const discount = op > p ? Math.round(((op - p) / op) * 100) : 0;
    const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
    const images = imageUrl ? [imageUrl] : [];
    const payload = { name, description, price: p, originalPrice: op, discount, images, tags, isActive, sortOrder: Number(sortOrder) || 0 };
    try {
      if (isEditing) {
        await apiFetch(`/api/sub-hubs/${subHubId}/menu/combos/${combo._id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast({ title: "Combo updated" });
      } else {
        await apiFetch(`/api/sub-hubs/${subHubId}/menu/combos`, { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Combo added" });
      }
      onSaved(); onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-[#162B4D]">{isEditing ? "Edit Combo" : "Add Combo"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Combo Name *</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Family Fish Combo" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" className="h-9" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Sale Price (₹) *</Label>
              <Input required type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Original Price (₹)</Label>
              <Input type="number" min="0" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="0" className="h-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Image URL</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Tags <span className="font-normal text-gray-400">(comma-separated)</span></Label>
            <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="e.g. Family Size, Value" className="h-9" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Sort Order</Label>
              <Input type="number" min="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="h-9" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <Label className="text-sm">Active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-[#1A56DB]" />
            </div>
          </div>
          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="h-9">Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4] h-9">
              {isEditing ? "Save Changes" : "Add Combo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── COUPONS TAB ──────────────────────────────────────────────────────────────
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
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : coupons.length === 0 ? (
        <div className="py-16 text-center"><Ticket className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No coupons yet</p></div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Discount</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Min Order</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Used</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Expires</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {coupons.map((c) => (
                <tr key={String(c._id)} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-[#162B4D] text-sm tracking-wider bg-gray-100 px-2 py-0.5 rounded">{c.code}</span>
                    {c.isFirstTimeOnly && <span className="ml-2 text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full font-semibold">First Time</span>}
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-500 text-xs">{c.type}</td>
                  <td className="px-4 py-3 font-semibold text-[#162B4D]">
                    {c.type === "percentage" ? `${c.discountValue}%` : `₹${c.discountValue}`}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">₹{c.minOrderAmount}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {c.usedCount ?? 0}{c.maxUsage ? ` / ${c.maxUsage}` : ""}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-IN") : "No expiry"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge active={c.isActive !== false} /></td>
                  <td className="px-4 py-3">
                    <ActionButtons onEdit={() => { setEditing(c); setModalOpen(true); }} onDelete={() => setDeleteId(String(c._id))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CouponModal isOpen={modalOpen} onClose={() => setModalOpen(false)} coupon={editing} subHubId={subHubId} onSaved={load} />
      <DeleteDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Coupon" description="This will permanently remove the coupon." />
    </div>
  );
}

function CouponModal({ isOpen, onClose, coupon, subHubId, onSaved }: any) {
  const { toast } = useToast();
  const isEditing = !!coupon;
  const [code, setCode] = useState("");
  const [type, setType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [maxUsage, setMaxUsage] = useState("");
  const [isFirstTimeOnly, setIsFirstTimeOnly] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (coupon) {
        setCode(coupon.code ?? ""); setType(coupon.type ?? "percentage");
        setDiscountValue(String(coupon.discountValue ?? "")); setMinOrderAmount(String(coupon.minOrderAmount ?? ""));
        setMaxUsage(coupon.maxUsage ? String(coupon.maxUsage) : "");
        setIsFirstTimeOnly(coupon.isFirstTimeOnly === true); setIsActive(coupon.isActive !== false);
        setExpiresAt(coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split("T")[0] : "");
      } else {
        setCode(""); setType("percentage"); setDiscountValue(""); setMinOrderAmount("");
        setMaxUsage(""); setIsFirstTimeOnly(false); setIsActive(true); setExpiresAt("");
      }
    }
  }, [isOpen, coupon]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: any = { code, type, discountValue: Number(discountValue) || 0, minOrderAmount: Number(minOrderAmount) || 0, isFirstTimeOnly, isActive };
    if (maxUsage) payload.maxUsage = Number(maxUsage);
    if (expiresAt) payload.expiresAt = expiresAt;
    try {
      if (isEditing) {
        await apiFetch(`/api/sub-hubs/${subHubId}/menu/coupons/${coupon._id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast({ title: "Coupon updated" });
      } else {
        await apiFetch(`/api/sub-hubs/${subHubId}/menu/coupons`, { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Coupon added" });
      }
      onSaved(); onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-[#162B4D]">{isEditing ? "Edit Coupon" : "Add Coupon"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Coupon Code *</Label>
            <Input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. FISH10" className="h-9 font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Discount Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="flat">Flat (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Discount Value *</Label>
              <Input required type="number" min="0" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={type === "percentage" ? "e.g. 10" : "e.g. 50"} className="h-9" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Min Order (₹)</Label>
              <Input type="number" min="0" value={minOrderAmount} onChange={(e) => setMinOrderAmount(e.target.value)} placeholder="0" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Max Usage</Label>
              <Input type="number" min="0" value={maxUsage} onChange={(e) => setMaxUsage(e.target.value)} placeholder="Unlimited" className="h-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Expiry Date</Label>
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="h-9" />
          </div>
          <div className="flex gap-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg flex-1">
              <Label className="text-sm">First Time Only</Label>
              <Switch checked={isFirstTimeOnly} onCheckedChange={setIsFirstTimeOnly} className="data-[state=checked]:bg-[#1A56DB]" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg flex-1">
              <Label className="text-sm">Active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-[#1A56DB]" />
            </div>
          </div>
          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="h-9">Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4] h-9">
              {isEditing ? "Save Changes" : "Add Coupon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── CAROUSELS TAB ────────────────────────────────────────────────────────────
function CarouselsTab({ subHubId }: { subHubId: string }) {
  const { toast } = useToast();
  const [carousels, setCarousels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/sub-hubs/${subHubId}/menu/carousels`);
      setCarousels(data.carousels ?? []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [subHubId, toast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/sub-hubs/${subHubId}/menu/carousels/${deleteId}`, { method: "DELETE" });
      toast({ title: "Banner deleted" });
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setDeleteId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-[#1A56DB] hover:bg-[#1447B4] text-white h-9 px-4 text-sm font-semibold">
          <Plus className="w-4 h-4 mr-1.5" /> Add Banner
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : carousels.length === 0 ? (
        <div className="py-16 text-center"><Image className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No banners yet</p></div>
      ) : (
        <div className="space-y-3">
          {carousels.map((c, idx) => (
            <div key={String(c._id)} className="border border-gray-100 rounded-xl overflow-hidden flex gap-3 bg-white p-3 hover:shadow-sm transition-shadow items-center">
              <div className="flex items-center gap-2 text-gray-300 flex-shrink-0">
                <GripVertical className="w-4 h-4" />
                <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
              </div>
              <div className="w-32 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                {c.imageUrl ? (
                  <img src={c.imageUrl} alt={c.title ?? "Banner"} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Image className="w-5 h-5 text-gray-300" /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#162B4D] text-sm">{c.title || <span className="text-gray-400 font-normal">No title</span>}</p>
                {c.linkUrl && <p className="text-xs text-gray-400 truncate">{c.linkUrl}</p>}
                <p className="text-xs text-gray-400 mt-0.5">Order: {c.order}</p>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <StatusBadge active={c.isActive !== false} />
                <ActionButtons onEdit={() => { setEditing(c); setModalOpen(true); }} onDelete={() => setDeleteId(String(c._id))} />
              </div>
            </div>
          ))}
        </div>
      )}

      <CarouselModal isOpen={modalOpen} onClose={() => setModalOpen(false)} carousel={editing} subHubId={subHubId} onSaved={load} />
      <DeleteDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Banner" description="This will permanently remove the banner from the carousel." />
    </div>
  );
}

function CarouselModal({ isOpen, onClose, carousel, subHubId, onSaved }: any) {
  const { toast } = useToast();
  const isEditing = !!carousel;
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [order, setOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (carousel) {
        setImageUrl(carousel.imageUrl ?? ""); setTitle(carousel.title ?? "");
        setLinkUrl(carousel.linkUrl ?? ""); setOrder(String(carousel.order ?? 0));
        setIsActive(carousel.isActive !== false);
      } else {
        setImageUrl(""); setTitle(""); setLinkUrl(""); setOrder("0"); setIsActive(true);
      }
    }
  }, [isOpen, carousel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { imageUrl, title: title || null, linkUrl: linkUrl || null, order: Number(order) || 0, isActive };
    try {
      if (isEditing) {
        await apiFetch(`/api/sub-hubs/${subHubId}/menu/carousels/${carousel._id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast({ title: "Banner updated" });
      } else {
        await apiFetch(`/api/sub-hubs/${subHubId}/menu/carousels`, { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Banner added" });
      }
      onSaved(); onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader><DialogTitle className="text-[#162B4D]">{isEditing ? "Edit Banner" : "Add Banner"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Image URL *</Label>
            <Input required value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="h-9" />
            {imageUrl && <img src={imageUrl} alt="Preview" className="w-full h-24 object-cover rounded-lg border border-gray-100 mt-1" onError={(e) => { (e.target as any).style.display = "none"; }} />}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional title" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Link URL</Label>
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://... (optional)" className="h-9" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Display Order</Label>
              <Input type="number" min="0" value={order} onChange={(e) => setOrder(e.target.value)} className="h-9" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <Label className="text-sm">Active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-[#1A56DB]" />
            </div>
          </div>
          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="h-9">Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4] h-9">
              {isEditing ? "Save Changes" : "Add Banner"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── SECTIONS TAB ─────────────────────────────────────────────────────────────
function SectionsTab({ subHubId }: { subHubId: string }) {
  const { toast } = useToast();
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/sub-hubs/${subHubId}/menu/sections`);
      setSections(data.sections ?? []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [subHubId, toast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/sub-hubs/${subHubId}/menu/sections/${deleteId}`, { method: "DELETE" });
      toast({ title: "Section deleted" });
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setDeleteId(null); }
  };

  const TYPE_COLORS: Record<string, string> = {
    products: "bg-blue-50 text-blue-600",
    combos: "bg-indigo-50 text-indigo-600",
    categories: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-[#1A56DB] hover:bg-[#1447B4] text-white h-9 px-4 text-sm font-semibold">
          <Plus className="w-4 h-4 mr-1.5" /> Add Section
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : sections.length === 0 ? (
        <div className="py-16 text-center"><LayoutList className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No sections yet</p></div>
      ) : (
        <div className="space-y-2">
          {sections.map((s) => (
            <div key={String(s._id)} className="flex items-center gap-3 border border-gray-100 rounded-xl px-4 py-3 bg-white hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center gap-2 text-gray-300 flex-shrink-0">
                <GripVertical className="w-4 h-4" />
                <span className="text-xs font-bold text-gray-400">#{s.sortOrder}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#162B4D] text-sm">{s.title}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize flex-shrink-0 ${TYPE_COLORS[s.type] ?? "bg-gray-100 text-gray-500"}`}>{s.type}</span>
              <StatusBadge active={s.isActive !== false} />
              <ActionButtons onEdit={() => { setEditing(s); setModalOpen(true); }} onDelete={() => setDeleteId(String(s._id))} />
            </div>
          ))}
        </div>
      )}

      <SectionModal isOpen={modalOpen} onClose={() => setModalOpen(false)} section={editing} subHubId={subHubId} onSaved={load} />
      <DeleteDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Section" description="This will permanently remove this homepage section." />
    </div>
  );
}

function SectionModal({ isOpen, onClose, section, subHubId, onSaved }: any) {
  const { toast } = useToast();
  const isEditing = !!section;
  const [title, setTitle] = useState("");
  const [type, setType] = useState("products");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (section) {
        setTitle(section.title ?? ""); setType(section.type ?? "products");
        setSortOrder(String(section.sortOrder ?? 0)); setIsActive(section.isActive !== false);
      } else {
        setTitle(""); setType("products"); setSortOrder("0"); setIsActive(true);
      }
    }
  }, [isOpen, section]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { title, type, sortOrder: Number(sortOrder) || 0, isActive };
    try {
      if (isEditing) {
        await apiFetch(`/api/sub-hubs/${subHubId}/menu/sections/${section._id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast({ title: "Section updated" });
      } else {
        await apiFetch(`/api/sub-hubs/${subHubId}/menu/sections`, { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Section added" });
      }
      onSaved(); onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader><DialogTitle className="text-[#162B4D]">{isEditing ? "Edit Section" : "Add Section"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Section Title *</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Today's Special" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Content Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="products">Products</SelectItem>
                <SelectItem value="combos">Combos</SelectItem>
                <SelectItem value="categories">Categories</SelectItem>
                <SelectItem value="carousels">Carousels</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Sort Order</Label>
              <Input type="number" min="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="h-9" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <Label className="text-sm">Active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-[#1A56DB]" />
            </div>
          </div>
          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="h-9">Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4] h-9">
              {isEditing ? "Save Changes" : "Add Section"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── PINCODES TAB ─────────────────────────────────────────────────────────────
function PincodesTab({ subHubId }: { subHubId: string }) {
  const { toast } = useToast();
  const [pincodes, setPincodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/sub-hubs/${subHubId}/menu/pincodes`);
      setPincodes(data.pincodes ?? []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [subHubId, toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = pincodes.filter((p) => !search || p.pincode?.includes(search) || p.area?.toLowerCase().includes(search.toLowerCase()) || p.city?.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/sub-hubs/${subHubId}/menu/pincodes/${deleteId}`, { method: "DELETE" });
      toast({ title: "Pincode deleted" });
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
          <Input placeholder="Search pincode, area..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-[#1A56DB] hover:bg-[#1447B4] text-white h-9 px-4 text-sm font-semibold ml-auto">
          <Plus className="w-4 h-4 mr-1.5" /> Add Pincode
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center"><MapPin className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">{search ? "No pincodes match" : "No pincodes yet"}</p></div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pincode</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Area</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">City</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => (
                <tr key={String(p._id)} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-[#162B4D]">{p.pincode}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">{p.area || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.city || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge active={p.isActive !== false} /></td>
                  <td className="px-4 py-3">
                    <ActionButtons onEdit={() => { setEditing(p); setModalOpen(true); }} onDelete={() => setDeleteId(String(p._id))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PincodeModal isOpen={modalOpen} onClose={() => setModalOpen(false)} pincode={editing} subHubId={subHubId} onSaved={load} />
      <DeleteDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Pincode" description="This will remove the pincode from the service area." />
    </div>
  );
}

function PincodeModal({ isOpen, onClose, pincode, subHubId, onSaved }: any) {
  const { toast } = useToast();
  const isEditing = !!pincode;
  const [code, setCode] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (pincode) {
        setCode(pincode.pincode ?? ""); setArea(pincode.area ?? ""); setCity(pincode.city ?? ""); setIsActive(pincode.isActive !== false);
      } else {
        setCode(""); setArea(""); setCity("Thane"); setIsActive(true);
      }
    }
  }, [isOpen, pincode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { pincode: code, area, city, isActive };
    try {
      if (isEditing) {
        await apiFetch(`/api/sub-hubs/${subHubId}/menu/pincodes/${pincode._id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast({ title: "Pincode updated" });
      } else {
        await apiFetch(`/api/sub-hubs/${subHubId}/menu/pincodes`, { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Pincode added" });
      }
      onSaved(); onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader><DialogTitle className="text-[#162B4D]">{isEditing ? "Edit Pincode" : "Add Pincode"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Pincode *</Label>
            <Input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 400601" maxLength={6} className="h-9 font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Area</Label>
            <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Thane West" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Thane" className="h-9" />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <Label className="text-sm">Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-[#1A56DB]" />
          </div>
          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="h-9">Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4] h-9">
              {isEditing ? "Save Changes" : "Add Pincode"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
