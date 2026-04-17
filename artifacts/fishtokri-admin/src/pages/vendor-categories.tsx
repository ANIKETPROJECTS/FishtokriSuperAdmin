import { useEffect, useState } from "react";
import { FolderOpen, FolderPlus, Pencil, Trash2, Search, Boxes } from "lucide-react";
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
  createdAt?: string;
};

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

export default function VendorCategories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VendorCategory | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [catData, itemData] = await Promise.all([
        apiFetch("/api/vendor-items/categories"),
        apiFetch("/api/vendor-items/items"),
      ]);
      const cats: VendorCategory[] = catData.categories ?? [];
      setCategories(cats);
      const counts: Record<string, number> = {};
      for (const cat of cats) counts[cat.id] = 0;
      for (const item of itemData.items ?? []) {
        if (counts[item.categoryId] !== undefined) counts[item.categoryId]++;
      }
      setItemCounts(counts);
    } catch (err: any) {
      toast({ title: "Failed to load categories", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = categories.filter((c) => {
    const matchSearch = !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = categories.filter((c) => c.status === "active").length;
  const inactiveCount = categories.filter((c) => c.status === "inactive").length;

  const handleDelete = async (cat: VendorCategory) => {
    const count = itemCounts[cat.id] ?? 0;
    if (count > 0) {
      toast({ title: "Cannot delete", description: `Move or delete the ${count} item(s) in "${cat.name}" first.`, variant: "destructive" });
      return;
    }
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await apiFetch(`/api/vendor-items/categories/${cat.id}`, { method: "DELETE" });
      toast({ title: "Category deleted" });
      load();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#162B4D]">Vendor Item Categories</h1>
          <p className="text-sm text-gray-500 mt-1">Organise vendor items by category — e.g. Raw Chicken, Whole Fish, Packaging.</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="gap-2 bg-[#1A56DB] hover:bg-[#1447B4]">
          <FolderPlus className="w-4 h-4" /> Add Category
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Total Categories</p>
          <p className="text-2xl font-bold text-[#162B4D] mt-2">{categories.length}</p>
          <p className="text-xs text-gray-500 mt-1">All vendor item categories</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-2">{activeCount}</p>
          <p className="text-xs text-gray-500 mt-1">Currently active</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Inactive</p>
          <p className="text-2xl font-bold text-gray-400 mt-2">{inactiveCount}</p>
          <p className="text-xs text-gray-500 mt-1">Currently inactive</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <h2 className="font-bold text-[#162B4D]">All Categories</h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories..."
                className="pl-9 w-52"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading categories...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FolderOpen className="w-10 h-10 mx-auto text-gray-300" />
            <p className="text-sm font-semibold text-gray-500 mt-3">
              {categories.length === 0 ? "No categories yet" : "No categories match your filters"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {categories.length === 0 ? "Add your first vendor item category to get started." : "Try adjusting the search or status filter."}
            </p>
            {categories.length === 0 && (
              <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="mt-4 gap-2 bg-[#1A56DB] hover:bg-[#1447B4]">
                <FolderPlus className="w-4 h-4" /> Add Category
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                          <FolderOpen className="w-4 h-4" />
                        </div>
                        <p className="font-semibold text-[#162B4D]">{cat.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 max-w-xs">
                      {cat.description || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Boxes className="w-3.5 h-3.5 text-gray-400" />
                        <span>{itemCounts[cat.id] ?? 0}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cat.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {cat.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditing(cat); setModalOpen(true); }}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(cat)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CategoryModal
        open={modalOpen}
        category={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); setEditing(null); load(); }}
      />
    </div>
  );
}

function CategoryModal({ open, category, onClose, onSaved }: {
  open: boolean;
  category: VendorCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
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
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: description.trim(), status };
      if (category) {
        await apiFetch(`/api/vendor-items/categories/${category.id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast({ title: "Category updated" });
      } else {
        await apiFetch("/api/vendor-items/categories", { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Category created" });
      }
      onSaved();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Edit Category" : "Add Category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Category Name *</Label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Raw Chicken, Whole Fish, Packaging"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1A56DB] resize-none"
              rows={3}
              placeholder="What type of vendor items belong here?"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v: "active" | "inactive") => setStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4]">
              {saving ? "Saving..." : category ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
