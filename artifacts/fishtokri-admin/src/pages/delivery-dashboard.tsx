import { useState, useEffect, useCallback } from "react";
import { Truck, MapPin, Building2, Store, CheckCircle2, Clock, Package, XCircle, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function getAdminData() {
  try {
    const raw = localStorage.getItem("fishtokri_admin");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function getToken() { return localStorage.getItem("fishtokri_token") || ""; }
function getBase() { return import.meta.env.BASE_URL?.replace(/\/$/, "") || ""; }

async function apiFetch(path: string) {
  const res = await fetch(`${getBase()}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:          { label: "Pending",          color: "text-amber-600",   bg: "bg-amber-50 border-amber-100",   icon: Clock },
  confirmed:        { label: "Confirmed",        color: "text-blue-600",    bg: "bg-blue-50 border-blue-100",     icon: CheckCircle2 },
  preparing:        { label: "Preparing",        color: "text-purple-600",  bg: "bg-purple-50 border-purple-100", icon: Package },
  out_for_delivery: { label: "Out for Delivery", color: "text-indigo-600",  bg: "bg-indigo-50 border-indigo-100", icon: Truck },
  delivered:        { label: "Delivered",        color: "text-green-600",   bg: "bg-green-50 border-green-100",   icon: CheckCircle2 },
  cancelled:        { label: "Cancelled",        color: "text-red-600",     bg: "bg-red-50 border-red-100",       icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "text-gray-600", bg: "bg-gray-50 border-gray-100", icon: Clock };
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

export default function DeliveryDashboard() {
  const admin = getAdminData();

  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [superHubs, setSuperHubs] = useState<any[]>([]);
  const [subHubs, setSubHubs] = useState<any[]>([]);
  const [loadingHubs, setLoadingHubs] = useState(true);

  const superHubIds: string[] = admin?.superHubIds?.length > 0 ? admin.superHubIds : admin?.superHubId ? [admin.superHubId] : [];
  const subHubIds: string[] = admin?.subHubIds?.length > 0 ? admin.subHubIds : admin?.subHubId ? [admin.subHubId] : [];

  const loadOrders = useCallback(async () => {
    if (!admin?.id) return;
    setLoadingOrders(true);
    try {
      const data = await apiFetch(`/api/orders?assignedTo=${admin.id}&limit=50`);
      setOrders(data.orders ?? []);
    } catch { } finally { setLoadingOrders(false); }
  }, [admin?.id]);

  useEffect(() => {
    loadOrders();
    Promise.all([
      apiFetch("/api/super-hubs").then((d) => setSuperHubs((d.superHubs ?? []).filter((s: any) => superHubIds.includes(s.id)))).catch(() => {}),
      apiFetch("/api/sub-hubs").then((d) => setSubHubs((d.subHubs ?? []).filter((s: any) => subHubIds.includes(s.id)))).catch(() => {}),
    ]).finally(() => setLoadingHubs(false));
  }, [loadOrders]);

  const activeOrders = orders.filter((o) => ["pending", "confirmed", "preparing", "out_for_delivery"].includes(o.status));
  const completedOrders = orders.filter((o) => o.status === "delivered");
  const cancelledOrders = orders.filter((o) => o.status === "cancelled");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
            <Truck className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#162B4D]">Delivery Dashboard</h2>
            <p className="text-gray-500 text-sm mt-0.5">Welcome back, {admin?.name || "Delivery Person"}</p>
          </div>
        </div>
        <button onClick={loadOrders} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1A56DB] border border-gray-200 rounded-lg px-3 py-1.5 hover:border-[#1A56DB] transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Orders", value: activeOrders.length, sub: "assigned to you", icon: Truck, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
          { label: "Delivered", value: completedOrders.length, sub: "completed", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
          { label: "Super Hubs", value: superHubs.length, sub: "assigned", icon: Building2, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
          { label: "Sub Hubs", value: subHubs.length, sub: "assigned", icon: Store, color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-100" },
        ].map(({ label, value, sub, icon: Icon, color, bg, border }) => (
          <div key={label} className={`bg-white p-5 rounded-xl border ${border} shadow-sm`}>
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className={`text-2xl font-bold ${color}`}>{loadingOrders || loadingHubs ? "—" : value}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Assigned Orders List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-[#162B4D]">My Assigned Orders</h3>
          </div>
          <span className="text-xs text-gray-400">{orders.length} total</span>
        </div>

        {loadingOrders ? (
          <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : activeOrders.length === 0 ? (
          <div className="py-16 text-center">
            <Truck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No active orders assigned to you</p>
            <p className="text-xs text-gray-300 mt-1">Orders will appear here once admin assigns them</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {activeOrders.map((o) => {
              const cfg = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              return (
                <div key={String(o._id)} className="px-5 py-4 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5 border ${cfg.bg}`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#162B4D] text-sm">{o.customerName}</p>
                        <p className="text-xs text-gray-400">{o.phone}</p>
                        {o.address && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{o.address}</p>}
                        {o.deliveryArea && <p className="text-[10px] text-gray-400">{o.deliveryArea}</p>}
                        <p className="text-xs text-gray-500 mt-1">{(o.items ?? []).map((i: any) => i.name).join(", ")}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <StatusBadge status={o.status} />
                      <p className="text-[10px] text-gray-400">{formatDate(o.createdAt)}</p>
                      {o.timeslotLabel && <p className="text-[10px] text-indigo-500 font-medium">{o.timeslotLabel}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hub Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-[#162B4D]">My Super Hubs</h3>
            <span className="ml-auto text-xs text-gray-400">{superHubs.length} assigned</span>
          </div>
          {loadingHubs ? <Skeleton className="h-20 rounded-lg" /> : superHubs.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No super hubs assigned.</p>
          ) : (
            <div className="space-y-2">
              {superHubs.map((hub) => (
                <div key={hub.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#162B4D] truncate">{hub.name}</p>
                    {hub.location && <p className="text-xs text-gray-400">{hub.location}</p>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hub.status === "Active" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>{hub.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-4 h-4 text-teal-500" />
            <h3 className="text-sm font-bold text-[#162B4D]">My Sub Hubs</h3>
            <span className="ml-auto text-xs text-gray-400">{subHubs.length} assigned</span>
          </div>
          {loadingHubs ? <Skeleton className="h-20 rounded-lg" /> : subHubs.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No sub hubs assigned.</p>
          ) : (
            <div className="space-y-2">
              {subHubs.map((hub) => (
                <div key={hub.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <Store className="w-4 h-4 text-teal-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#162B4D] truncate">{hub.name}</p>
                    {hub.superHubName && <p className="text-xs text-gray-400">Under: {hub.superHubName}</p>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hub.status === "Active" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>{hub.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
