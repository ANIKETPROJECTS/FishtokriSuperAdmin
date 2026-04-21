import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search, Eye, Trash2, Download, Plus, RefreshCw, AlertTriangle,
  ChevronLeft, ChevronRight, X, Receipt, MoreVertical, Edit2,
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

interface RetailItem {
  id?: string;
  productName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
}
interface RetailInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  partyName: string;
  partyPhone: string;
  paymentMode: string;
  status: "paid" | "draft" | "cancelled" | "due";
  items: RetailItem[];
  subtotal: number;
  discount: number;
  tax: number;
  dueAmount: number;
  total: number;
  notes: string;
  createdByName?: string;
}

const PAYMENT_MODES = ["CASH", "GPAY", "UPI", "CARD", "BANK", "-"];
const STATUS_OPTS = [
  { value: "paid", label: "Paid", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "due", label: "Due", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "draft", label: "Draft", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "cancelled", label: "Cancelled", cls: "bg-rose-100 text-rose-700 border-rose-200" },
];
const STATUS_FILTERS = [{ value: "all", label: "All" }, ...STATUS_OPTS];

function StatusBadge({ status }: { status: string }) {
  const opt = STATUS_OPTS.find(s => s.value === status) ?? STATUS_OPTS[0];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${opt.cls}`}>{opt.label}</span>;
}

const emptyItem = (): RetailItem => ({ productName: "", quantity: 1, unit: "pc", pricePerUnit: 0, totalPrice: 0 });

const emptyForm = () => ({
  invoiceNumber: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  partyName: "",
  partyPhone: "",
  paymentMode: "CASH",
  status: "paid" as RetailInvoice["status"],
  items: [emptyItem()] as RetailItem[],
  discount: 0,
  tax: 0,
  dueAmount: 0,
  notes: "",
});

export default function RetailInvoicesPage() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<RetailInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 10;

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [sort, setSort] = useState("date_desc");
  const [showFilters, setShowFilters] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewTarget, setViewTarget] = useState<RetailInvoice | null>(null);
  const [editTarget, setEditTarget] = useState<RetailInvoice | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RetailInvoice | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT), sort });
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (paymentFilter !== "all") params.set("paymentMode", paymentFilter);
      const data = await apiFetch(`/api/retail-invoices?${params}`);
      setInvoices(data.invoices || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      toast({ title: "Failed to load retail invoices", description: e.message, variant: "destructive" });
      setInvoices([]); setTotal(0);
    } finally { setLoading(false); }
  }, [page, sort, search, statusFilter, paymentFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const openAdd = async () => {
    setForm(emptyForm());
    setAddOpen(true);
    setEditTarget(null);
    try {
      const d = await apiFetch("/api/retail-invoices/next-invoice-number");
      if (d?.invoiceNumber) setForm(f => ({ ...f, invoiceNumber: d.invoiceNumber }));
    } catch { /* ignore */ }
  };

  const openEdit = (inv: RetailInvoice) => {
    setEditTarget(inv);
    setAddOpen(true);
    setForm({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      partyName: inv.partyName,
      partyPhone: inv.partyPhone,
      paymentMode: inv.paymentMode,
      status: inv.status,
      items: inv.items.length ? inv.items.map(i => ({ ...i })) : [emptyItem()],
      discount: inv.discount,
      tax: inv.tax,
      dueAmount: inv.dueAmount,
      notes: inv.notes,
    });
  };

  const setItem = (idx: number, patch: Partial<RetailItem>) => {
    setForm(f => {
      const items = f.items.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, ...patch };
        next.totalPrice = (Number(next.quantity) || 0) * (Number(next.pricePerUnit) || 0);
        return next;
      });
      return { ...f, items };
    });
  };
  const addRow = () => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeRow = (idx: number) => setForm(f => ({ ...f, items: f.items.length === 1 ? f.items : f.items.filter((_, i) => i !== idx) }));

  const subtotal = useMemo(() => form.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.pricePerUnit) || 0), 0), [form.items]);
  const totalAmount = Math.max(0, subtotal - (Number(form.discount) || 0) + (Number(form.tax) || 0));

  const save = async () => {
    if (!form.partyName.trim()) { toast({ title: "Party name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const body = JSON.stringify(form);
      if (editTarget) {
        await apiFetch(`/api/retail-invoices/${editTarget.id}`, { method: "PUT", body });
        toast({ title: "Retail invoice updated" });
      } else {
        await apiFetch("/api/retail-invoices", { method: "POST", body });
        toast({ title: "Retail invoice created" });
      }
      setAddOpen(false); setEditTarget(null); setForm(emptyForm());
      load();
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    try {
      await apiFetch(`/api/retail-invoices/${deleteTarget.id}`, { method: "DELETE" });
      toast({ title: "Invoice deleted" });
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally { setDeleteSaving(false); }
  };

  const downloadInvoice = (inv: RetailInvoice) => {
    const rows = (inv.items || []).map((it, i) =>
      `${i + 1},${it.productName.replace(/,/g, " ")},${it.quantity},${it.unit},${it.pricePerUnit},${it.totalPrice}`
    ).join("\n");
    const csv = `Retail Invoice,${inv.invoiceNumber}\nParty,${inv.partyName}\nDate,${formatDateDDMMYYYY(inv.invoiceDate)}\nPayment Mode,${inv.paymentMode}\nStatus,${inv.status}\nSubtotal,${inv.subtotal}\nDiscount,${inv.discount}\nTax,${inv.tax}\nDue Amount,${inv.dueAmount}\nTotal,${inv.total}\n\n#,Item,Qty,Unit,Price,Total\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `retail-${inv.invoiceNumber || inv.id}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => setSelected(prev => prev.size === invoices.length ? new Set() : new Set(invoices.map(i => i.id)));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#162B4D] text-white flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#162B4D]">Retail Invoices</h1>
            <p className="text-xs text-gray-500">{total} retail invoice{total !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button className="h-9 bg-[#1A56DB] hover:bg-[#1e40af] text-white gap-1.5" onClick={openAdd}>
            <Plus className="w-4 h-4" /> Add Invoice
          </Button>
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
              placeholder="Search by party or invoice no."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#162B4D]/20 focus:bg-white"
            />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_FILTERS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={v => { setPaymentFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm w-[140px]"><SelectValue placeholder="Payment Mode" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              {PAYMENT_MODES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-9 px-3 text-gray-600" onClick={() => setShowFilters(s => !s)}>More Options</Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-gray-500 text-[11px] uppercase tracking-wider">
                <th className="px-3 py-3 text-left w-9">
                  <input type="checkbox"
                    checked={invoices.length > 0 && selected.size === invoices.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300" />
                </th>
                <th className="px-3 py-3 text-left font-semibold">Date</th>
                <th className="px-3 py-3 text-left font-semibold">Retail Invoice No.</th>
                <th className="px-3 py-3 text-left font-semibold">Party Name</th>
                <th className="px-3 py-3 text-left font-semibold">Payment Mode</th>
                <th className="px-3 py-3 text-left font-semibold">Status</th>
                <th className="px-3 py-3 text-right font-semibold">Subtotal</th>
                <th className="px-3 py-3 text-right font-semibold">Discount</th>
                <th className="px-3 py-3 text-right font-semibold">Tax</th>
                <th className="px-3 py-3 text-right font-semibold">Due Amount</th>
                <th className="px-3 py-3 text-right font-semibold">Total</th>
                <th className="px-3 py-3 text-center font-semibold w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td colSpan={12} className="px-3 py-4"><div className="h-6 bg-gray-100 rounded animate-pulse" /></td>
                </tr>
              )) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-3 py-16 text-center">
                    <Receipt className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">No retail invoices yet</p>
                    <p className="text-gray-400 text-xs mt-1">Click "Add Invoice" to create your first retail invoice</p>
                  </td>
                </tr>
              ) : invoices.map(inv => (
                <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50/60">
                  <td className="px-3 py-3"><input type="checkbox" checked={selected.has(inv.id)} onChange={() => toggleSelect(inv.id)} className="rounded border-gray-300" /></td>
                  <td className="px-3 py-3 text-gray-700">{formatDateDDMMYYYY(inv.invoiceDate)}</td>
                  <td className="px-3 py-3 font-medium text-[#162B4D]">{inv.invoiceNumber || "—"}</td>
                  <td className="px-3 py-3 text-gray-700">{inv.partyName}</td>
                  <td className="px-3 py-3 text-gray-600">{inv.paymentMode || "—"}</td>
                  <td className="px-3 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-3 py-3 text-right text-gray-700">{formatRupees(inv.subtotal)}</td>
                  <td className="px-3 py-3 text-right text-gray-600">{formatRupees(inv.discount)}</td>
                  <td className="px-3 py-3 text-right text-gray-600">{formatRupees(inv.tax)}</td>
                  <td className="px-3 py-3 text-right text-gray-600">{formatRupees(inv.dueAmount)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-gray-900">{formatRupees(inv.total)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button title="View" onClick={() => setViewTarget(inv)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Eye className="w-4 h-4" /></button>
                      <button title="Edit" onClick={() => openEdit(inv)} className="p-1.5 rounded hover:bg-amber-50 text-amber-600"><Edit2 className="w-4 h-4" /></button>
                      <button title="Download" onClick={() => downloadInvoice(inv)} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600"><Download className="w-4 h-4" /></button>
                      <button title="Delete" onClick={() => setDeleteTarget(inv)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
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
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft className="w-3.5 h-3.5" /></Button>
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              const p = i + 1;
              return <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 text-xs rounded ${p === page ? "bg-[#1A56DB] text-white" : "text-gray-600 hover:bg-gray-200"}`}>{p}</button>;
            })}
            {totalPages > 5 && <span className="px-1">…</span>}
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}><ChevronRight className="w-3.5 h-3.5" /></Button>
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={addOpen} onOpenChange={open => { if (!open) { setAddOpen(false); setEditTarget(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Retail Invoice" : "Create Retail Invoice"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Invoice No.</Label>
                <Input value={form.invoiceNumber} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} placeholder="TH001" />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={form.invoiceDate} onChange={e => setForm(f => ({ ...f, invoiceDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Party Name *</Label>
                <Input value={form.partyName} onChange={e => setForm(f => ({ ...f, partyName: e.target.value }))} placeholder="Customer name" />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={form.partyPhone} onChange={e => setForm(f => ({ ...f, partyPhone: e.target.value }))} placeholder="Optional" />
              </div>
              <div>
                <Label className="text-xs">Payment Mode</Label>
                <Select value={form.paymentMode} onValueChange={v => setForm(f => ({ ...f, paymentMode: v }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_MODES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 grid items-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
                style={{ gridTemplateColumns: "2rem 1.6fr 4rem 4rem 5rem 5rem 2rem", gap: "0.5rem" }}>
                <span>#</span><span>Item</span><span>Qty</span><span>Unit</span><span>Price</span><span className="text-right">Total</span><span />
              </div>
              <div className="divide-y divide-gray-100">
                {form.items.map((it, idx) => (
                  <div key={idx} className="px-3 py-2 grid items-center text-sm"
                    style={{ gridTemplateColumns: "2rem 1.6fr 4rem 4rem 5rem 5rem 2rem", gap: "0.5rem" }}>
                    <span className="text-xs font-bold text-gray-400">{idx + 1}</span>
                    <Input className="h-8" value={it.productName} onChange={e => setItem(idx, { productName: e.target.value })} placeholder="Item name" />
                    <Input className="h-8" type="number" min={0} value={it.quantity} onChange={e => setItem(idx, { quantity: Number(e.target.value) })} />
                    <Input className="h-8" value={it.unit} onChange={e => setItem(idx, { unit: e.target.value })} />
                    <Input className="h-8" type="number" min={0} value={it.pricePerUnit} onChange={e => setItem(idx, { pricePerUnit: Number(e.target.value) })} />
                    <span className="text-right text-sm font-medium text-gray-700">{formatRupees(it.totalPrice)}</span>
                    <button type="button" onClick={() => removeRow(idx)} className="text-gray-300 hover:text-red-500" disabled={form.items.length === 1}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="px-3 py-2 border-t border-gray-100">
                <button type="button" onClick={addRow} className="text-sm text-[#1A56DB] hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add Row
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Notes</Label>
                <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#162B4D]/20 resize-none" />
              </div>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between"><span className="text-gray-500">Subtotal</span><span className="font-medium">{formatRupees(subtotal)}</span></div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500 shrink-0">Discount</span>
                  <Input className="h-8 w-28 text-right" type="number" min={0} value={form.discount} onChange={e => setForm(f => ({ ...f, discount: Number(e.target.value) }))} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500 shrink-0">Tax</span>
                  <Input className="h-8 w-28 text-right" type="number" min={0} value={form.tax} onChange={e => setForm(f => ({ ...f, tax: Number(e.target.value) }))} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500 shrink-0">Due Amount</span>
                  <Input className="h-8 w-28 text-right" type="number" min={0} value={form.dueAmount} onChange={e => setForm(f => ({ ...f, dueAmount: Number(e.target.value) }))} />
                </div>
                <div className="border-t border-gray-200 pt-2 flex items-center justify-between font-semibold">
                  <span className="text-[#162B4D]">Total</span><span className="text-[#162B4D]">{formatRupees(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditTarget(null); }} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-[#162B4D] hover:bg-[#1e3a6e] text-white">
              {saving ? "Saving..." : editTarget ? "Save Changes" : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewTarget} onOpenChange={open => !open && setViewTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewTarget?.invoiceNumber || "Invoice"} <StatusBadge status={viewTarget?.status || "paid"} />
            </DialogTitle>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-500">Party:</span> <span className="font-medium">{viewTarget.partyName}</span></div>
                <div><span className="text-gray-500">Date:</span> <span className="font-medium">{formatDateDDMMYYYY(viewTarget.invoiceDate)}</span></div>
                <div><span className="text-gray-500">Payment:</span> <span className="font-medium">{viewTarget.paymentMode}</span></div>
                <div className="text-right"><span className="text-gray-500">Total:</span> <span className="font-bold text-[#162B4D]">{formatRupees(viewTarget.total)}</span></div>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr className="text-gray-500"><th className="px-2 py-2 text-left">Item</th><th className="px-2 py-2 text-right">Qty</th><th className="px-2 py-2 text-right">Price</th><th className="px-2 py-2 text-right">Total</th></tr>
                  </thead>
                  <tbody>
                    {viewTarget.items.map((it, i) => (
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
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-gray-500">Subtotal:</span> <span className="font-medium">{formatRupees(viewTarget.subtotal)}</span></div>
                <div><span className="text-gray-500">Discount:</span> <span className="font-medium">{formatRupees(viewTarget.discount)}</span></div>
                <div><span className="text-gray-500">Tax:</span> <span className="font-medium">{formatRupees(viewTarget.tax)}</span></div>
                <div><span className="text-gray-500">Due:</span> <span className="font-medium">{formatRupees(viewTarget.dueAmount)}</span></div>
              </div>
              {viewTarget.notes && <p className="text-xs text-gray-500 italic">Note: {viewTarget.notes}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTarget(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="w-5 h-5" /> Delete Invoice</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            Delete invoice <strong>{deleteTarget?.invoiceNumber || ""}</strong> for <strong>{deleteTarget?.partyName}</strong>? This cannot be undone.
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
