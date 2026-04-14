import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Search, X, RefreshCw, ClipboardList, Clock, CheckCircle2, XCircle,
  Truck, Package, ChevronLeft, ChevronRight, Eye, MapPin,
  Phone, User, SlidersHorizontal, ArrowUpDown, UserCheck,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

function getToken() {
  return localStorage.getItem("fishtokri_token") || "";
}
function getBase() {
  return import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${getBase()}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? "Request failed");
  }
  return res.json();
}

// ─── STATUS CONFIG ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:   { label: "Pending",   color: "text-amber-600",   bg: "bg-amber-50 border-amber-200",   icon: Clock },
  confirmed: { label: "Confirmed", color: "text-blue-600",    bg: "bg-blue-50 border-blue-200",     icon: CheckCircle2 },
  preparing: { label: "Preparing", color: "text-purple-600",  bg: "bg-purple-50 border-purple-200", icon: Package },
  out_for_delivery: { label: "Out for Delivery", color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200", icon: Truck },
  delivered: { label: "Delivered", color: "text-green-600",   bg: "bg-green-50 border-green-200",   icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "text-red-600",     bg: "bg-red-50 border-red-200",       icon: XCircle },
};

const ACTIVE_STATUSES = ["pending", "confirmed", "preparing", "out_for_delivery"];
const HISTORY_STATUSES = ["delivered", "cancelled"];
const ALL_STATUSES = Object.keys(STATUS_CONFIG);

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "text-gray-600", bg: "bg-gray-50 border-gray-200", icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function formatDate(d: any) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatRupees(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function orderTotal(items: any[]) {
  return (items ?? []).reduce((s: number, i: any) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function Orders() {
  const { toast } = useToast();

  // Tabs: "current" | "history" | "all"
  const [activeTab, setActiveTab] = useState<"current" | "history" | "all">("current");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  // Data
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<Record<string, number>>({});

  // Detail modal
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [editStatus, setEditStatus] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  // Delivery assignment
  const [deliveryPersons, setDeliveryPersons] = useState<any[]>([]);
  const [assigningDelivery, setAssigningDelivery] = useState(false);
  const [selectedDeliveryPersonId, setSelectedDeliveryPersonId] = useState("");
  const [inlineAssigningId, setInlineAssigningId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/users?role=delivery_person&limit=100")
      .then((d) => setDeliveryPersons(d.users ?? []))
      .catch(() => {});
  }, []);

  // Build effective status filter based on active tab
  const effectiveStatus = useMemo(() => {
    if (statusFilter) return statusFilter;
    if (activeTab === "current") return ACTIVE_STATUSES.join(",");
    if (activeTab === "history") return HISTORY_STATUSES.join(",");
    return "";
  }, [activeTab, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: search,
        sort: sortField,
        order: sortDir,
        page: String(page),
        limit: String(LIMIT),
      });
      if (statusFilter) {
        params.set("status", statusFilter);
      } else if (activeTab === "current") {
        params.set("status", ACTIVE_STATUSES.join(","));
      } else if (activeTab === "history") {
        params.set("status", HISTORY_STATUSES.join(","));
      }
      if (deliveryTypeFilter) params.set("deliveryType", deliveryTypeFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const data = await apiFetch(`/api/orders?${params}`);
      setOrders(data.orders ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } catch (err: any) {
      toast({ title: "Error loading orders", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [search, sortField, sortDir, page, activeTab, statusFilter, deliveryTypeFilter, dateFrom, dateTo, toast]);

  const loadStats = useCallback(async () => {
    try {
      const data = await apiFetch("/api/orders/stats");
      setStatsData(data.stats ?? {});
    } catch { }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(1); }, [activeTab, search, statusFilter, deliveryTypeFilter, dateFrom, dateTo, sortField, sortDir]);
  useEffect(() => { load(); }, [load]);

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !editStatus) return;
    setSavingStatus(true);
    try {
      await apiFetch(`/api/orders/${selectedOrder._id}`, { method: "PUT", body: JSON.stringify({ status: editStatus }) });
      toast({ title: "Order status updated" });
      setSelectedOrder((o: any) => ({ ...o, status: editStatus }));
      load();
      loadStats();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSavingStatus(false); }
  };

  const inlineAssign = async (orderId: string, personId: string) => {
    setInlineAssigningId(orderId);
    try {
      const person = deliveryPersons.find((p) => p.id === personId);
      const payload = personId
        ? { assignedDeliveryPersonId: personId, assignedDeliveryPersonName: person?.name ?? "" }
        : { assignedDeliveryPersonId: "", assignedDeliveryPersonName: "" };
      await apiFetch(`/api/orders/${orderId}`, { method: "PUT", body: JSON.stringify(payload) });
      toast({ title: personId ? `Assigned to ${person?.name}` : "Assignment removed" });
      setOrders((prev) => prev.map((o) => String(o._id) === orderId ? { ...o, ...payload } : o));
      if (selectedOrder && String(selectedOrder._id) === orderId) setSelectedOrder((o: any) => ({ ...o, ...payload }));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setInlineAssigningId(null); }
  };

  const handleAssignDelivery = async (overrideId?: string) => {
    if (!selectedOrder) return;
    setAssigningDelivery(true);
    const resolvedId = overrideId !== undefined ? overrideId : (selectedDeliveryPersonId === "__none__" ? "" : selectedDeliveryPersonId);
    try {
      const person = deliveryPersons.find((p) => p.id === resolvedId);
      const payload = resolvedId
        ? { assignedDeliveryPersonId: resolvedId, assignedDeliveryPersonName: person?.name ?? "" }
        : { assignedDeliveryPersonId: "", assignedDeliveryPersonName: "" };
      await apiFetch(`/api/orders/${selectedOrder._id}`, { method: "PUT", body: JSON.stringify(payload) });
      toast({ title: resolvedId ? `Assigned to ${person?.name}` : "Assignment removed" });
      setSelectedOrder((o: any) => ({ ...o, ...payload }));
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setAssigningDelivery(false); }
  };

  const clearFilters = () => {
    setSearch(""); setStatusFilter(""); setDeliveryTypeFilter("");
    setDateFrom(""); setDateTo(""); setSortField("createdAt"); setSortDir("desc");
  };

  const hasFilters = !!(search || statusFilter || deliveryTypeFilter || dateFrom || dateTo);

  // Stat totals
  const totalAll = Object.values(statsData).reduce((a, b) => a + b, 0);
  const totalActive = ACTIVE_STATUSES.reduce((s, k) => s + (statsData[k] ?? 0), 0);
  const totalHistory = HISTORY_STATUSES.reduce((s, k) => s + (statsData[k] ?? 0), 0);

  const TABS = [
    { key: "current" as const, label: "Current Orders", count: totalActive, icon: Clock, color: "text-blue-600" },
    { key: "history" as const, label: "History", count: totalHistory, icon: CheckCircle2, color: "text-green-600" },
    { key: "all" as const, label: "All Orders", count: totalAll, icon: ClipboardList, color: "text-gray-600" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#162B4D]">Orders</h1>
          <p className="text-gray-400 text-sm mt-0.5">Track and manage all customer orders</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { load(); loadStats(); }} className="h-8 gap-1.5 text-gray-500">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {ALL_STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          return (
            <button
              key={s}
              onClick={() => { setStatusFilter(s === statusFilter ? "" : s); setActiveTab("all"); }}
              className={`rounded-xl border p-3 text-left transition-all hover:shadow-sm ${statusFilter === s ? `${cfg.bg} shadow-sm` : "bg-white border-gray-100 hover:border-gray-200"}`}
            >
              <Icon className={`w-4 h-4 mb-1.5 ${cfg.color}`} />
              <p className={`text-lg font-bold leading-none ${cfg.color}`}>{statsData[s] ?? 0}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {TABS.map(({ key, label, count, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setStatusFilter(""); }}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === key
                  ? "border-[#1A56DB] text-[#1A56DB] bg-blue-50/40"
                  : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className={`w-4 h-4 ${activeTab === key ? "text-[#1A56DB]" : color}`} />
              {label}
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab === key ? "bg-[#1A56DB] text-white" : "bg-gray-100 text-gray-500"}`}>{count}</span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-50 flex flex-wrap gap-2.5 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, area..."
              className="pl-8 h-9 text-sm"
            />
            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><X className="w-3.5 h-3.5" /></button>}
          </div>

          {/* Sort */}
          <Select value={`${sortField}:${sortDir}`} onValueChange={(v) => { const [f, d] = v.split(":"); setSortField(f); setSortDir(d as any); }}>
            <SelectTrigger className="h-9 w-44 text-sm gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt:desc">Newest First</SelectItem>
              <SelectItem value="createdAt:asc">Oldest First</SelectItem>
              <SelectItem value="customerName:asc">Name A–Z</SelectItem>
              <SelectItem value="customerName:desc">Name Z–A</SelectItem>
              <SelectItem value="status:asc">Status A–Z</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`h-9 gap-1.5 ${showFilters ? "bg-blue-50 border-blue-200 text-[#1A56DB]" : "text-gray-500"}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters {hasFilters && <span className="bg-[#1A56DB] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{[statusFilter, deliveryTypeFilter, dateFrom, dateTo].filter(Boolean).length}</span>}
          </Button>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-gray-400 hover:text-red-500 gap-1">
              <X className="w-3.5 h-3.5" /> Clear
            </Button>
          )}
        </div>

        {/* Expandable Filter Row */}
        {showFilters && (
          <div className="px-4 pb-3 flex flex-wrap gap-3 bg-gray-50/60 border-b border-gray-100 pt-3">
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "_all" ? "" : v); setActiveTab("all"); }}>
                <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All statuses</SelectItem>
                  {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Delivery Type</Label>
              <Select value={deliveryTypeFilter} onValueChange={(v) => setDeliveryTypeFilter(v === "_all" ? "" : v)}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All types</SelectItem>
                  <SelectItem value="slot">Slot</SelectItem>
                  <SelectItem value="instant">Instant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-50">
          {loading ? "Loading..." : `${total} order${total !== 1 ? "s" : ""} found`}
          {statusFilter && <span className="ml-1">· filtered by <strong>{STATUS_CONFIG[statusFilter]?.label}</strong></span>}
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center">
            <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No orders found</p>
            {hasFilters && <button onClick={clearFilters} className="mt-2 text-sm text-[#1A56DB] hover:underline font-semibold">Clear filters</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Items</th>
                  <th className="px-4 py-3 text-left">Total</th>
                  <th className="px-4 py-3 text-left">Delivery</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Delivery Partner</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((o) => {
                  const total = orderTotal(o.items);
                  return (
                    <tr key={String(o._id)} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#162B4D]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <User className="w-3.5 h-3.5 text-[#162B4D]" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#162B4D] text-sm">{o.customerName}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{o.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[#162B4D] font-medium">{Array.isArray(o.items) ? o.items.length : 0} item{o.items?.length !== 1 ? "s" : ""}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[140px]">{(o.items ?? []).map((i: any) => i.name).join(", ")}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-[#162B4D]">{formatRupees(total)}</span>
                        {o.instantDeliveryCharge ? <p className="text-xs text-orange-500">+{formatRupees(o.instantDeliveryCharge)} delivery</p> : null}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-600 capitalize">{o.deliveryType ?? "—"}</p>
                        {o.timeslotLabel && <p className="text-xs text-gray-400 max-w-[140px] truncate">{o.timeslotLabel}</p>}
                        {o.deliveryArea && <p className="text-xs text-gray-400 flex items-center gap-0.5"><MapPin className="w-3 h-3" />{o.deliveryArea}</p>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(o.createdAt)}</td>
                      <td className="px-4 py-3">
                        {deliveryPersons.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            {inlineAssigningId === String(o._id) ? (
                              <span className="text-[11px] text-gray-400 animate-pulse">Saving...</span>
                            ) : (
                              <select
                                value={o.assignedDeliveryPersonId ?? ""}
                                onChange={(e) => inlineAssign(String(o._id), e.target.value)}
                                className={`text-xs rounded-lg border px-2 py-1 pr-6 h-7 bg-white outline-none cursor-pointer transition-colors appearance-none max-w-[140px] ${o.assignedDeliveryPersonId ? "border-orange-200 text-orange-700 bg-orange-50 font-medium" : "border-gray-200 text-gray-400"}`}
                                title="Assign delivery partner"
                              >
                                <option value="">— Unassigned —</option>
                                {deliveryPersons.map((p) => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        ) : (
                          o.assignedDeliveryPersonName
                            ? <span className="text-xs font-medium text-orange-700">{o.assignedDeliveryPersonName}</span>
                            : <span className="text-xs text-gray-300 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => { setSelectedOrder(o); setEditStatus(o.status); setSelectedDeliveryPersonId(o.assignedDeliveryPersonId ?? ""); }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1A56DB] hover:text-[#1447B4] bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/40">
            <p className="text-xs text-gray-400">Page {page} of {pages} · {total} total</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-7 w-7 p-0">
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              {Array.from({ length: Math.min(pages, 7) }).map((_, i) => {
                const pg = i + 1;
                return (
                  <Button
                    key={pg}
                    variant={pg === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pg)}
                    className={`h-7 w-7 p-0 text-xs ${pg === page ? "bg-[#1A56DB] border-[#1A56DB]" : ""}`}
                  >
                    {pg}
                  </Button>
                );
              })}
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="h-7 w-7 p-0">
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(o) => !o && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#162B4D] flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Order Details
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-1">
                {/* Customer Info */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Customer</p>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-[#162B4D]">{selectedOrder.customerName}</span>
                  </div>
                  {selectedOrder.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {selectedOrder.phone}
                    </div>
                  )}
                  {selectedOrder.address && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span>{selectedOrder.address}</span>
                    </div>
                  )}
                  {selectedOrder.deliveryArea && (
                    <div className="text-xs text-gray-400 ml-6">{selectedOrder.deliveryArea}</div>
                  )}
                </div>

                {/* Order Items */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Items ({(selectedOrder.items ?? []).length})</p>
                  <div className="space-y-2">
                    {(selectedOrder.items ?? []).map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <ShoppingBag className="w-3.5 h-3.5 text-[#1A56DB]" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#162B4D] text-sm">{item.name}</p>
                            <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-bold text-[#162B4D]">{formatRupees(Number(item.price) * Number(item.quantity || 1))}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-2 px-3 py-2 bg-[#162B4D]/5 rounded-xl">
                    <span className="text-sm font-semibold text-gray-600">Order Total</span>
                    <span className="font-bold text-[#162B4D] text-base">{formatRupees(orderTotal(selectedOrder.items))}</span>
                  </div>
                  {selectedOrder.instantDeliveryCharge && (
                    <div className="flex justify-between items-center px-3 py-1.5 text-orange-600 text-sm">
                      <span>Instant Delivery Charge</span>
                      <span className="font-semibold">+{formatRupees(selectedOrder.instantDeliveryCharge)}</span>
                    </div>
                  )}
                </div>

                {/* Delivery Info */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Delivery</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Type</p>
                      <p className="font-medium text-[#162B4D] capitalize">{selectedOrder.deliveryType ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Date</p>
                      <p className="font-medium text-[#162B4D]">{formatDate(selectedOrder.createdAt)}</p>
                    </div>
                    {selectedOrder.timeslotLabel && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-400">Time Slot</p>
                        <p className="font-medium text-[#162B4D]">{selectedOrder.timeslotLabel}</p>
                      </div>
                    )}
                    {selectedOrder.notes && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-400">Notes</p>
                        <p className="text-sm text-gray-600 italic">"{selectedOrder.notes}"</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assign Delivery Partner */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assign Delivery Partner</p>
                  {selectedOrder.assignedDeliveryPersonName && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-100 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Truck className="w-3.5 h-3.5 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-orange-700">{selectedOrder.assignedDeliveryPersonName}</p>
                        <p className="text-[10px] text-orange-500">Currently assigned</p>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Select value={selectedDeliveryPersonId} onValueChange={setSelectedDeliveryPersonId}>
                      <SelectTrigger className="h-9 flex-1 text-sm">
                        <UserCheck className="w-3.5 h-3.5 text-gray-400 mr-1 flex-shrink-0" />
                        <SelectValue placeholder="Select delivery person..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Remove assignment —</SelectItem>
                        {deliveryPersons.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex flex-col">
                              <span>{p.name}</span>
                              {p.phone && <span className="text-[10px] text-gray-400">{p.phone}</span>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => handleAssignDelivery()}
                      disabled={assigningDelivery || !selectedDeliveryPersonId}
                      className="bg-orange-500 hover:bg-orange-600 h-9 px-4 text-white"
                    >
                      {assigningDelivery ? "Saving..." : selectedDeliveryPersonId === "__none__" ? "Remove" : "Assign"}
                    </Button>
                  </div>
                  {deliveryPersons.length === 0 && (
                    <p className="text-[11px] text-gray-400 italic">No delivery persons found. Add them via Admin Users.</p>
                  )}
                </div>

                {/* Status Update */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Update Status</p>
                  <div className="flex gap-2">
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger className="h-9 flex-1 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALL_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            <span className="flex items-center gap-2">
                              {STATUS_CONFIG[s].label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleStatusUpdate}
                      disabled={savingStatus || editStatus === selectedOrder.status}
                      className="bg-[#1A56DB] hover:bg-[#1447B4] h-9 px-4"
                    >
                      {savingStatus ? "Saving..." : "Update"}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Current:</span>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedOrder(null)} className="h-9">Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
