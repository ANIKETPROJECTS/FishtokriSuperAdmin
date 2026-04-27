import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Truck, MapPin, Search, SlidersHorizontal,
  X, Clock, CheckCircle2, Package, XCircle, Phone, User, RefreshCw,
  ShoppingBag, History, CalendarDays, CircleDollarSign, Eye,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PaginationBar } from "@/components/pagination-bar";
import { usePaginated } from "@/hooks/use-paginated";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

function getAdminData() {
  try { return JSON.parse(localStorage.getItem("fishtokri_admin") || "null"); } catch { return null; }
}
function getToken() { return localStorage.getItem("fishtokri_token") || ""; }
function getBase() { return import.meta.env.BASE_URL?.replace(/\/$/, "") || ""; }

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${getBase()}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...(opts.headers ?? {}) },
  });
  if (!res.ok) { const e = await res.json().catch(() => ({ message: res.statusText })); throw new Error(e.message ?? "Request failed"); }
  return res.json();
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any; next?: string[] }> = {
  pending:          { label: "Pending",          color: "text-amber-600",   bg: "bg-amber-50 border-amber-200",   icon: Clock,         next: ["confirmed", "out_for_delivery", "cancelled"] },
  confirmed:        { label: "Confirmed",        color: "text-blue-600",    bg: "bg-blue-50 border-blue-200",     icon: CheckCircle2,  next: ["preparing", "out_for_delivery"] },
  preparing:        { label: "Preparing",        color: "text-purple-600",  bg: "bg-purple-50 border-purple-200", icon: Package,       next: ["out_for_delivery"] },
  out_for_delivery: { label: "Out for Delivery", color: "text-indigo-600",  bg: "bg-indigo-50 border-indigo-200", icon: Truck,         next: ["delivered", "cancelled"] },
  delivered:        { label: "Delivered",        color: "text-green-600",   bg: "bg-green-50 border-green-200",   icon: CheckCircle2,  next: [] },
  cancelled:        { label: "Cancelled",        color: "text-red-600",     bg: "bg-red-50 border-red-200",       icon: XCircle,       next: [] },
};

const ACTIVE_STATUSES  = ["pending", "confirmed", "preparing", "out_for_delivery"];
const HISTORY_STATUSES = ["delivered", "cancelled"];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "text-gray-600", bg: "bg-gray-50 border-gray-200", icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

function formatDate(d: any) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function formatRupees(n: number) { return `₹${Number(n || 0).toLocaleString("en-IN")}`; }
function orderTotal(o: any) {
  if (Number(o?.total) > 0) return Number(o.total);
  return (o?.items ?? []).reduce((s: number, i: any) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
}

// ─── ORDER DETAIL DIALOG ──────────────────────────────────────────────────────

function OrderDetailDialog({ order, onClose }: { order: any; onClose: () => void; }) {
  if (!order) return null;
  const total = orderTotal(order);
  const paid = Number(order.paidAmount || 0);
  const due = Math.max(0, total - paid);
  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-[#162B4D] flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-orange-500" /> Order #{String(order._id).slice(-6).toUpperCase()}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1 text-sm">
          <div className="flex items-center justify-between">
            <StatusBadge status={order.status} />
            <span className="text-[10px] text-gray-400">{formatDate(order.createdAt)}</span>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /><span className="font-semibold text-[#162B4D]">{order.customerName}</span></div>
            {order.phone && <div className="flex items-center gap-2 text-xs text-gray-500"><Phone className="w-3.5 h-3.5 text-gray-400" />{order.phone}</div>}
            {order.address && <div className="flex items-start gap-2 text-xs text-gray-500"><MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />{order.address}{order.deliveryArea ? `, ${order.deliveryArea}` : ""}</div>}
            {order.timeslotLabel && <div className="text-xs text-indigo-600 font-medium">Slot: {order.timeslotLabel}</div>}
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Items</p>
            <div className="space-y-1">
              {(order.items ?? []).map((i: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs border-b border-gray-100 last:border-0 py-1.5">
                  <span className="text-[#162B4D]">{i.name} <span className="text-gray-400">× {i.quantity}{i.unit ? ` ${i.unit}` : ""}</span></span>
                  <span className="font-semibold">{formatRupees(Number(i.price || 0) * Number(i.quantity || 1))}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-gray-100 pt-2.5 space-y-1">
            <div className="flex justify-between text-xs"><span className="text-gray-500">Total</span><span className="font-bold text-[#162B4D]">{formatRupees(total)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Paid</span><span className="font-semibold text-green-600">{formatRupees(paid)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Due</span><span className={`font-semibold ${due > 0 ? "text-amber-600" : "text-gray-500"}`}>{formatRupees(due)}</span></div>
          </div>
          {order.notes && <p className="text-[11px] text-gray-500 italic border-l-2 border-gray-200 pl-2">{order.notes}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="h-9">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ORDERS LIST (shared by both tabs) ────────────────────────────────────────

function OrdersList({ mode }: { mode: "active" | "history" }) {
  const { toast } = useToast();
  const admin = getAdminData();

  const allowedStatuses = mode === "active" ? ACTIVE_STATUSES : HISTORY_STATUSES;

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  const loadOrders = useCallback(async () => {
    if (!admin?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ assignedTo: admin.id, limit: "100" });
      if (statusFilter) params.set("status", statusFilter);
      else params.set("status", allowedStatuses.join(","));
      const data = await apiFetch(`/api/orders?${params}`);
      setOrders(data.orders ?? []);
    } catch { } finally { setLoading(false); }
  }, [admin?.id, statusFilter, allowedStatuses.join(",")]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const filtered = useMemo(() => orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.customerName?.toLowerCase().includes(q) ||
      o.phone?.includes(q) ||
      o.deliveryArea?.toLowerCase().includes(q) ||
      String(o._id).toLowerCase().includes(q.replace(/^#/, "")) ||
      (o.items ?? []).some((i: any) => i.name?.toLowerCase().includes(q));
  }), [orders, search]);

  const pagedOrders = usePaginated(filtered, 20, `${mode}|${search}|${statusFilter}`);

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !editStatus) return;
    setSaving(true);
    try {
      await apiFetch(`/api/orders/${selectedOrder._id}`, { method: "PUT", body: JSON.stringify({ status: editStatus }) });
      toast({ title: "Status updated successfully" });
      setSelectedOrder(null);
      loadOrders();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  // Summary stats for the active tab
  const summary = useMemo(() => {
    const totalRevenue = filtered.reduce((s, o) => s + Number(o.paidAmount || 0), 0);
    const totalValue   = filtered.reduce((s, o) => s + orderTotal(o), 0);
    return { count: filtered.length, totalRevenue, totalValue };
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by customer, phone, area, item or order #" className="pl-8 h-9 text-sm" />
          {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <Select value={statusFilter || "_all"} onValueChange={(v) => setStatusFilter(v === "_all" ? "" : v)}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 mr-1" />
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All {mode === "active" ? "active" : "history"}</SelectItem>
            {allowedStatuses.map((s) => <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadOrders} className="h-9 gap-1.5 text-gray-500">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} order{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Summary cards */}
      {mode === "history" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><History className="w-4 h-4 text-blue-600" /></div>
            <div><p className="text-xs text-gray-500">Total Past Orders</p><p className="text-lg font-bold text-[#162B4D]">{summary.count}</p></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center"><CircleDollarSign className="w-4 h-4 text-green-600" /></div>
            <div><p className="text-xs text-gray-500">Revenue Collected</p><p className="text-lg font-bold text-[#162B4D]">{formatRupees(summary.totalRevenue)}</p></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center"><CalendarDays className="w-4 h-4 text-purple-600" /></div>
            <div><p className="text-xs text-gray-500">Order Value</p><p className="text-lg font-bold text-[#162B4D]">{formatRupees(summary.totalValue)}</p></div>
          </div>
        </div>
      )}

      {/* Orders list */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-20 text-center">
          {mode === "active" ? <Truck className="w-10 h-10 text-gray-200 mx-auto mb-3" /> : <History className="w-10 h-10 text-gray-200 mx-auto mb-3" />}
          <p className="text-gray-400 font-medium">{mode === "active" ? "No active orders assigned to you" : "No past orders yet"}</p>
          <p className="text-xs text-gray-300 mt-1">{mode === "active" ? "Orders will appear here once admin assigns them" : "Completed and cancelled orders will appear here"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pagedOrders.pageItems.map((o) => {
            const cfg = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            const total = orderTotal(o);
            const paid = Number(o.paidAmount || 0);
            const due = Math.max(0, total - paid);
            return (
              <div key={String(o._id)} className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0 border`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[#162B4D] text-sm">{o.customerName}</p>
                        <span className="text-[10px] text-gray-400">#{String(o._id).slice(-6).toUpperCase()}</span>
                        <StatusBadge status={o.status} />
                      </div>
                      {o.phone && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{o.phone}</p>}
                      {o.address && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 text-gray-400" />{o.address}</p>}
                      {o.deliveryArea && <p className="text-[10px] text-gray-400">{o.deliveryArea}</p>}
                      <p className="text-xs text-gray-500 mt-1 truncate">{(o.items ?? []).map((i: any) => i.name).join(", ")}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {o.timeslotLabel && <p className="text-[10px] text-indigo-500 font-medium">{o.timeslotLabel}</p>}
                        {mode === "history" && (
                          <p className="text-[10px] text-gray-400">Paid {formatRupees(paid)} {due > 0 && <span className="text-amber-500">• Due {formatRupees(due)}</span>}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="font-bold text-[#162B4D]">{formatRupees(total)}</p>
                    <p className="text-[10px] text-gray-400">{formatDate(o.createdAt)}</p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setDetail(o)}
                        className="text-[11px] font-semibold text-gray-500 hover:text-[#1A56DB] bg-gray-50 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                      {(cfg.next?.length ?? 0) > 0 && (
                        <button
                          onClick={() => { setSelectedOrder(o); setEditStatus(o.status); }}
                          className="text-[11px] font-semibold text-[#1A56DB] bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors"
                        >
                          Update Status
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PaginationBar
        page={pagedOrders.page}
        pages={pagedOrders.pages}
        total={pagedOrders.total}
        onChange={pagedOrders.setPage}
        label="orders"
      />

      {/* Update Status Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(o) => !o && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-[420px]">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#162B4D] flex items-center gap-2">
                  <Truck className="w-4 h-4 text-orange-500" /> Update Order Status
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-[#162B4D] text-sm">{selectedOrder.customerName}</span>
                  </div>
                  {selectedOrder.address && (
                    <div className="flex items-start gap-2 text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />{selectedOrder.address}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 ml-5">{(selectedOrder.items ?? []).map((i: any) => i.name).join(", ")}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1.5 font-semibold uppercase tracking-wide">Current Status</p>
                  <StatusBadge status={selectedOrder.status} />
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Change To</p>
                  <div className="flex gap-2 flex-wrap">
                    {(STATUS_CONFIG[selectedOrder.status]?.next ?? []).map((s) => {
                      const cfg = STATUS_CONFIG[s];
                      const Icon = cfg.icon;
                      return (
                        <button
                          key={s}
                          onClick={() => setEditStatus(s)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${editStatus === s ? `${cfg.bg} ${cfg.color} border-current ring-2 ring-current/20` : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                        >
                          <Icon className="w-3.5 h-3.5" />{cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setSelectedOrder(null)} className="h-9">Cancel</Button>
                <Button
                  onClick={handleUpdateStatus}
                  disabled={saving || !editStatus || editStatus === selectedOrder.status}
                  className="bg-[#1A56DB] hover:bg-[#1447B4] h-9"
                >
                  {saving ? "Updating..." : "Confirm Update"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <OrderDetailDialog order={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function MyDeliveries() {
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
          <Truck className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#162B4D]">My Orders</h2>
          <p className="text-gray-500 text-sm mt-0.5">Manage active deliveries and review past orders.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white rounded-t-xl">
        <button
          onClick={() => setActiveTab("active")}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === "active" ? "border-[#1A56DB] text-[#1A56DB] bg-blue-50/40" : "border-transparent text-gray-400 hover:text-gray-600"}`}
        >
          <Truck className="w-4 h-4" /> Active Orders
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === "history" ? "border-[#1A56DB] text-[#1A56DB] bg-blue-50/40" : "border-transparent text-gray-400 hover:text-gray-600"}`}
        >
          <History className="w-4 h-4" /> Order History
        </button>
      </div>

      {activeTab === "active" ? <OrdersList mode="active" /> : <OrdersList mode="history" />}
    </div>
  );
}
