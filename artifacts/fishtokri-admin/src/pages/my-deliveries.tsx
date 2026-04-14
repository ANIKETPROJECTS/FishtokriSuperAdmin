import { useState, useEffect, useCallback } from "react";
import {
  Truck, MapPin, Building2, Store, Search, ArrowUpDown, SlidersHorizontal,
  X, Clock, CheckCircle2, Package, XCircle, Phone, User, RefreshCw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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

const DELIVERY_STATUSES = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"];

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
function orderTotal(items: any[]) { return (items ?? []).reduce((s: number, i: any) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0); }

// ─── MY ORDERS TAB ─────────────────────────────────────────────────────────────

function MyOrdersTab() {
  const { toast } = useToast();
  const admin = getAdminData();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!admin?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ assignedTo: admin.id, limit: "100" });
      if (statusFilter) params.set("status", statusFilter);
      const data = await apiFetch(`/api/orders?${params}`);
      setOrders(data.orders ?? []);
    } catch { } finally { setLoading(false); }
  }, [admin?.id, statusFilter]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.customerName?.toLowerCase().includes(q) ||
      o.phone?.includes(q) ||
      o.deliveryArea?.toLowerCase().includes(q) ||
      (o.items ?? []).some((i: any) => i.name?.toLowerCase().includes(q));
  });

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !editStatus) return;
    setSaving(true);
    try {
      await apiFetch(`/api/orders/${selectedOrder._id}`, { method: "PUT", body: JSON.stringify({ status: editStatus }) });
      toast({ title: "Status updated successfully" });
      setSelectedOrder((o: any) => ({ ...o, status: editStatus }));
      setOrders((prev) => prev.map((o) => String(o._id) === String(selectedOrder._id) ? { ...o, status: editStatus } : o));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders..." className="pl-8 h-9 text-sm" />
          {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <Select value={statusFilter || "_all"} onValueChange={(v) => setStatusFilter(v === "_all" ? "" : v)}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 mr-1" />
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All statuses</SelectItem>
            {DELIVERY_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
        <button onClick={loadOrders} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1A56DB] border border-gray-200 rounded-lg px-3 py-1.5 hover:border-[#1A56DB] transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} order{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-20 text-center">
          <Truck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No orders assigned to you yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => {
            const cfg = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.pending;
            const Icon = cfg.icon;
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
                        <StatusBadge status={o.status} />
                      </div>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{o.phone}</p>
                      {o.address && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 text-gray-400" />{o.address}</p>}
                      {o.deliveryArea && <p className="text-[10px] text-gray-400">{o.deliveryArea}</p>}
                      <p className="text-xs text-gray-500 mt-1 truncate">{(o.items ?? []).map((i: any) => i.name).join(", ")}</p>
                      {o.timeslotLabel && <p className="text-[10px] text-indigo-500 font-medium mt-0.5">{o.timeslotLabel}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="font-bold text-[#162B4D]">{formatRupees(orderTotal(o.items))}</p>
                    <p className="text-[10px] text-gray-400">{formatDate(o.createdAt)}</p>
                    {(cfg.next?.length ?? 0) > 0 && (
                      <button
                        onClick={() => { setSelectedOrder(o); setEditStatus(o.status); }}
                        className="text-xs font-semibold text-[#1A56DB] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        Update Status
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Update Status Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(o) => !o && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-[400px]">
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
    </div>
  );
}

// ─── MY HUBS TAB ───────────────────────────────────────────────────────────────

function MyHubsTab() {
  const admin = getAdminData();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"super" | "sub">("super");
  const [superHubs, setSuperHubs] = useState<any[]>([]);
  const [subHubs, setSubHubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const superHubIds: string[] = admin?.superHubIds?.length > 0 ? admin.superHubIds : admin?.superHubId ? [admin.superHubId] : [];
  const subHubIds: string[] = admin?.subHubIds?.length > 0 ? admin.subHubIds : admin?.subHubId ? [admin.subHubId] : [];

  useEffect(() => {
    Promise.all([
      apiFetch("/api/super-hubs").then((d) => setSuperHubs((d.superHubs ?? []).filter((s: any) => superHubIds.includes(s.id)))).catch(() => {}),
      apiFetch("/api/sub-hubs").then((d) => setSubHubs((d.subHubs ?? []).filter((s: any) => subHubIds.includes(s.id)))).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const filtered = (tab === "super" ? superHubs : subHubs).filter((h) => {
    const q = search.toLowerCase();
    return !q || h.name?.toLowerCase().includes(q) || h.location?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
          <button onClick={() => setTab("super")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${tab === "super" ? "bg-white text-[#162B4D] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <Building2 className="w-3.5 h-3.5" /> Super Hubs
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{superHubs.length}</span>
          </button>
          <button onClick={() => setTab("sub")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${tab === "sub" ? "bg-white text-[#162B4D] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <Store className="w-3.5 h-3.5" /> Sub Hubs
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600">{subHubs.length}</span>
          </button>
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search hubs..." className="pl-8 h-9 text-sm" />
          {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300"><X className="w-3.5 h-3.5" /></button>}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-16 text-center">
          <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No {tab === "super" ? "super" : "sub"} hubs assigned</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((hub) => (
            <div key={hub.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${tab === "super" ? "border-blue-100" : "border-teal-100"}`}>
              <div className={`h-14 flex items-center px-4 gap-3 ${tab === "super" ? "bg-gradient-to-r from-blue-500 to-blue-700" : "bg-gradient-to-r from-teal-500 to-teal-700"}`}>
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  {tab === "super" ? <Building2 className="w-3.5 h-3.5 text-white" /> : <Store className="w-3.5 h-3.5 text-white" />}
                </div>
                <p className="text-white font-bold text-sm truncate flex-1">{hub.name}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hub.status === "Active" ? "bg-green-400/90 text-white" : "bg-red-400/90 text-white"}`}>{hub.status}</span>
              </div>
              <div className="p-3 space-y-1">
                {hub.location && <p className="text-xs text-gray-500 flex items-center gap-1.5"><MapPin className="w-3 h-3 text-gray-400" />{hub.location}</p>}
                {hub.superHubName && <p className="text-xs text-gray-400">Under: {hub.superHubName}</p>}
                {hub.pincodes?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(hub.pincodes as string[]).slice(0, 4).map((p: string) => (
                      <span key={p} className="bg-purple-50 text-purple-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{p}</span>
                    ))}
                    {hub.pincodes.length > 4 && <span className="text-[10px] text-gray-400">+{hub.pincodes.length - 4}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function MyDeliveries() {
  const [activeTab, setActiveTab] = useState<"orders" | "hubs">("orders");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-[#162B4D]">My Deliveries</h2>
        <p className="text-gray-500 text-sm mt-1">Manage your assigned orders and hub coverage.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white rounded-t-xl">
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === "orders" ? "border-[#1A56DB] text-[#1A56DB] bg-blue-50/40" : "border-transparent text-gray-400 hover:text-gray-600"}`}
        >
          <Truck className="w-4 h-4" /> My Orders
        </button>
        <button
          onClick={() => setActiveTab("hubs")}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === "hubs" ? "border-[#1A56DB] text-[#1A56DB] bg-blue-50/40" : "border-transparent text-gray-400 hover:text-gray-600"}`}
        >
          <Building2 className="w-4 h-4" /> My Hubs
        </button>
      </div>

      {activeTab === "orders" ? <MyOrdersTab /> : <MyHubsTab />}
    </div>
  );
}
