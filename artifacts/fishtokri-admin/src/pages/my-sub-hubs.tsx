import { useQuery } from "@tanstack/react-query";
import { MapPin, Store, Layers, ExternalLink, Search } from "lucide-react";
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

export default function MySubHubs() {
  const admin = getAdminData();
  const [search, setSearch] = useState("");

  const subHubIds: string[] = admin?.subHubIds?.length > 0
    ? admin.subHubIds
    : admin?.subHubId ? [admin.subHubId] : [];

  const { data: allSubHubsData, isLoading } = useAllSubHubs();

  const mySubHubs = (allSubHubsData?.subHubs || []).filter((s) =>
    subHubIds.includes(s.id)
  );

  const filtered = mySubHubs.filter((s) => {
    const q = search.toLowerCase();
    return (
      !q ||
      s.name?.toLowerCase().includes(q) ||
      s.location?.toLowerCase().includes(q) ||
      s.superHubName?.toLowerCase().includes(q) ||
      (s.pincodes || []).some((p: string) => p.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#162B4D]">My Sub Hubs</h2>
          <p className="text-gray-500 text-sm mt-1">
            All sub hub locations assigned to your account.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-64 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search sub hubs, pincodes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm outline-none flex-1 text-gray-700 placeholder-gray-400 bg-transparent"
          />
        </div>
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
          <Store className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {search ? "No sub hubs match your search." : "No sub hubs assigned to your account yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((sub) => (
            <SubHubCard key={sub.id} sub={sub} />
          ))}
        </div>
      )}

      {/* Table view */}
      {!isLoading && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-[#162B4D]">Sub Hub Details</h3>
            <span className="ml-auto text-xs text-gray-400">{filtered.length} location{filtered.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 pr-4">Sub Hub</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 pr-4">Super Hub</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 pr-4">Location</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 pr-4">Pincodes</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        {sub.imageUrl ? (
                          <img src={sub.imageUrl} alt={sub.name} className="w-7 h-7 rounded-md object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-md bg-teal-50 flex items-center justify-center flex-shrink-0">
                            <Store className="w-3.5 h-3.5 text-teal-600" />
                          </div>
                        )}
                        <span className="font-semibold text-[#162B4D]">{sub.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-gray-500">{sub.superHubName || "—"}</td>
                    <td className="py-3 pr-4 text-xs text-gray-500">
                      {sub.location ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {sub.location}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      {sub.pincodes?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(sub.pincodes as string[]).slice(0, 4).map((p) => (
                            <span key={p} className="bg-purple-50 text-purple-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{p}</span>
                          ))}
                          {sub.pincodes.length > 4 && (
                            <span className="text-[10px] text-gray-400">+{sub.pincodes.length - 4} more</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No pincodes</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${sub.status === "Active" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sub.status === "Active" ? "bg-green-500" : "bg-red-400"}`} />
                        {sub.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SubHubCard({ sub }: { sub: any }) {
  const pincodes: string[] = sub.pincodes || [];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Card Header */}
      <div className="relative h-20 bg-gradient-to-br from-teal-500 to-teal-700 flex items-end p-4">
        {sub.imageUrl ? (
          <img
            src={sub.imageUrl}
            alt={sub.name}
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        ) : null}
        <div className="relative flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
            <Store className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">{sub.name}</p>
            {sub.superHubName && (
              <p className="text-white/70 text-[10px] mt-0.5">{sub.superHubName}</p>
            )}
          </div>
        </div>
        <span className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${sub.status === "Active" ? "bg-green-400/90 text-white" : "bg-red-400/90 text-white"}`}>
          {sub.status}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3">
        {sub.location && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span>{sub.location}</span>
          </div>
        )}

        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            Service Pincodes
          </p>
          {pincodes.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {pincodes.slice(0, 6).map((p) => (
                <span key={p} className="bg-purple-50 text-purple-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  {p}
                </span>
              ))}
              {pincodes.length > 6 && (
                <span className="text-[10px] text-gray-400 px-1 py-0.5">
                  +{pincodes.length - 6} more
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No pincodes assigned</p>
          )}
        </div>

        <div className="pt-1 flex items-center justify-between border-t border-gray-50">
          <span className="text-[11px] text-gray-400">
            {pincodes.length} pincode{pincodes.length !== 1 ? "s" : ""}
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-gray-300" />
        </div>
      </div>
    </div>
  );
}
