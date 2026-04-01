import { useQuery } from "@tanstack/react-query";
import { Truck, MapPin, Building2, Store, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function getAdminData() {
  try {
    const raw = localStorage.getItem("fishtokri_admin");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getToken() {
  return localStorage.getItem("fishtokri_token") || "";
}

function useAllSubHubs() {
  return useQuery({
    queryKey: ["all-sub-hubs"],
    queryFn: async () => {
      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
      const res = await fetch(`${base}/api/sub-hubs`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch sub hubs");
      return res.json() as Promise<{ subHubs: any[]; total: number }>;
    },
  });
}

function useAllSuperHubs() {
  return useQuery({
    queryKey: ["all-super-hubs"],
    queryFn: async () => {
      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
      const res = await fetch(`${base}/api/super-hubs`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch super hubs");
      return res.json() as Promise<{ superHubs: any[]; total: number }>;
    },
  });
}

export default function DeliveryDashboard() {
  const admin = getAdminData();

  const superHubIds: string[] = admin?.superHubIds?.length > 0
    ? admin.superHubIds
    : admin?.superHubId ? [admin.superHubId] : [];

  const subHubIds: string[] = admin?.subHubIds?.length > 0
    ? admin.subHubIds
    : admin?.subHubId ? [admin.subHubId] : [];

  const { data: superHubsData, isLoading: loadingSuperHubs } = useAllSuperHubs();
  const { data: subHubsData, isLoading: loadingSubHubs } = useAllSubHubs();

  const mySuperHubs = (superHubsData?.superHubs || []).filter((s) => superHubIds.includes(s.id));
  const mySubHubs = (subHubsData?.subHubs || []).filter((s) => subHubIds.includes(s.id));

  const isLoading = loadingSuperHubs || loadingSubHubs;

  const statCards = [
    {
      title: "Assigned Super Hubs",
      value: mySuperHubs.length,
      sub: `${mySuperHubs.filter((s) => s.status === "Active").length} active`,
      icon: Building2,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      title: "Assigned Sub Hubs",
      value: mySubHubs.length,
      sub: `${mySubHubs.filter((s) => s.status === "Active").length} active`,
      icon: Store,
      iconColor: "text-teal-600",
      iconBg: "bg-teal-50",
      border: "border-teal-100",
    },
    {
      title: "Total Service Areas",
      value: mySubHubs.reduce((acc, s) => acc + (s.pincodes?.length || 0), 0),
      sub: "pincodes covered",
      icon: MapPin,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-50",
      border: "border-purple-100",
    },
    {
      title: "Active Locations",
      value: mySuperHubs.filter((s) => s.status === "Active").length + mySubHubs.filter((s) => s.status === "Active").length,
      sub: "hubs operational",
      icon: CheckCircle2,
      iconColor: "text-green-600",
      iconBg: "bg-green-50",
      border: "border-green-100",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
            <Truck className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#162B4D]">Delivery Dashboard</h2>
            <p className="text-gray-500 text-sm mt-0.5">Welcome back, {admin?.name || "Delivery Person"}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ title, value, sub, icon: Icon, iconColor, iconBg, border }) => (
            <div key={title} className={`bg-white p-5 rounded-xl border ${border} shadow-sm`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#162B4D]">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{title}</p>
              <p className="text-[11px] text-gray-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-[#162B4D]">My Super Hubs</h3>
            <span className="ml-auto text-xs text-gray-400">{mySuperHubs.length} assigned</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-32 rounded-lg" />
          ) : mySuperHubs.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No super hubs assigned.</p>
          ) : (
            <div className="space-y-2">
              {mySuperHubs.map((hub) => (
                <div key={hub.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-blue-50/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#162B4D] truncate">{hub.name}</p>
                    {hub.location && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{hub.location}</p>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hub.status === "Active" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                    {hub.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-4 h-4 text-teal-500" />
            <h3 className="text-sm font-bold text-[#162B4D]">My Sub Hubs</h3>
            <span className="ml-auto text-xs text-gray-400">{mySubHubs.length} assigned</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-32 rounded-lg" />
          ) : mySubHubs.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No sub hubs assigned.</p>
          ) : (
            <div className="space-y-2">
              {mySubHubs.map((hub) => (
                <div key={hub.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-teal-50/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <Store className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#162B4D] truncate">{hub.name}</p>
                    {hub.superHubName && <p className="text-xs text-gray-400 mt-0.5">Under: {hub.superHubName}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="bg-purple-50 text-purple-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      {hub.pincodes?.length || 0} pin
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hub.status === "Active" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                      {hub.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
