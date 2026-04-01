import { useGetSuperHubs, getGetSuperHubsQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { MapPin, ChevronRight, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function getAdminData() {
  try {
    const raw = localStorage.getItem("fishtokri_admin");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function MyHubs() {
  const admin = getAdminData();
  const [, setLocation] = useLocation();
  const superHubIds: string[] = admin?.superHubIds?.length > 0
    ? admin.superHubIds
    : admin?.superHubId ? [admin.superHubId] : [];

  const { data: superHubsData, isLoading } = useGetSuperHubs(undefined, {
    query: { queryKey: getGetSuperHubsQueryKey() },
  });

  const myHubs = (superHubsData?.superHubs || []).filter((h) =>
    superHubIds.includes(h.id)
  );

  if (superHubIds.length === 1 && myHubs.length === 1) {
    setLocation(`/my-hub/${myHubs[0].id}`);
    return null;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-[#162B4D]">My Super Hubs</h2>
        <p className="text-gray-500 text-sm mt-1">Select a hub to manage its sub hubs and service areas.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : myHubs.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 py-20 text-center">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No super hubs assigned</p>
          <p className="text-gray-400 text-sm mt-1">Contact your administrator to get access.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {myHubs.map((hub) => (
            <button
              key={hub.id}
              onClick={() => setLocation(`/my-hub/${hub.id}`)}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-left hover:shadow-md hover:border-blue-100 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {(hub as any).imageUrl ? (
                    <img
                      src={(hub as any).imageUrl}
                      alt={hub.name}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-[#1A56DB]" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[#162B4D]">{hub.name}</h3>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${hub.status === "Active" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                        {hub.status}
                      </span>
                    </div>
                    {(hub as any).location && (
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {(hub as any).location}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1A56DB] transition-colors mt-1 flex-shrink-0" />
              </div>
              <p className="text-xs text-gray-400 mt-3">Click to manage sub hubs</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
