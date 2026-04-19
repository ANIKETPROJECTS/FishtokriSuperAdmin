import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Plus, Trash2, Search, ChevronLeft, ChevronRight, Pencil, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

function getToken() {
  return localStorage.getItem("fishtokri_token") ?? "";
}

function getAdminData() {
  try {
    const raw = localStorage.getItem("fishtokri_admin");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
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

function formatDate(dateStr: string | Date) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function toInputDate(d: Date) {
  return d.toISOString().split("T")[0];
}

type VendorItem = {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  itemType: string;
  categoryName: string;
};

type AdjustmentItem = {
  itemId: string;
  itemName: string;
  unit: string;
  quantityBefore: number;
  newQuantity: number | string;
  quantityAdjusted: number;
};

type StockAdjustment = {
  id: string;
  date: string;
  voucherNumber: number;
  reason: string;
  notes: string;
  status: "draft" | "approved";
  createdBy: string;
  items: AdjustmentItem[];
};

type FormRow = {
  itemId: string;
  itemName: string;
  unit: string;
  quantityBefore: number;
  newQuantity: string;
  search: string;
  showDropdown: boolean;
};

const REASONS = [
  "Stock damaged",
  "Stock wastage",
  "Stocking New Inventory",
  "EXTRA SKU",
  "SKU TRANSFER",
  "Stock correction",
  "Other",
];

export default function StockAdjustment() {
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "form">("list");
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [allItems, setAllItems] = useState<VendorItem[]>([]);

  const [formDate, setFormDate] = useState(toInputDate(new Date()));
  const [formReason, setFormReason] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formRows, setFormRows] = useState<FormRow[]>([
    { itemId: "", itemName: "", unit: "", quantityBefore: 0, newQuantity: "", search: "", showDropdown: false },
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const adminData = getAdminData();

  const loadAdjustments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      const data = await apiFetch(`/api/vendor-items/stock-adjustments?${params}`);
      setAdjustments(data.adjustments ?? []);
      setTotal(data.total ?? 0);
    } catch (err: any) {
      toast({ title: "Failed to load stock adjustments", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, toast]);

  const loadItems = useCallback(async () => {
    try {
      const data = await apiFetch("/api/vendor-items/items");
      setAllItems(data.items ?? []);
    } catch {
    }
  }, []);

  useEffect(() => {
    loadAdjustments();
  }, [loadAdjustments]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  function openAddForm() {
    setEditingId(null);
    setFormDate(toInputDate(new Date()));
    setFormReason("");
    setFormNotes("");
    setFormRows([{ itemId: "", itemName: "", unit: "", quantityBefore: 0, newQuantity: "", search: "", showDropdown: false }]);
    setView("form");
  }

  function openEditForm(adj: StockAdjustment) {
    setEditingId(adj.id);
    setFormDate(toInputDate(new Date(adj.date)));
    setFormReason(adj.reason);
    setFormNotes(adj.notes);
    setFormRows(
      adj.items.length > 0
        ? adj.items.map((it) => ({
            itemId: it.itemId,
            itemName: it.itemName,
            unit: it.unit,
            quantityBefore: it.quantityBefore,
            newQuantity: String(it.newQuantity),
            search: it.itemName,
            showDropdown: false,
          }))
        : [{ itemId: "", itemName: "", unit: "", quantityBefore: 0, newQuantity: "", search: "", showDropdown: false }],
    );
    setView("form");
  }

  function addRow() {
    setFormRows((rows) => [
      ...rows,
      { itemId: "", itemName: "", unit: "", quantityBefore: 0, newQuantity: "", search: "", showDropdown: false },
    ]);
  }

  function removeRow(index: number) {
    setFormRows((rows) => rows.filter((_, i) => i !== index));
  }

  function updateRow(index: number, patch: Partial<FormRow>) {
    setFormRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function selectItem(index: number, item: VendorItem) {
    setFormRows((rows) =>
      rows.map((r, i) =>
        i === index
          ? {
              ...r,
              itemId: item.id,
              itemName: item.name,
              unit: item.unit,
              quantityBefore: item.currentStock,
              search: item.name,
              showDropdown: false,
            }
          : r,
      ),
    );
  }

  function getFilteredItems(rowSearch: string, currentRowItemId: string) {
    const q = rowSearch.trim().toLowerCase();
    const usedIds = new Set(formRows.map((r) => r.itemId).filter(Boolean));
    return allItems.filter((item) => {
      if (usedIds.has(item.id) && item.id !== currentRowItemId) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.categoryName.toLowerCase().includes(q);
    });
  }

  async function handleSave() {
    const validRows = formRows.filter((r) => r.itemId && r.newQuantity !== "");
    if (validRows.length === 0) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }
    if (!formReason.trim()) {
      toast({ title: "Reason is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date: formDate,
        reason: formReason,
        notes: formNotes,
        items: validRows.map((r) => ({
          itemId: r.itemId,
          newQuantity: Number(r.newQuantity),
        })),
      };
      if (editingId) {
        await apiFetch(`/api/vendor-items/stock-adjustments/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast({ title: "Stock adjustment updated" });
      } else {
        await apiFetch("/api/vendor-items/stock-adjustments", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast({ title: "Stock adjustment saved" });
      }
      setView("list");
      loadAdjustments();
      loadItems();
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiFetch(`/api/vendor-items/stock-adjustments/${id}`, { method: "DELETE" });
      toast({ title: "Stock adjustment deleted" });
      setDeleteId(null);
      loadAdjustments();
      loadItems();
    } catch (err: any) {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    }
  }

  if (view === "form") {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView("list")}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-bold text-[#162B4D]">
            {editingId ? "Edit Stock Adjustment" : "Add Stock Adjustment"}
          </h1>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                placeholder="Enter reason"
                className="h-9"
                list="reason-list"
              />
              <datalist id="reason-list">
                {REASONS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Notes</Label>
              <Input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Write notes here..."
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="bg-gray-50 border border-gray-100 rounded-lg">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-[35%]">
                      Item Details <span className="text-red-500">*</span>
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-[12%]">Unit</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-[15%]">Qty Available</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-[18%]">New Qty On Hand</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-[14%]">Qty Adjusted</th>
                    <th className="px-3 py-2.5 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {formRows.map((row, idx) => {
                    const newQtyNum = row.newQuantity === "" ? NaN : Number(row.newQuantity);
                    const adjusted = isNaN(newQtyNum) ? 0 : newQtyNum - row.quantityBefore;
                    const filteredItems = getFilteredItems(row.search, row.itemId);

                    return (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 relative">
                          <div className="relative">
                            <div className="flex items-center gap-1">
                              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <Input
                                value={row.search}
                                onChange={(e) => {
                                  updateRow(idx, { search: e.target.value, showDropdown: true, itemId: "", itemName: "", unit: "", quantityBefore: 0 });
                                }}
                                onFocus={() => updateRow(idx, { showDropdown: true })}
                                onBlur={() => setTimeout(() => updateRow(idx, { showDropdown: false }), 150)}
                                placeholder="Choose Item"
                                className="h-8 pl-8 text-sm"
                              />
                              {row.itemId && (
                                <button
                                  onClick={() => updateRow(idx, { itemId: "", itemName: "", unit: "", quantityBefore: 0, search: "", showDropdown: false })}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            {row.showDropdown && filteredItems.length > 0 && (
                              <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                                {filteredItems.slice(0, 20).map((item) => (
                                  <button
                                    key={item.id}
                                    onMouseDown={() => selectItem(idx, item)}
                                    className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between gap-2"
                                  >
                                    <div>
                                      <p className="text-sm font-medium text-gray-800">{item.name}</p>
                                      <p className="text-xs text-gray-400">{item.categoryName}</p>
                                    </div>
                                    <span className="text-xs text-gray-400 flex-shrink-0">{item.currentStock} {item.unit}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-sm text-gray-600">{row.unit || "—"}</span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="text-sm text-gray-700">{row.itemId ? row.quantityBefore : "—"}</span>
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={row.newQuantity}
                            onChange={(e) => updateRow(idx, { newQuantity: e.target.value })}
                            placeholder="0"
                            className="h-8 text-sm text-right"
                            disabled={!row.itemId}
                            min={0}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          {row.itemId && row.newQuantity !== "" ? (
                            <span
                              className={`text-sm font-semibold ${
                                adjusted > 0 ? "text-emerald-600" : adjusted < 0 ? "text-red-500" : "text-gray-500"
                              }`}
                            >
                              {adjusted > 0 ? `+${adjusted}` : adjusted}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => removeRow(idx)}
                            disabled={formRows.length === 1}
                            className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              onClick={addRow}
              className="flex items-center gap-1.5 text-sm text-[#1A56DB] hover:text-[#1447B4] font-medium mt-1 px-1"
            >
              <Plus className="w-4 h-4" />
              Add Row
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setView("list")} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#1A56DB] hover:bg-[#1447B4] min-w-[80px]"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#162B4D]">Stock Adjustment</h1>
          <p className="text-sm text-gray-500 mt-1">Increase or decrease stock levels for multiple items at once.</p>
        </div>
        <Button
          onClick={openAddForm}
          className="gap-2 bg-[#1A56DB] hover:bg-[#1447B4]"
        >
          <Plus className="w-4 h-4" />
          Add Stock Adjustment
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-[#162B4D]">Stock Adjustments</h2>
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{total}</span>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by reason..."
              className="pl-9 h-9 w-56"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="bg-gray-50 text-left border-b border-gray-100">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Voucher No</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Created By</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : adjustments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                    No stock adjustments found.{" "}
                    <button onClick={openAddForm} className="text-[#1A56DB] hover:underline">
                      Add one now.
                    </button>
                  </td>
                </tr>
              ) : (
                adjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700">{formatDate(adj.date)}</td>
                    <td className="px-4 py-3 text-gray-700 font-mono">{adj.voucherNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{adj.reason || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {adj.items.slice(0, 3).map((it, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                            {it.itemName}
                            <span className={`ml-1 font-semibold ${it.quantityAdjusted > 0 ? "text-emerald-600" : it.quantityAdjusted < 0 ? "text-red-500" : "text-gray-400"}`}>
                              ({it.quantityAdjusted > 0 ? `+${it.quantityAdjusted}` : it.quantityAdjusted})
                            </span>
                          </span>
                        ))}
                        {adj.items.length > 3 && (
                          <span className="text-xs text-gray-400">+{adj.items.length - 3} more</span>
                        )}
                        {adj.items.length === 0 && <span className="text-gray-400 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" />
                        Approved
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{adj.createdBy}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditForm(adj)}
                          className="h-8 w-8 p-0"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteId(adj.id)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:border-red-200"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} Results
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = i + 1;
                return (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(p)}
                    className={`h-8 w-8 p-0 ${p === page ? "bg-[#162B4D] hover:bg-[#1e3a6e] text-white" : ""}`}
                  >
                    {p}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Stock Adjustment?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            This will reverse all stock changes made by this adjustment. This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
