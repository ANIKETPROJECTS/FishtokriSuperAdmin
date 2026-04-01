import { useQuery } from "@tanstack/react-query";
import { Truck, MapPin, Building2, Store, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

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

export default function MyDeliveries() {
  const admin = getAdminData();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"super" | "sub">("super");

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

  const filteredSuperHubs = mySuperHubs.filter((h) => {
    const q = search.toLowerCase();
    return !q || h.name?.toLowerCase().includes(q) || h.location?.toLowerCase().includes(q);
  });

  const filteredSubHubs = mySubHubs.filter((h) => {
    const q = search.toLowerCase();
    return !q || h.name?.toLowerCase().includes(q) || h.location?.toLowerCase().includes(q) || h.superHubName?.toLowerCase().includes(q) || (h.pincodes || []).some((p: string) => p.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#162B4D]">My Hubs</h2>
          <p className="text-gray-500 text-sm mt-1">All hubs assigned to your delivery account.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-64 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search hubs, pincodes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm outline-none flex-1 text-gray-700 placeholder-gray-400 bg-transparent"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("super")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === "super" ? "bg-blue-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
        >
          <Building2 className="w-4 h-4" />
          Super Hubs
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === "super" ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"}`}>
            {mySuperHubs.length}
          </span>
        </button>
        <button
          onClick={() => setTab("sub")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === "sub" ? "bg-teal-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
        >
          <Store className="w-4 h-4" />
          Sub Hubs
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === "sub" ? "bg-white/20 text-white" : "bg-teal-50 text-teal-600"}`}>
            {mySubHubs.length}
          </span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : tab === "super" ? (
        filteredSuperHubs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">{search ? "No super hubs match your search." : "No super hubs assigned to your account."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSuperHubs.map((hub) => (
              <div key={hub.id} className="bg-white rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="h-16 bg-gradient-to-br from-blue-500 to-blue-700 flex items-end p-4 relative">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-white font-bold text-sm">{hub.name}</p>
                  </div>
                  <span className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${hub.status === "Active" ? "bg-green-400/90 text-white" : "bg-red-400/90 text-white"}`}>
                    {hub.status}
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  {hub.location && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" /> {hub.location}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    {hub.subHubCount || 0} sub hub{(hub.subHubCount || 0) !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        filteredSubHubs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
            <Truck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">{search ? "No sub hubs match your search." : "No sub hubs assigned to your account."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSubHubs.map((hub) => (
              <div key={hub.id} className="bg-white rounded-xl border border-teal-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="h-16 bg-gradient-to-br from-teal-500 to-teal-700 flex items-end p-4 relative">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                      <Store className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm leading-tight">{hub.name}</p>
                      {hub.superHubName && <p className="text-white/70 text-[10px]">{hub.superHubName}</p>}
                    </div>
                  </div>
                  <span className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${hub.status === "Active" ? "bg-green-400/90 text-white" : "bg-red-400/90 text-white"}`}>
                    {hub.status}
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  {hub.location && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" /> {hub.location}
                    </p>
                  )}
                  {hub.pincodes?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(hub.pincodes as string[]).slice(0, 5).map((p) => (
                        <span key={p} className="bg-purple-50 text-purple-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{p}</span>
                      ))}
                      {hub.pincodes.length > 5 && <span className="text-[10px] text-gray-400">+{hub.pincodes.length - 5}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
