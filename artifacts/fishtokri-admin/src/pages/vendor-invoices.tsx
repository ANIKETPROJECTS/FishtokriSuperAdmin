import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Search, Eye, Edit2, Trash2, Download, MoreVertical, ChevronLeft, ChevronRight,
  Plus, Filter, RefreshCw, AlertTriangle, ArrowUpDown, FileText, Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, formatRupees, formatDateDDMMYYYY } from "@/lib/api";

interface Invoice {
  id: string;
  invoiceNumber: string;
  purchaseDate: string;
  vendorId: string;
  vendorName: string;
  totalAmount: number;
  status?: "draft" | "saved";
  notes?: string;
  items: any[];
  createdByName?: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "saved", label: "Sent" },
  { value: "draft", label: "Draft" },
];

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "saved").toLowerCase();
  if (s === "draft") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700 border border-amber-200">Draft</span>;
  }
  if (s === "cancelled") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-100 text-rose-700 border border-rose-200">Cancelled</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">Sent</span>;
}

export default function VendorInvoices() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 10;

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState("date_desc");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewTarget, setViewTarget] = useState<Invoice | null>(null);
  const [editTarget, setEditTarget] = useState<Invoice | null>(null);
  const [editForm, setEditForm] = useState({ invoiceNumber: "", purchaseDate: "", notes: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT), sort });
      if (search) params.set("search", search);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const data = await apiFetch(`/api/vendors/all-purchases?${params}`);
      let list: Invoice[] = data.purchases || [];
      // status filter is client-side because the backend list doesn't filter by status yet
      if (statusFilter !== "all") {
        list = list.filter(i => (i.status || "saved") === statusFilter);
      }
      setInvoices(list);
      setTotal(statusFilter === "all" ? data.total : list.length);
    } catch (e: any) {
      toast({ title: "Failed to load invoices", description: e.message, variant: "destructive" });
      setInvoices([]); setTotal(0);
    } finally { setLoading(false); }
  }, [page, sort, search, dateFrom, dateTo, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    setSelected(prev => prev.size === invoices.length ? new Set() : new Set(invoices.map(i => i.id)));
  };

  const openEdit = (inv: Invoice) => {
    setEditTarget(inv);
    const d = inv.purchaseDate ? new Date(inv.purchaseDate).toISOString().slice(0, 10) : "";
    setEditForm({ invoiceNumber: inv.invoiceNumber || "", purchaseDate: d, notes: inv.notes || "" });
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      await apiFetch(`/api/vendors/purchases/${editTarget.id}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });
      toast({ title: "Invoice updated" });
      setEditTarget(null);
      load();
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally { setEditSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    try {
      await apiFetch(`/api/vendors/purchases/${deleteTarget.id}`, { method: "DELETE" });
      toast({ title: "Invoice deleted" });
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally { setDeleteSaving(false); }
  };

  const downloadInvoice = (inv: Invoice) => {
    const rows = (inv.items || []).map((it: any, i: number) =>
      `${i + 1},${(it.productName || "").replace(/,/g, " ")},${Number(it.quantity || 0)},${it.unit || ""},${Number(it.pricePerUnit || 0)},${Number(it.totalPrice || 0)}`
    ).join("\n");
    const csv = `Invoice,${inv.invoiceNumber || inv.id}\nVendor,${inv.vendorName}\nDate,${formatDateDDMMYYYY(inv.purchaseDate)}\nStatus,${inv.status || "saved"}\nTotal,${inv.totalAmount}\n\n#,Item,Qty,Unit,Price,Total\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `invoice-${inv.invoiceNumber || inv.id}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#162B4D] text-white flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#162B4D]">Invoices</h1>
            <p className="text-xs text-gray-500">{total} invoice{total !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link href="/vendors">
            <Button className="h-9 bg-[#1A56DB] hover:bg-[#1e40af] text-white gap-1.5">
              <Plus className="w-4 h-4" /> Add Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by vendor or invoice no."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#162B4D]/20 focus:border-[#162B4D]/40 focus:bg-white"
            />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={v => { setSort(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm w-[150px] gap-1">
              <ArrowUpDown className="w-3 h-3 text-gray-400" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Newest First</SelectItem>
              <SelectItem value="date_asc">Oldest First</SelectItem>
              <SelectItem value="amount_desc">Highest Amount</SelectItem>
              <SelectItem value="amount_asc">Lowest Amount</SelectItem>
              <SelectItem value="vendor_asc">Vendor A–Z</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant={showFilters ? "default" : "outline"}
            className={`h-9 px-3 gap-1.5 ${showFilters ? "bg-[#162B4D] text-white" : "text-gray-600"}`}
            onClick={() => setShowFilters(s => !s)}
          >
            <Filter className="w-3.5 h-3.5" /> More Options
          </Button>
        </div>
        {showFilters && (
          <div className="border-t border-gray-100 pt-3 flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">From date</label>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="h-9 px-2 rounded-lg border border-gray-200 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">To date</label>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="h-9 px-2 rounded-lg border border-gray-200 text-sm" />
            </div>
            {(dateFrom || dateTo) && (
              <Button size="sm" variant="ghost" className="h-9 text-xs text-gray-500" onClick={() => { setDateFrom(""); setDateTo(""); }}>
                Clear dates
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-gray-500 text-[11px] uppercase tracking-wider">
                <th className="px-3 py-3 text-left w-9">
                  <input type="checkbox"
                    checked={invoices.length > 0 && selected.size === invoices.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300" />
                </th>
                <th className="px-3 py-3 text-left font-semibold">Date</th>
                <th className="px-3 py-3 text-left font-semibold">Invoice No.</th>
                <th className="px-3 py-3 text-left font-semibold">Party Name</th>
                <th className="px-3 py-3 text-left font-semibold">Status</th>
                <th className="px-3 py-3 text-right font-semibold">Amount</th>
                <th className="px-3 py-3 text-right font-semibold">Due Amount</th>
                <th className="px-3 py-3 text-center font-semibold w-44">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td colSpan={8} className="px-3 py-4">
                      <div className="h-6 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-16 text-center">
                    <FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">No invoices found</p>
                    <p className="text-gray-400 text-xs mt-1">Drafts and saved invoices will appear here</p>
                  </td>
                </tr>
              ) : invoices.map(inv => (
                <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={selected.has(inv.id)} onChange={() => toggleSelect(inv.id)} className="rounded border-gray-300" />
                  </td>
                  <td className="px-3 py-3 text-gray-700">{formatDateDDMMYYYY(inv.purchaseDate)}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 font-medium text-[#162B4D]">
                      <Hash className="w-3 h-3 text-gray-400" />
                      {inv.invoiceNumber || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-700">{inv.vendorName || "—"}</td>
                  <td className="px-3 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-3 py-3 text-right font-semibold text-gray-800">{formatRupees(inv.totalAmount)}</td>
                  <td className="px-3 py-3 text-right text-gray-500">{formatRupees(0)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button title="View" onClick={() => setViewTarget(inv)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button title="Edit" onClick={() => openEdit(inv)} className="p-1.5 rounded hover:bg-amber-50 text-amber-600">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button title="Download" onClick={() => downloadInvoice(inv)} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600">
                        <Download className="w-4 h-4" />
                      </button>
                      <button title="Delete" onClick={() => setDeleteTarget(inv)} className="p-1.5 rounded hover:bg-red-50 text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
          <div>Showing {invoices.length === 0 ? 0 : (page - 1) * LIMIT + 1}–{(page - 1) * LIMIT + invoices.length} of {total} Results</div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              const p = i + 1;
              return (
                <button key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 text-xs rounded ${p === page ? "bg-[#1A56DB] text-white" : "text-gray-600 hover:bg-gray-200"}`}>{p}</button>
              );
            })}
            {totalPages > 5 && <span className="px-1">…</span>}
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* View dialog */}
      <Dialog open={!!viewTarget} onOpenChange={open => !open && setViewTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Invoice {viewTarget?.invoiceNumber || ""} <StatusBadge status={viewTarget?.status} />
            </DialogTitle>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-500">Vendor:</span> <span className="font-medium">{viewTarget.vendorName}</span></div>
                <div><span className="text-gray-500">Date:</span> <span className="font-medium">{formatDateDDMMYYYY(viewTarget.purchaseDate)}</span></div>
                <div><span className="text-gray-500">Created by:</span> <span className="font-medium">{viewTarget.createdByName || "—"}</span></div>
                <div className="text-right"><span className="text-gray-500">Total:</span> <span className="font-bold text-[#162B4D]">{formatRupees(viewTarget.totalAmount)}</span></div>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr className="text-gray-500"><th className="px-2 py-2 text-left">Item</th><th className="px-2 py-2 text-right">Qty</th><th className="px-2 py-2 text-right">Price</th><th className="px-2 py-2 text-right">Total</th></tr>
                  </thead>
                  <tbody>
                    {(viewTarget.items || []).map((it: any, i: number) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-2 py-2">{it.productName}</td>
                        <td className="px-2 py-2 text-right">{it.quantity} {it.unit}</td>
                        <td className="px-2 py-2 text-right">{formatRupees(it.pricePerUnit)}</td>
                        <td className="px-2 py-2 text-right font-medium">{formatRupees(it.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {viewTarget.notes && <p className="text-xs text-gray-500 italic">Note: {viewTarget.notes}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTarget(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Invoice Number</Label>
              <Input value={editForm.invoiceNumber} onChange={e => setEditForm(f => ({ ...f, invoiceNumber: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={editForm.purchaseDate} onChange={e => setEditForm(f => ({ ...f, purchaseDate: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <textarea rows={3} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#162B4D]/20 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={editSaving}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={editSaving} className="bg-[#162B4D] hover:bg-[#1e3a6e] text-white">
              {editSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> Delete Invoice
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            Delete invoice <strong>{deleteTarget?.invoiceNumber || ""}</strong> from <strong>{deleteTarget?.vendorName}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteSaving}>Cancel</Button>
            <Button onClick={handleDelete} disabled={deleteSaving} className="bg-red-600 hover:bg-red-700 text-white">
              {deleteSaving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
