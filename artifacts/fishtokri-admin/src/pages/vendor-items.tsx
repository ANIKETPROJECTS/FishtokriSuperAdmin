import { useEffect, useMemo, useState } from "react";
import { Boxes, FolderPlus, PackagePlus, Pencil, Plus, Search, Trash2, X } from "lucide-react";
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
};

type VendorItem = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  unit: string;
  description: string;
  status: "active" | "inactive";
  notes: string;
};

const units = ["kg", "piece", "box", "tray", "crate", "litre", "pack", "bag"];

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

export default function VendorItems() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [items, setItems] = useState<VendorItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<VendorCategory | null>(null);
  const [editingItem, setEditingItem] = useState<VendorItem | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [catData, itemData] = await Promise.all([
        apiFetch("/api/vendor-items/categories"),
        apiFetch("/api/vendor-items/items"),
      ]);
      setCategories(catData.categories ?? []);
      setItems(itemData.items ?? []);
    } catch (err: any) {
      toast({ title: "Could not load vendor items", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.categoryId === selectedCategory;
      const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.categoryName.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, search]);

  const activeCategories = categories.filter((category) => category.status === "active").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#162B4D]">Vendor Items</h1>
          <p className="text-sm text-gray-500 mt-1">Manage raw materials, full uncut items, packaging, and equipment bought from vendors.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setEditingCategory(null); setCategoryModalOpen(true); }} className="gap-2">
            <FolderPlus className="w-4 h-4" /> Add Category
          </Button>
          <Button onClick={() => { setEditingItem(null); setItemModalOpen(true); }} className="gap-2 bg-[#1A56DB] hover:bg-[#1447B4]" disabled={categories.length === 0}>
            <PackagePlus className="w-4 h-4" /> Add Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Categories</p>
          <p className="text-2xl font-bold text-[#162B4D] mt-2">{categories.length}</p>
          <p className="text-xs text-gray-500 mt-1">{activeCategories} active</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Vendor Items</p>
          <p className="text-2xl font-bold text-[#162B4D] mt-2">{items.length}</p>
          <p className="text-xs text-gray-500 mt-1">Raw materials and supplies</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Filtered</p>
          <p className="text-2xl font-bold text-[#162B4D] mt-2">{filteredItems.length}</p>
          <p className="text-xs text-gray-500 mt-1">Shown in current view</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#162B4D]">Categories</h2>
              <p className="text-xs text-gray-500">Examples: Chicken, Fish, Packaging</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => { setEditingCategory(null); setCategoryModalOpen(true); }}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="p-3 space-y-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`w-full text-left rounded-lg px-3 py-2 border transition-colors ${selectedCategory === "all" ? "border-[#1A56DB] bg-blue-50 text-[#162B4D]" : "border-gray-100 hover:border-gray-200"}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">All Items</span>
                <span className="text-xs text-gray-500">{items.length}</span>
              </div>
            </button>
            {categories.map((category) => (
              <div key={category.id} className={`rounded-lg border transition-colors ${selectedCategory === category.id ? "border-[#1A56DB] bg-blue-50" : "border-gray-100 bg-white"}`}>
                <button onClick={() => setSelectedCategory(category.id)} className="w-full text-left px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#162B4D] truncate">{category.name}</p>
                      {category.description && <p className="text-xs text-gray-500 truncate">{category.description}</p>}
                      <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${category.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {category.status}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{items.filter((item) => item.categoryId === category.id).length}</span>
                  </div>
                </button>
                <div className="flex border-t border-gray-100">
                  <button onClick={() => { setEditingCategory(category); setCategoryModalOpen(true); }} className="flex-1 py-1.5 text-xs text-gray-500 hover:text-[#1A56DB] hover:bg-white">
                    Edit
                  </button>
                  <button onClick={() => deleteCategory(category)} className="flex-1 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-white">
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!loading && categories.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl">
                Add your first vendor item category.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
            <div>
              <h2 className="font-bold text-[#162B4D]">Items</h2>
              <p className="text-xs text-gray-500">These are vendor-side purchasable items, not customer menu products.</p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." className="pl-9 w-64" />
              </div>
              <Button onClick={() => { setEditingItem(null); setItemModalOpen(true); }} disabled={categories.length === 0} className="gap-2 bg-[#1A56DB] hover:bg-[#1447B4]">
                <Plus className="w-4 h-4" /> Add Item
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#1A56DB] flex items-center justify-center flex-shrink-0">
                          <Boxes className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#162B4D]">{item.name}</p>
                          {item.description && <p className="text-xs text-gray-500 max-w-md">{item.description}</p>}
                          {item.notes && <p className="text-[11px] text-gray-400 mt-1">Note: {item.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.categoryName}</td>
                    <td className="px-4 py-3 text-gray-600">{item.unit}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${item.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingItem(item); setItemModalOpen(true); }} className="h-8 w-8 p-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteItem(item)} className="h-8 w-8 p-0 text-gray-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filteredItems.length === 0 && (
              <div className="text-center py-12">
                <Boxes className="w-10 h-10 mx-auto text-gray-300" />
                <p className="text-sm font-semibold text-gray-500 mt-3">No vendor items found</p>
                <p className="text-xs text-gray-400 mt-1">Add raw materials like full chicken, whole fish, boxes, or equipment.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <CategoryModal
        open={categoryModalOpen}
        category={editingCategory}
        onClose={() => setCategoryModalOpen(false)}
        onSaved={() => { setCategoryModalOpen(false); setEditingCategory(null); load(); }}
      />
      <ItemModal
        open={itemModalOpen}
        item={editingItem}
        categories={categories}
        defaultCategoryId={selectedCategory === "all" ? categories[0]?.id ?? "" : selectedCategory}
        onClose={() => setItemModalOpen(false)}
        onSaved={() => { setItemModalOpen(false); setEditingItem(null); load(); }}
      />
    </div>
  );

  async function deleteCategory(category: VendorCategory) {
    if (!confirm(`Delete category "${category.name}"?`)) return;
    try {
      await apiFetch(`/api/vendor-items/categories/${category.id}`, { method: "DELETE" });
      toast({ title: "Category deleted" });
      if (selectedCategory === category.id) setSelectedCategory("all");
      load();
    } catch (err: any) {
      toast({ title: "Could not delete category", description: err.message, variant: "destructive" });
    }
  }

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

function CategoryModal({ open, category, onClose, onSaved }: { open: boolean; category: VendorCategory | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setStatus(category?.status ?? "active");
  }, [open, category]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name, description, status };
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
  const [categoryId, setCategoryId] = useState("");
  const [unit, setUnit] = useState("kg");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? "");
    setCategoryId(item?.categoryId ?? defaultCategoryId);
    setUnit(item?.unit ?? "kg");
    setDescription(item?.description ?? "");
    setStatus(item?.status ?? "active");
    setNotes(item?.notes ?? "");
  }, [open, item, defaultCategoryId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name, categoryId, unit, description, status, notes };
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
      <DialogContent>
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
            <div className="space-y-1.5">
              <Label>Item Name *</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Full Chicken, Whole Rohu Fish, Ice Box" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Purchase Unit</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1A56DB]" rows={3} placeholder="Describe what is bought from vendor." />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional purchase or handling notes" />
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
        )}
      </DialogContent>
    </Dialog>
  );
}